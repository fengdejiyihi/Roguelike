import assert from "node:assert/strict";
import test from "node:test";
import { validateCardDefinitions } from "../../assets/scripts/domain/cards";
import { stateDigest } from "../../assets/scripts/domain/combat";
import { newRun, selectNode } from "../../assets/scripts/domain/run";
import {
	KeyValueSaveStorage,
	deserialize,
	serialize,
} from "../../assets/scripts/domain/save";

function checksum(text: string): string {
	let hash = 2166136261;
	for (let index = 0; index < text.length; index += 1)
		hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
	return (hash >>> 0).toString(16);
}

test("save accepts supported roundtrips and rejects malformed or incompatible valid-checksum envelopes", () => {
	const run = newRun("save-boundary");
	assert.deepEqual(deserialize(serialize(run, 1, 1)).payload, run);
	assert.throws(() => deserialize("{"), /invalid-save/);
	assert.throws(
		() =>
			deserialize(serialize({ ...run, contentVersion: "unsupported" }, 1, 1)),
		/unsupported-save/,
	);
	assert.throws(
		() =>
			deserialize(
				serialize(
					{ ...run, combat: { ...run.combat, hand: "bad" } } as never,
					1,
					1,
				),
			),
		/invalid-save/,
	);
	const mismatch = JSON.parse(serialize(run, 1, 1));
	mismatch.payload.rulesVersion = "other-rules";
	const { checksum: ignored, ...base } = mismatch;
	mismatch.checksum = checksum(JSON.stringify(base));
	assert.throws(
		() => deserialize(JSON.stringify(mismatch)),
		/unsupported-save/,
	);
});

test("checksum-valid saves reject malformed dereferenced combat, map, status, and shop fields", () => {
	const run = newRun("shape");
	for (const malformed of [
		{ ...run, combat: { ...run.combat, player: undefined } },
		{
			...run,
			shop: {
				id: "shop",
				left: false,
				inventory: [{ id: "card", cardId: "strike", price: "20", sold: false }],
			},
		},
		{
			...run,
			map: [
				{ id: "start", rank: "zero", type: "start", next: [], visited: true },
			],
		},
		{
			...run,
			combat: {
				...run.combat,
				player: {
					...run.combat.player,
					statuses: [{ id: "unknown", stacks: 1 }],
				},
			},
		},
	])
		assert.throws(
			() => deserialize(serialize(malformed as never)),
			/invalid-save/,
		);
});

