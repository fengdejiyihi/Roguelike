import assert from "node:assert/strict";
import test from "node:test";
import {
	type CombatTransition,
	GameFacade,
	cardView,
} from "../../assets/scripts/app/game-facade";
import { CARDS } from "../../assets/scripts/domain/cards";
import { stateDigest } from "../../assets/scripts/domain/combat";
import { legalNext } from "../../assets/scripts/domain/map";
import type { Command, RunState } from "../../assets/scripts/domain/model";
import {
	buy,
	chooseEvent,
	claimReward,
	combatCommand,
	leaveShop,
	newRun,
	selectNode,
} from "../../assets/scripts/domain/run";
import { deserialize, serialize } from "../../assets/scripts/domain/save";
import { MemorySaveStorage } from "../../assets/scripts/domain/save";

const costs: Record<string, number> = {
	strike: 1,
	guard: 1,
	insight: 0,
	toxin: 1,
	doubleCut: 1,
	execute: 2,
};
const saved = (run: RunState): RunState =>
	deserialize(serialize(run, 7, 1)).payload;
function next(run: RunState, type?: string): RunState {
	let current = run;
	for (let step = 0; step < 20; step += 1) {
		if (current.phase === "combat") current = settle(win(current));
		else if (current.phase !== "map") current = settle(current);
		const nodes = legalNext(current.map!, current.currentNodeId!).map(
			(id) => current.map!.find((node) => node.id === id)!,
		);
		const node = nodes.find((item) => item.type === type) ?? nodes[0];
		assert.ok(node);
		const result = selectNode(current, node.id);
		assert.ok(result.accepted);
		if (!type || node.type === type) return result.run;
		current = result.run;
	}
	throw new Error("target-node-not-found");
}
function settle(run: RunState): RunState {
	if (run.phase === "event") return chooseEvent(run, "skip").run;
	if (run.phase === "shop") return leaveShop(run).run;
	if (run.phase === "reward") return claimReward(run).run;
	return run;
}
function win(run: RunState): RunState {
	let current = run;
	for (let step = 0; step < 80 && current.phase === "combat"; step += 1) {
		const card = current.combat.hand.find(
			(id) => costs[id.split("#")[0]] <= current.combat.energy,
		);
		const result = combatCommand(
			current,
			card
				? {
						type: "playCard",
						cardInstanceId: card,
						targetId: current.combat.enemy.id,
					}
				: { type: "endTurn" },
		);
		assert.ok(result.accepted);
		current = result.run;
	}
	assert.notEqual(current.phase, "combat");
	return current;
}

test("ten thousand deterministic maps are 9-rank reachable DAGs with valid content spacing", () => {
	const events = new Set<string>();
	for (let seed = 0; seed < 10_000; seed += 1) {
		const run = newRun(String(seed));
		const map = run.map!;
		assert.equal(map.length, 16);
		for (let rank = 0; rank <= 8; rank += 1)
			assert.equal(
				map.filter((node) => node.rank === rank).length,
				rank === 0 || rank === 8 ? 1 : 2,
			);
		const reachesBoss = (id: string): boolean =>
			id === "boss" || legalNext(map, id).some(reachesBoss);
		for (const node of map) {
			assert.ok(reachesBoss(node.id));
			for (const child of node.next) {
				const nextNode = map.find((item) => item.id === child)!;
				assert.equal(nextNode.rank, node.rank + 1);
				assert.equal(
					["shop", "event"].includes(node.type) &&
						["shop", "event"].includes(nextNode.type),
					false,
				);
			}
			if (node.id !== "start")
				assert.ok(map.some((parent) => parent.next.includes(node.id)));
		}
		assert.deepEqual(
			new Set(map.map((node) => node.type)),
			new Set(["start", "combat", "event", "shop", "elite", "boss"]),
		);
		assert.deepEqual(map, newRun(String(seed)).map);
		const eventNode = map.find(
			(node) => node.rank === 1 && node.type === "event",
		)!;
		events.add(selectNode(run, eventNode.id).run.event!.id);
	}
	assert.deepEqual(events, new Set(["shrine", "gamble"]));
});

