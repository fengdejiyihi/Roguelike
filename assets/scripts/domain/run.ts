import { CARDS } from "./cards";
import { createRun, executeCommand } from "./combat";
import { createMap, legalNext } from "./map";
import { CONTENT_VERSION } from "./model";
import type {
	CombatState,
	Command,
	CommandResult,
	EventState,
	MapNode,
	RelicId,
	Reward,
	RunState,
	ShopState,
} from "./model";
import { nextInt, shuffle } from "./rng";

const enemyProfile = (node: MapNode) => {
	if (node.type === "elite") return { name: "Elite", hp: 18, attack: 3 };
	if (node.type === "boss") return { name: "Boss", hp: 22, attack: 4 };
	return node.rank === 1
		? { name: "Scout", hp: 12, attack: 1 }
		: { name: "Brute", hp: 15, attack: 2 };
};
const relics: RelicId[] = ["anchor", "coinPurse", "ironHeart"];
const cards = Object.keys(CARDS);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export type RunResult = { accepted: boolean; run: RunState; reason?: string };

export function newRun(seed: string): RunState {
	const run = createRun(seed);
	run.contentVersion = CONTENT_VERSION;
	run.phase = "map";
	run.map = createMap(run.rngStreams.mapRng);
	run.currentNodeId = "start";
	run.visited = ["start"];
	run.gold = 104;
	run.deck = run.combat.draw.concat(run.combat.hand);
	run.relics = ["anchor"];
	run.combat.phase = "Victory";
	run.combat.enemy.hp = 0;
	return run;
}

export function selectNode(run: RunState, id: string): RunResult {
	if (
		run.phase !== "map" ||
		!run.map ||
		!run.currentNodeId ||
		!legalNext(run.map, run.currentNodeId).includes(id)
	)
		return reject(run, "invalid-node");
	const draft = clone(run);
	const node = draft.map!.find((item) => item.id === id)!;
	if (
		(node.type === "combat" || node.type === "elite" || node.type === "boss") &&
		(!run.deck ||
			run.deck.some((id) => typeof id !== "string" || !CARDS[id.split("#")[0]]))
	)
		return reject(run, "invalid-deck");
	node.visited = true;
	draft.currentNodeId = id;
	draft.visited!.push(id);
	if (node.type === "shop") {
		draft.phase = "shop";
		draft.shop = shop(draft);
	} else if (node.type === "event") {
		draft.phase = "event";
		draft.event = {
			id: nextInt(draft.rngStreams.eventRng, 2) ? "shrine" : "gamble",
			settled: false,
		};
	} else if (
		node.type === "combat" ||
		node.type === "elite" ||
		node.type === "boss"
	)
		beginCombat(draft, node);
	return { accepted: true, run: draft };
}

function beginCombat(run: RunState, node: MapNode): void {
	const profile = enemyProfile(node);
	const draw = shuffle(
		run.deck!.map((id, index) => `${id.split("#")[0]}#${node.id}:${index}`),
		run.rngStreams.combatRng,
	);
	const combat: CombatState = {
		id: `combat:${run.runId}:${node.id}`,
		phase: "AwaitPlayerAction" as const,
		turn: 1,
		commandIndex: 0,
		energy: 3,
		player: {
			id: "player",
			hp: 40,
			maxHp: 40,
			block: run.relics!.includes("anchor") ? 3 : 0,
			statuses: [],
		},
		enemy: {
			id: `enemy:${node.id}`,
			hp: profile.hp,
			maxHp: profile.hp,
			block: 0,
			statuses: [],
		},
		enemyName: profile.name,
		enemyIntentDamage: profile.attack,
		draw,
		hand: [],
		discard: [],
		exhaust: [],
	};
	for (let index = 0; index < 5; index += 1) {
		const card = combat.draw.pop();
		if (card) combat.hand.push(card);
	}
	combat.player.hp = Math.min(
		combat.player.maxHp,
		run.combat.player.hp + (run.relics!.includes("ironHeart") ? 3 : 0),
	);
	run.combat = combat;
	run.phase = "combat";
}