test("phase mutation matrix rejects 44 checksum-valid contradictory run states", () => {
	const map = newRun("matrix");
	const combatNode = map.map!.find((node) => node.type === "combat")!;
	const active = selectNode(map, combatNode.id).run;
	const victoryCombat = {
		...active.combat,
		phase: "Victory" as const,
		enemy: { ...active.combat.enemy, hp: 0 },
	};
	const reward = {
		...active,
		phase: "reward" as const,
		combat: victoryCombat,
		pendingReward: { id: "reward", cards: ["strike"], gold: 1, claimed: false },
	};
	const visitedMap = (id: string) =>
		map.map!.map((node) =>
			node.id === id ? { ...node, visited: true } : node,
		);
	const shopNode = map.map!.find((node) => node.type === "shop")!;
	const shop = {
		...map,
		map: visitedMap(shopNode.id),
		currentNodeId: shopNode.id,
		visited: ["start", shopNode.id],
		phase: "shop" as const,
		shop: {
			id: "shop",
			left: false,
			inventory: [{ id: "card", cardId: "strike", price: 1, sold: false }],
		},
	};
	const eventNode = map.map!.find((node) => node.type === "event")!;
	const event = {
		...map,
		map: visitedMap(eventNode.id),
		currentNodeId: eventNode.id,
		visited: ["start", eventNode.id],
		phase: "event" as const,
		event: { id: "shrine" as const, settled: false },
	};
	const boss = map.map!.find((node) => node.type === "boss")!;
	const won = {
		...map,
		map: visitedMap(boss.id),
		currentNodeId: boss.id,
		visited: ["start", boss.id],
		phase: "won" as const,
	};
	const lost = {
		...active,
		phase: "lost" as const,
		combat: {
			...active.combat,
			phase: "Defeat" as const,
			player: { ...active.combat.player, hp: 0 },
		},
	};
	const cases: Array<[string, unknown]> = [
		["map-empty", { ...map, map: [] }],
		["map-missing", { ...map, map: undefined }],
		["map-current-missing", { ...map, currentNodeId: undefined }],
		["map-visited-current-missing", { ...map, visited: [] }],
		["map-deck-missing", { ...map, deck: undefined }],
		["map-gold-negative", { ...map, gold: -1 }],
		["map-relics-missing", { ...map, relics: undefined }],
		["map-pending", { ...map, pendingReward: reward.pendingReward }],
		["map-event", { ...map, event: event.event }],
		["map-shop", { ...map, shop: shop.shop }],
		[
			"map-await",
			{
				...map,
				combat: {
					...map.combat,
					phase: "AwaitPlayerAction",
					enemy: { ...map.combat.enemy, hp: 1 },
				},
			},
		],
		[
			"map-defeat",
			{
				...map,
				combat: {
					...map.combat,
					phase: "Defeat",
					player: { ...map.combat.player, hp: 0 },
				},
			},
		],
		["combat-map", { ...active, phase: "map" }],
		["combat-reward", { ...active, phase: "reward" }],
		["combat-shop", { ...active, phase: "shop" }],
		["combat-event", { ...active, phase: "event" }],
		["combat-won", { ...active, phase: "won" }],
		["combat-lost", { ...active, phase: "lost" }],
		["combat-pending", { ...active, pendingReward: reward.pendingReward }],
		["combat-event-payload", { ...active, event: event.event }],
		["combat-shop-payload", { ...active, shop: shop.shop }],
		["combat-shop-node", { ...active, phase: "shop", shop: shop.shop }],
		[
			"reward-claimed",
			{ ...reward, pendingReward: { ...reward.pendingReward, claimed: true } },
		],
		["reward-missing", { ...reward, pendingReward: undefined }],
		["reward-await", { ...reward, phase: "combat" }],
		["reward-event", { ...reward, event: event.event }],
		["reward-shop", { ...reward, shop: shop.shop }],
		["shop-left", { ...shop, shop: { ...shop.shop, left: true } }],
		["shop-map", { ...shop, phase: "map" }],
		["shop-event", { ...shop, event: event.event }],
		["shop-pending", { ...shop, pendingReward: reward.pendingReward }],
		["event-settled", { ...event, event: { ...event.event, settled: true } }],
		["event-map", { ...event, phase: "map" }],
		["event-shop", { ...event, shop: shop.shop }],
		["event-pending", { ...event, pendingReward: reward.pendingReward }],
		["won-not-boss", { ...won, currentNodeId: "start", visited: ["start"] }],
		["won-pending", { ...won, pendingReward: reward.pendingReward }],
		["won-shop", { ...won, shop: shop.shop }],
		["won-event", { ...won, event: event.event }],
		["lost-map", { ...lost, phase: "map" }],
		["lost-pending", { ...lost, pendingReward: reward.pendingReward }],
		["lost-shop", { ...lost, shop: shop.shop }],
		["lost-event", { ...lost, event: event.event }],
		["lost-victory", { ...lost, combat: victoryCombat }],
	];
	assert.equal(cases.length, 44);
	for (const [name, value] of cases)
		assert.throws(
			() => deserialize(serialize(value as never)),
			/invalid-save/,
			name,
		);
});

test("phase invariants reject boss map and inactive shop, event, and loss states", () => {
	const run = newRun("phase-focus");
	const visitedMap = (id: string) =>
		run.map!.map((node) =>
			node.id === id ? { ...node, visited: true } : node,
		);
	const at = (id: string) => ({
		...run,
		map: visitedMap(id),
		currentNodeId: id,
		visited: ["start", id],
	});
	const boss = run.map!.find((node) => node.type === "boss")!;
	const shop = run.map!.find((node) => node.type === "shop")!;
	const event = run.map!.find((node) => node.type === "event")!;
	const awaitCombat = {
		...run.combat,
		phase: "AwaitPlayerAction" as const,
		enemy: { ...run.combat.enemy, hp: 1 },
	};
	const defeatCombat = {
		...run.combat,
		phase: "Defeat" as const,
		player: { ...run.combat.player, hp: 0 },
	};
	const cases: Array<[string, unknown]> = [
		["map-at-boss", at(boss.id)],
		[
			"shop-with-await",
			{
				...at(shop.id),
				phase: "shop" as const,
				combat: awaitCombat,
				shop: {
					id: "shop",
					left: false,
					inventory: [{ id: "card", cardId: "strike", price: 1, sold: false }],
				},
			},
		],
		[
			"event-with-defeat",
			{
				...at(event.id),
				phase: "event" as const,
				combat: defeatCombat,
				event: { id: "shrine" as const, settled: false },
			},
		],
		["lost-at-start", { ...run, phase: "lost" as const, combat: defeatCombat }],
	];
	for (const [name, value] of cases)
		assert.throws(
			() => deserialize(serialize(value as never)),
			/invalid-save/,
			name,
		);
});