test("save resume preserves pending reward and rejects duplicate claim without RNG drift", () => {
	let run = next(newRun("reward"), "combat");
	run = win(run);
	assert.equal(run.phase, "reward");
	const restored = saved(run);
	const left = claimReward(run, run.pendingReward!.cards[0]);
	const right = claimReward(restored, restored.pendingReward!.cards[0]);
	assert.equal(stateDigest(left.run), stateDigest(right.run));
	assert.deepEqual(left.run.rngStreams, right.run.rngStreams);
	const duplicate = claimReward(left.run);
	assert.equal(duplicate.accepted, false);
	assert.equal(stateDigest(duplicate.run), stateDigest(left.run));
});

test("combat rewards grant relics only for elite and boss victories", () => {
	const normal = win(next(newRun("normal-reward"), "combat"));
	assert.equal(normal.pendingReward!.relicId, undefined);

	const elite = win(next(newRun("elite-reward"), "elite"));
	const relicId = elite.pendingReward!.relicId;
	assert.ok(relicId);
	assert.deepEqual(saved(elite).pendingReward, elite.pendingReward);
	const storage = new MemorySaveStorage();
	storage.save(serialize(elite));
	assert.equal(new GameFacade(storage).resume()!.reward?.relicId, relicId);
	for (const invalid of [
		{
			...elite,
			pendingReward: { ...elite.pendingReward!, relicId: undefined },
		},
		{ ...elite, relics: [...elite.relics!, relicId] },
	]) {
		const digest = stateDigest(invalid);
		const result = claimReward(invalid);
		assert.equal(result.accepted, false);
		assert.equal(stateDigest(result.run), digest);
	}
	const skipped = claimReward(elite);
	assert.equal(skipped.accepted, true);
	assert.equal(skipped.run.deck!.length, elite.deck!.length);
	assert.ok(skipped.run.relics!.includes(relicId));
	assert.equal(
		skipped.run.gold,
		elite.gold! + 15 + (relicId === "coinPurse" ? 10 : 0),
	);
	assert.equal(claimReward(skipped.run).accepted, false);

	const selected = win(next(newRun("elite-selected"), "elite"));
	const selectedCard = selected.pendingReward!.cards[0];
	const selectedRelic = selected.pendingReward!.relicId!;
	const claimed = claimReward(selected, selectedCard);
	assert.ok(claimed.run.deck!.includes(selectedCard));
	assert.ok(claimed.run.relics!.includes(selectedRelic));

	const boss = win(
		next(settle(win(next(newRun("boss-reward"), "elite"))), "boss"),
	);
	assert.ok(boss.pendingReward!.relicId);
	assert.equal(claimReward(boss).run.phase, "won");
});

test("invalid reward and event values reject atomically instead of becoming skips", () => {
	let reward = next(newRun("invalid-reward"), "combat");
	reward = win(reward);
	const rewardDigest = stateDigest(reward);
	for (const cardId of ["", "not-a-reward"]) {
		const result = claimReward(reward, cardId);
		assert.equal(result.accepted, false);
		assert.equal(stateDigest(result.run), rewardDigest);
	}
	const forgedRelic = {
		...reward,
		pendingReward: { ...reward.pendingReward!, relicId: "coinPurse" as const },
	};
	const forgedDigest = stateDigest(forgedRelic);
	assert.equal(claimReward(forgedRelic).accepted, false);
	assert.equal(stateDigest(forgedRelic), forgedDigest);
	for (const pendingReward of [
		{
			...reward.pendingReward!,
			cards: reward.pendingReward!.cards.slice(0, 2),
		},
		{
			...reward.pendingReward!,
			cards: ["strike", "strike", "guard"],
		},
		{
			...reward.pendingReward!,
			cards: ["strike#forged", "guard", "insight"],
		},
		{ ...reward.pendingReward!, gold: 14 },
	]) {
		const forged = { ...reward, pendingReward };
		const digest = stateDigest(forged);
		const result = claimReward(forged);
		assert.equal(result.accepted, false);
		assert.equal(stateDigest(result.run), digest);
	}
	const event = next(newRun("invalid-event"), "event");
	const eventDigest = stateDigest(event);
	const result = chooseEvent(event, "bogus" as never);
	assert.equal(result.accepted, false);
	assert.equal(stateDigest(result.run), eventDigest);
});