export function combatCommand(run: RunState, command: Command): CommandResult {
	if (run.phase !== "combat")
		return { accepted: false, run, events: [], reason: "not-in-combat" };
	const result = executeCommand(run, command);
	if (!result.accepted) return result;
	if (result.run.combat.phase === "Defeat") result.run.phase = "lost";
	if (result.run.combat.phase === "Victory") {
		result.run.phase = "reward";
		result.run.pendingReward = reward(result.run);
	}
	return result;
}

function reward(run: RunState): Reward {
	const picks = cards.slice();
	const chosen: string[] = [];
	while (chosen.length < 3) {
		const card = picks.splice(
			nextInt(run.rngStreams.rewardRng, picks.length),
			1,
		)[0];
		chosen.push(card);
	}
	return {
		id: `reward:${run.currentNodeId}`,
		cards: chosen,
		gold: 15,
		claimed: false,
	};
}
export function claimReward(run: RunState, cardId?: string): RunResult {
	if (
		run.phase !== "reward" ||
		!run.pendingReward ||
		run.pendingReward.claimed ||
		(cardId !== undefined && !run.pendingReward.cards.includes(cardId))
	)
		return reject(run, "invalid-reward");
	const draft = clone(run);
	const reward = draft.pendingReward!;
	if (cardId) draft.deck!.push(cardId);
	draft.gold! += reward.gold;
	reward.claimed = true;
	draft.pendingReward = undefined;
	draft.phase = nextPhase(draft);
	return { accepted: true, run: draft };
}
function shop(run: RunState): ShopState {
	const order = [
		cards[nextInt(run.rngStreams.rewardRng, cards.length)],
		cards[nextInt(run.rngStreams.rewardRng, cards.length)],
	];
	return {
		id: `shop:${run.currentNodeId}`,
		left: false,
		inventory: [
			{ id: "card:0", cardId: order[0], price: 20, sold: false },
			{ id: "card:1", cardId: order[1], price: 25, sold: false },
			{
				id: "relic:0",
				relicId: relics[
					nextInt(run.rngStreams.rewardRng, relics.length)
				] as RelicId,
				price: 45,
				sold: false,
			},
		],
	};
}
export function buy(run: RunState, id: string): RunResult {
	const item = run.shop?.inventory.find((entry) => entry.id === id);
	if (
		run.phase !== "shop" ||
		!item ||
		item.sold ||
		(run.gold ?? 0) < item.price
	)
		return reject(run, "invalid-purchase");
	const draft = clone(run);
	const bought = draft.shop!.inventory.find((entry) => entry.id === id)!;
	bought.sold = true;
	draft.gold! -= bought.price;
	if (bought.cardId) draft.deck!.push(bought.cardId);
	if (bought.relicId && !draft.relics!.includes(bought.relicId))
		draft.relics!.push(bought.relicId);
	if (bought.relicId === "coinPurse") draft.gold! += 10;
	return { accepted: true, run: draft };
}
export function leaveShop(run: RunState): RunResult {
	if (run.phase !== "shop" || run.shop?.left)
		return reject(run, "invalid-shop-leave");
	const draft = clone(run);
	draft.shop = undefined;
	draft.phase = nextPhase(draft);
	return { accepted: true, run: draft };
}
export function chooseEvent(
	run: RunState,
	choice: "accept" | "skip",
): RunResult {
	if (
		run.phase !== "event" ||
		!run.event ||
		run.event.settled ||
		(choice !== "accept" && choice !== "skip")
	)
		return reject(run, "invalid-event");
	const draft = clone(run);
	const event: EventState = draft.event!;
	if (choice === "accept") {
		if (event.id === "shrine")
			draft.combat.player.hp = Math.min(40, draft.combat.player.hp + 8);
		else draft.gold! += 25;
	}
	event.settled = true;
	draft.event = undefined;
	draft.phase = nextPhase(draft);
	return { accepted: true, run: draft };
}
function nextPhase(run: RunState): RunState["phase"] {
	const node = run.map!.find((item) => item.id === run.currentNodeId);
	return node?.type === "boss" ? "won" : "map";
}
function reject(run: RunState, reason: string): RunResult {
	return { accepted: false, run, reason };
}