test("numeric invariants reject active negatives while terminal negative hp remains valid", () => {
	const initial = newRun("numeric");
	const node = initial.map!.find(
		(item) => item.rank === 1 && item.type === "combat",
	)!;
	const active = selectNode(initial, node.id).run;
	for (const combat of [
		{ ...active.combat, energy: -1 },
		{ ...active.combat, enemyIntentDamage: -1 },
		{
			...active.combat,
			player: {
				...active.combat.player,
				statuses: [{ id: "poison", stacks: -1 }],
			},
		},
		{ ...active.combat, player: { ...active.combat.player, hp: -1 } },
	])
		assert.throws(
			() => deserialize(serialize({ ...active, combat } as never)),
			/invalid-save/,
		);
	const defeat = {
		...active,
		phase: "lost" as const,
		combat: {
			...active.combat,
			phase: "Defeat" as const,
			player: { ...active.combat.player, hp: -1 },
		},
	};
	const victory = {
		...active,
		phase: "map" as const,
		combat: {
			...active.combat,
			phase: "Victory" as const,
			enemy: { ...active.combat.enemy, hp: -1 },
		},
	};
	assert.deepEqual(deserialize(serialize(defeat)).payload, defeat);
	assert.deepEqual(deserialize(serialize(victory)).payload, victory);
});

test("invalid card IDs, numeric ranges, and targets fail at content validation", () => {
	assert.throws(
		() =>
			validateCardDefinitions({
				bad: { id: "other", cost: 0, effects: [{ kind: "draw", value: 1 }] },
			}),
		/invalid-card:bad:definition:id-cost-or-effects/,
	);
	assert.throws(
		() =>
			validateCardDefinitions({
				bad: { id: "bad", cost: -1, effects: [{ kind: "draw", value: 1 }] },
			}),
		/invalid-card:bad:definition:id-cost-or-effects/,
	);
	assert.throws(
		() =>
			validateCardDefinitions({
				bad: {
					id: "bad",
					cost: 0,
					effects: [{ kind: "damage", value: 1, target: "any" } as never],
				},
			}),
		/invalid-card:bad:effects\[0\]:damage-value-or-target/,
	);
});

test("invalid deck card IDs reject combat entry atomically", () => {
	const run = newRun("deck-boundary");
	run.deck!.push("unknown-card");
	const before = stateDigest(run);
	const node = run.map!.find(
		(item) => item.next.length > 0 && item.rank === 1 && item.type === "combat",
	)!;
	const result = selectNode(run, node.id);
	assert.equal(result.accepted, false);
	assert.equal(result.reason, "invalid-deck");
	assert.equal(stateDigest(result.run), before);
});

test("A/B save keeps the highest valid generation and falls back from corruption", () => {
	const values = new Map<string, string>();
	const storage = new KeyValueSaveStorage({
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => values.set(key, value),
	});
	storage.save(serialize(newRun("ab"), 1, 1));
	storage.save(serialize(newRun("ab"), 2, 2));
	assert.equal(deserialize(storage.load()!).generation, 2);
	values.set("roguelike-save:b", "corrupt");
	assert.equal(deserialize(storage.load()!).generation, 1);
});

test("A/B save does not flip active slot after failed readback", () => {
	const values = new Map<string, string>();
	let fail = false;
	const storage = new KeyValueSaveStorage({
		getItem: (key) => values.get(key) ?? null,
		setItem: (key, value) => {
			if (!fail || !key.endsWith(":b")) values.set(key, value);
		},
	});
	storage.save(serialize(newRun("readback"), 1, 1));
	fail = true;
	assert.throws(
		() => storage.save(serialize(newRun("readback"), 2, 2)),
		/save-verification-failed/,
	);
	assert.equal(values.get("roguelike-save:active"), "a");
});

test("checksum-valid unknown combat cards and non-string decks are rejected safely", () => {
	const run = newRun("bad-cards");
	assert.throws(
		() =>
			deserialize(
				serialize({
					...run,
					combat: { ...run.combat, hand: ["unknown#0"] },
				} as never),
			),
		/invalid-save/,
	);
	run.deck!.push(7 as never);
	const before = stateDigest(run);
	const node = run.map!.find(
		(item) => item.rank === 1 && item.type === "combat",
	)!;
	const result = selectNode(run, node.id);
	assert.equal(result.reason, "invalid-deck");
	assert.equal(stateDigest(result.run), before);
});