test("two normal profiles plus elite and boss expose distinct deterministic intents", () => {
	let run = next(newRun("profiles"), "combat");
	assert.equal(run.combat.enemyName, "Scout");
	assert.equal(run.combat.enemyIntentDamage, 1);
	run = settle(win(run));
	run = settle(next(run, "shop"));
	const brute = next(run, "combat");
	assert.equal(brute.combat.enemyName, "Brute");
	assert.equal(brute.combat.enemyIntentDamage, 2);
	const elite = next(run, "elite");
	assert.equal(elite.combat.enemyName, "Elite");
	assert.equal(elite.combat.enemyIntentDamage, 3);
	const boss = next(settle(win(elite)), "boss");
	assert.equal(boss.combat.enemyName, "Boss");
	assert.equal(boss.combat.enemyIntentDamage, 4);
});

test("save resume preserves shop inventory and future purchase", () => {
	let run = next(newRun("shop"), "event");
	run = settle(run);
	run = next(run, "shop");
	assert.equal(run.phase, "shop");
	const restored = saved(run);
	assert.deepEqual(restored.shop!.inventory, run.shop!.inventory);
	const id = run.shop!.inventory[0].id;
	const left = buy(run, id);
	const right = buy(restored, id);
	assert.ok(left.accepted && right.accepted);
	assert.equal(stateDigest(left.run), stateDigest(right.run));
	assert.deepEqual(left.run.rngStreams, right.run.rngStreams);
	assert.equal(buy(left.run, id).accepted, false);
});

test("save resume at combat stable point has identical events, state digest, and RNG", () => {
	const run = next(newRun("combat"), "combat");
	const restored = saved(run);
	const command: Command = {
		type: "playCard",
		cardInstanceId: run.combat.hand[0],
		targetId: run.combat.enemy.id,
	};
	const left = combatCommand(run, command);
	const right = combatCommand(restored, command);
	assert.deepEqual(left.events, right.events);
	assert.equal(stateDigest(left.run), stateDigest(right.run));
	assert.deepEqual(left.run.rngStreams, right.run.rngStreams);
});

function facadeWinCombat(game: GameFacade): void {
	for (let step = 0; step < 80 && game.view().phase === "combat"; step += 1) {
		const combat = game.view().combat;
		assert.ok(combat);
		const card = combat.hand.find((item) => item.cost <= combat.energy);
		if (card) game.playCard(card.instanceId, combat.enemyId);
		else game.endTurn();
	}
	assert.notEqual(game.view().phase, "combat");
}
function facadeSettle(game: GameFacade): void {
	if (game.view().phase === "reward") game.skipReward();
	if (game.view().phase === "shop") game.leaveShop();
	if (game.view().phase === "event") game.chooseEvent("skip");
}
function facadeRoute(route: string[], winBoss: boolean): string | undefined {
	const game = new GameFacade(new MemorySaveStorage());
	game.newRun("representative");
	for (const node of route) {
		game.selectNode(node);
		assert.equal(game.view().currentNodeId, node);
		if (game.view().phase === "combat") {
			if (node === "boss" && !winBoss) {
				for (
					let step = 0;
					step < 20 && game.view().phase === "combat";
					step += 1
				)
					game.endTurn();
			} else facadeWinCombat(game);
		}
		facadeSettle(game);
	}
	return game.view().phase;
}

test("GameFacade drives every legal route through Boss to victory and can lose legally", () => {
	const map = newRun("representative").map!;
	const paths = (id: string): string[][] =>
		id === "boss"
			? [[id]]
			: legalNext(map, id).flatMap((child) =>
					paths(child).map((path) => [id, ...path]),
				);
	const routes = paths("start").map((path) => path.slice(1));
	assert.equal(routes.length, 128);
	for (const route of routes) assert.equal(facadeRoute(route, true), "won");
	assert.equal(facadeRoute(routes[0], false), "lost");
});

test("GameFacade exposes the valid enemy target for card play", () => {
	const game = new GameFacade(new MemorySaveStorage());
	game.newRun("facade-target");
	const combatNode = game
		.view()
		.map.find((node) => node.enabled && node.type === "combat");
	assert.ok(combatNode);
	game.selectNode(combatNode.id);
	const combat = game.view().combat;
	assert.ok(combat);
	assert.equal(combat.enemyId, `enemy:${combatNode.id}`);
	assert.equal(combat.enemyName, "Scout");
	assert.equal(combat.enemyIntentDamage, 1);
	const card = combat.hand.find((item) => item.cost <= combat.energy);
	assert.ok(card);
	game.playCard(card.instanceId, combat.enemyId);
	assert.equal(
		game
			.view()
			.combat?.hand.some((item) => item.instanceId === card.instanceId),
		false,
	);
	game.newRun("keyword-projection");
	const keywordNode = game
		.view()
		.map.find((node) => node.enabled && node.type === "combat");
	assert.ok(keywordNode);
	game.selectNode(keywordNode.id);
	const keywordCombat = game.view().combat;
	assert.ok(keywordCombat);
	for (const projected of keywordCombat.hand) {
		assert.ok(Array.isArray(projected.keywords));
		assert.ok(
			projected.keywords.every(
				(keyword) => typeof keyword === "string" && keyword !== "[object Set]",
			),
		);
	}
});

test("GameFacade projects map topology and keeps next arrays defensive", () => {
	const game = new GameFacade(new MemorySaveStorage());
	const initial = game.newRun("map-projection");
	assert.equal(initial.map.length, 16);
	const start = initial.map.find((node) => node.id === "start");
	assert.ok(start);
	assert.deepEqual(start.next, ["r1a", "r1b"]);
	assert.equal(start.rank, 0);
	assert.equal(start.visited, true);
	assert.equal(start.enabled, false);
	assert.equal(initial.playerHp, 40);
	assert.equal(initial.playerMaxHp, 40);
	for (const node of initial.map) {
		assert.equal(node.next.includes(node.id), false);
		assert.equal(node.enabled, start.next.includes(node.id));
	}
	start.next.push("mutated-view-value");
	const fresh = game.view();
	assert.deepEqual(fresh.map.find((node) => node.id === "start")?.next, [
		"r1a",
		"r1b",
	]);
	const selected = fresh.map.find((node) => node.enabled);
	assert.ok(selected);
	game.selectNode(selected.id);
	const traversed = game.view();
	assert.equal(traversed.currentNodeId, selected.id);
	assert.equal(
		traversed.map.find((node) => node.id === selected.id)?.visited,
		true,
	);
	assert.equal(
		traversed.map.filter((node) => node.enabled).length,
		selected.next.length,
	);
});

test("GameFacade combat transitions keep a battle projection before the next phase", () => {
	const game = new GameFacade(new MemorySaveStorage());
	const initial = game.newRun("transition");
	const node = initial.map.find(
		(item) => item.enabled && item.type === "combat",
	);
	assert.ok(node);
	game.selectNode(node.id);
	const combat = game.view().combat;
	assert.ok(combat);
	const card = combat.hand.find((item) => item.playable);
	assert.ok(card);
	const transition = game.playCardTransition(card.instanceId, combat.enemyId);
	assert.equal(transition.accepted, true);
	assert.equal(transition.view.phase, "combat");
	assert.equal(transition.view.combat?.enemyHp, game.view().combat?.enemyHp);
	assert.equal(transition.after.phase, "combat");
	assert.ok(transition.events.some((event) => event.type === "CardPlayed"));
});

test("GameFacade terminal transitions retain battle snapshots before routing", () => {
	const win = new GameFacade(new MemorySaveStorage());
	const winStart = win.newRun("transition-win");
	const winNode = winStart.map.find(
		(item) => item.enabled && item.type === "combat",
	);
	assert.ok(winNode);
	win.selectNode(winNode.id);
	let victory: CombatTransition | undefined;
	for (let step = 0; step < 80 && win.view().phase === "combat"; step += 1) {
		const combat = win.view().combat!;
		const card = combat.hand.find((item) => item.playable);
		victory = card
			? win.playCardTransition(card.instanceId, combat.enemyId)
			: win.endTurnTransition();
	}
	assert.ok(victory);
	assert.equal(
		victory.events.some((event) => event.type === "CombatWon"),
		true,
	);
	assert.equal(victory.view.phase, "combat");
	assert.equal(victory.after.phase, "reward");

	const lose = new GameFacade(new MemorySaveStorage());
	const loseStart = lose.newRun("transition-lose");
	const loseNode = loseStart.map.find(
		(item) => item.enabled && item.type === "combat",
	);
	assert.ok(loseNode);
	lose.selectNode(loseNode.id);
	let defeat: CombatTransition | undefined;
	for (let step = 0; step < 50 && lose.view().phase === "combat"; step += 1)
		defeat = lose.endTurnTransition();
	assert.ok(defeat);
	assert.equal(
		defeat.events.some((event) => event.type === "CombatLost"),
		true,
	);
	assert.equal(defeat.view.phase, "combat");
	assert.equal(defeat.after.phase, "lost");
});

test("GameFacade projects card effects, player resources, rewards, and shop names", () => {
	for (const card of Object.values(CARDS)) {
		const view = cardView(`${card.id}#test`);
		assert.equal(view.cardId, card.id);
		assert.equal(view.name, card.id);
		assert.equal(view.cost, card.cost);
		for (const effect of card.effects)
			assert.match(
				view.preview,
				new RegExp(effect.kind === "if" ? effect.predicate : effect.kind),
			);
	}
	assert.equal(
		cardView("execute#test").preview,
		"if targetHasPoison: then damage enemy 10; else damage enemy 2",
	);
	const game = new GameFacade(new MemorySaveStorage());
	const initial = game.newRun("view");
	assert.equal(initial.gold, 104);
	assert.deepEqual(initial.relics, ["anchor"]);
	assert.equal(initial.deck.length, 10);
	assert.equal(initial.visitedNodes, 1);
	assert.deepEqual(initial.playerStatuses, []);
	const combatNode = initial.map.find(
		(node) => node.enabled && node.type === "combat",
	)!;
	game.selectNode(combatNode.id);
	assert.equal(game.view().combat?.playerBlock, 3);
	facadeWinCombat(game);
	assert.ok(
		game
			.view()
			.reward?.cards.every((card) => CARDS[card.cardId] && card.preview),
	);
	game.skipReward();
	for (let step = 0; step < 8 && game.view().phase !== "shop"; step += 1) {
		const node =
			game.view().map.find((item) => item.enabled && item.type === "shop") ??
			game.view().map.find((item) => item.enabled)!;
		game.selectNode(node.id);
		if (game.view().phase === "combat") facadeWinCombat(game);
		if (game.view().phase === "shop") break;
		facadeSettle(game);
	}
	assert.ok(
		game
			.view()
			.shop?.every(
				(item) =>
					item.name &&
					item.price >= 0 &&
					item.affordable === (!item.sold && game.view().gold >= item.price) &&
					(!item.card ||
						(item.card.cost === CARDS[item.card.cardId].cost &&
							item.card.preview === cardView(item.card.instanceId).preview)),
			),
	);
	const available = game.view().shop!.find((item) => !item.sold)!;
	const purchased = game.buyTransition(available.id);
	assert.equal(purchased.accepted, true);
	assert.equal(
		purchased.view.shop!.find((item) => item.id === available.id)?.sold,
		true,
	);
	const duplicate = game.buyTransition(available.id);
	assert.equal(duplicate.accepted, false);
	assert.equal(duplicate.reason, "invalid-purchase");
});

test("relics apply anchor block, ironHeart healing, and coinPurse gold", () => {
	const anchor = next(newRun("anchor"), "combat");
	assert.equal(anchor.combat.player.block, 3);
	const ironHeart = newRun("iron-heart");
	ironHeart.relics!.push("ironHeart");
	ironHeart.combat.player.hp = 20;
	assert.equal(next(ironHeart, "combat").combat.player.hp, 23);
	const purse = next(newRun("coin-purse"), "shop");
	purse.shop!.inventory[2] = {
		id: "relic:test",
		relicId: "coinPurse",
		price: 45,
		sold: false,
	};
	const result = buy(purse, "relic:test");
	assert.equal(result.accepted, true);
	assert.equal(result.run.gold, purse.gold! - 35);
});
