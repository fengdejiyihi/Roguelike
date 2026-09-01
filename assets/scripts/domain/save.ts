import { CARDS } from "./cards";
import { CONTENT_VERSION, RULES_VERSION, SCHEMA_VERSION } from "./model";
import type { RunState } from "./model";

export type SaveEnvelope = {
	schemaVersion: number;
	contentVersion: string;
	rulesVersion: string;
	appBuild: string;
	generation: number;
	savedAt: number;
	payload: RunState;
	checksum: string;
};
export interface SaveStorage {
	load(): string | null;
	save(value: string): void;
}
export interface KeyValueStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}
const checksum = (text: string): string => {
	let hash = 2166136261;
	for (let index = 0; index < text.length; index += 1)
		hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
	return (hash >>> 0).toString(16);
};
export function serialize(
	run: RunState,
	generation = 1,
	savedAt = Date.now(),
): string {
	const base = {
		schemaVersion: run.schemaVersion,
		contentVersion: run.contentVersion,
		rulesVersion: run.rulesVersion,
		appBuild: "phase-3",
		generation,
		savedAt,
		payload: run,
	};
	return JSON.stringify({ ...base, checksum: checksum(JSON.stringify(base)) });
}
export function deserialize(text: string): SaveEnvelope {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new Error("invalid-save");
	}
	if (!parsed || typeof parsed !== "object") throw new Error("invalid-save");
	const envelope = parsed as SaveEnvelope;
	const { checksum: supplied, ...base } = envelope;
	if (
		!validEnvelope(envelope) ||
		supplied !== checksum(JSON.stringify(base)) ||
		!validRun(envelope.payload)
	)
		throw new Error("invalid-save");
	if (
		envelope.schemaVersion !== SCHEMA_VERSION ||
		envelope.contentVersion !== CONTENT_VERSION ||
		envelope.rulesVersion !== RULES_VERSION ||
		envelope.payload.schemaVersion !== envelope.schemaVersion ||
		envelope.payload.contentVersion !== envelope.contentVersion ||
		envelope.payload.rulesVersion !== envelope.rulesVersion
	)
		throw new Error("unsupported-save");
	return envelope;
}

function validEnvelope(value: SaveEnvelope): boolean {
	return (
		Number.isInteger(value.schemaVersion) &&
		typeof value.contentVersion === "string" &&
		typeof value.rulesVersion === "string" &&
		typeof value.appBuild === "string" &&
		nonnegativeInteger(value.generation) &&
		Number.isFinite(value.savedAt) &&
		typeof value.checksum === "string" &&
		Boolean(value.checksum)
	);
}
function validRun(run: unknown): run is RunState {
	if (!run || typeof run !== "object") return false;
	const value = run as Record<string, unknown>;
	if (
		!Number.isInteger(value.schemaVersion) ||
		typeof value.contentVersion !== "string" ||
		typeof value.rulesVersion !== "string" ||
		typeof value.seed !== "string" ||
		!value.seed ||
		typeof value.runId !== "string" ||
		!value.runId
	)
		return false;
	if (
		!validPhase(value.phase) ||
		!validMap(value.map) ||
		!validCurrent(value.currentNodeId, value.visited, value.map) ||
		!Array.isArray(value.deck) ||
		!nonnegativeInteger(value.gold) ||
		!Array.isArray(value.relics) ||
		!value.relics.every(validRelic)
	)
		return false;
	const rng = value.rngStreams as Record<string, unknown> | undefined;
	if (
		!rng ||
		!["mapRng", "combatRng", "rewardRng", "eventRng"].every((name) =>
			uint32((rng[name] as { state?: unknown })?.state),
		)
	)
		return false;
	const combat = value.combat as Record<string, unknown> | undefined;
	return Boolean(
		combat &&
			validCombat(combat) &&
			validCardInstances(value.deck) &&
			validPendingReward(value.pendingReward) &&
			validShop(value.shop) &&
			validEvent(value.event) &&
			validPhaseState(value, combat),
	);
}
function validPhase(value: unknown): boolean {
	return ["map", "combat", "reward", "shop", "event", "won", "lost"].includes(
		value as string,
	);
}
function validCombat(combat: Record<string, unknown>): boolean {
	return (
		typeof combat.id === "string" &&
		Boolean(combat.id) &&
		["AwaitPlayerAction", "Victory", "Defeat"].includes(
			combat.phase as string,
		) &&
		positiveInteger(combat.turn) &&
		nonnegativeInteger(combat.commandIndex) &&
		nonnegativeInteger(combat.energy) &&
		nonnegativeInteger(combat.enemyIntentDamage) &&
		typeof combat.enemyName === "string" &&
		Boolean(combat.enemyName) &&
		validFighter(combat.player) &&
		validFighter(combat.enemy) &&
		["draw", "hand", "discard", "exhaust"].every((name) =>
			validCardInstances(combat[name]),
		) &&
		validTerminal(combat, combat.phase as string)
	);
}
function validFighter(value: unknown): boolean {
	if (!value || typeof value !== "object") return false;
	const fighter = value as Record<string, unknown>;
	return (
		typeof fighter.id === "string" &&
		Boolean(fighter.id) &&
		Number.isFinite(fighter.hp) &&
		typeof fighter.hp === "number" &&
		positiveInteger(fighter.maxHp) &&
		fighter.hp <= fighter.maxHp &&
		nonnegativeInteger(fighter.block) &&
		Array.isArray(fighter.statuses) &&
		fighter.statuses.every(
			(status) =>
				status &&
				typeof status === "object" &&
				["poison", "spike"].includes(
					(status as Record<string, unknown>).id as string,
				) &&
				positiveInteger((status as Record<string, unknown>).stacks),
		)
	);
}
function validMap(value: unknown): boolean {
	if (!Array.isArray(value)) return false;
	const ids = new Set(
		value.map((node) => (node as Record<string, unknown>)?.id),
	);
	return (
		ids.size === value.length &&
		value.every(
			(node) =>
				node &&
				typeof node === "object" &&
				typeof (node as Record<string, unknown>).id === "string" &&
				Boolean((node as Record<string, unknown>).id) &&
				nonnegativeInteger((node as Record<string, unknown>).rank) &&
				["start", "combat", "elite", "shop", "event", "boss"].includes(
					(node as Record<string, unknown>).type as string,
				) &&
				Array.isArray((node as Record<string, unknown>).next) &&
				((node as Record<string, unknown>).next as unknown[]).every(
					(next) => typeof next === "string" && ids.has(next),
				) &&
				typeof (node as Record<string, unknown>).visited === "boolean",
		)
	);
}
function validCurrent(
	current: unknown,
	visited: unknown,
	map: unknown,
): boolean {
	if (typeof current !== "string" || !Array.isArray(visited)) return false;
	const ids = new Set(
		Array.isArray(map)
			? map.map((node) => (node as Record<string, unknown>).id)
			: [],
	);
	return (
		ids.has(current) &&
		visited.includes(current) &&
		new Set(visited).size === visited.length &&
		visited.every((id) => typeof id === "string" && ids.has(id)) &&
		Boolean(
			(map as Array<Record<string, unknown>>).find(
				(node) => node.id === current,
			)?.visited,
		)
	);
}
function validRelic(value: unknown): boolean {
	return ["anchor", "coinPurse", "ironHeart"].includes(value as string);
}
function validCardInstances(value: unknown): boolean {
	return (
		Array.isArray(value) &&
		value.every(
			(card) => typeof card === "string" && Boolean(CARDS[card.split("#")[0]]),
		)
	);
}
function validPendingReward(value: unknown): boolean {
	if (value === undefined) return true;
	if (!value || typeof value !== "object") return false;
	const reward = value as Record<string, unknown>;
	return (
		typeof reward.id === "string" &&
		Boolean(reward.id) &&
		validCardInstances(reward.cards) &&
		nonnegativeInteger(reward.gold) &&
		typeof reward.claimed === "boolean"
	);
}
function validShop(value: unknown): boolean {
	if (value === undefined) return true;
	if (!value || typeof value !== "object") return false;
	const shop = value as Record<string, unknown>;
	return (
		typeof shop.id === "string" &&
		Boolean(shop.id) &&
		Array.isArray(shop.inventory) &&
		shop.inventory.every((item) => {
			if (!item || typeof item !== "object") return false;
			const entry = item as Record<string, unknown>;
			const hasCard =
				typeof entry.cardId === "string" && Boolean(CARDS[entry.cardId]);
			const hasRelic = validRelic(entry.relicId);
			return (
				typeof entry.id === "string" &&
				Boolean(entry.id) &&
				hasCard !== hasRelic &&
				typeof entry.price === "number" &&
				nonnegativeInteger(entry.price) &&
				typeof entry.sold === "boolean"
			);
		}) &&
		typeof shop.left === "boolean"
	);
}
function uint32(value: unknown): boolean {
	return nonnegativeInteger(value) && value <= 0xffffffff;
}
function nonnegativeInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
function positiveInteger(value: unknown): value is number {
	return nonnegativeInteger(value) && value > 0;
}
function validTerminal(
	combat: Record<string, unknown>,
	phase: string,
): boolean {
	const player = combat.player as Record<string, unknown>;
	const enemy = combat.enemy as Record<string, unknown>;
	if (phase === "AwaitPlayerAction")
		return (player.hp as number) > 0 && (enemy.hp as number) > 0;
	if (phase === "Victory") return (enemy.hp as number) <= 0;
	return (player.hp as number) <= 0;
}
function validEvent(value: unknown): boolean {
	if (value === undefined) return true;
	if (!value || typeof value !== "object") return false;
	const event = value as Record<string, unknown>;
	return (
		["shrine", "gamble"].includes(event.id as string) &&
		typeof event.settled === "boolean"
	);
}
function validPhaseState(
	run: Record<string, unknown>,
	combat: Record<string, unknown>,
): boolean {
	const map = run.map as Array<Record<string, unknown>>;
	const node = map.find((item) => item.id === run.currentNodeId);
	const phase = run.phase;
	const battle = ["combat", "elite", "boss"].includes(node?.type as string);
	const empty =
		run.pendingReward === undefined &&
		run.shop === undefined &&
		run.event === undefined;
	if (phase === "map")
		return node?.type !== "boss" && combat.phase === "Victory" && empty;
	if (phase === "combat")
		return combat.phase === "AwaitPlayerAction" && battle && empty;
	if (phase === "reward")
		return (
			combat.phase === "Victory" &&
			battle &&
			Boolean(run.pendingReward) &&
			!(run.pendingReward as Record<string, unknown>).claimed &&
			run.shop === undefined &&
			run.event === undefined
		);
	if (phase === "shop")
		return (
			node?.type === "shop" &&
			combat.phase === "Victory" &&
			Boolean(run.shop) &&
			!(run.shop as Record<string, unknown>).left &&
			run.pendingReward === undefined &&
			run.event === undefined
		);
	if (phase === "event")
		return (
			node?.type === "event" &&
			combat.phase === "Victory" &&
			Boolean(run.event) &&
			!(run.event as Record<string, unknown>).settled &&
			run.pendingReward === undefined &&
			run.shop === undefined
		);
	if (phase === "won")
		return node?.type === "boss" && combat.phase === "Victory" && empty;
	return battle && combat.phase === "Defeat" && empty;
}
export class MemorySaveStorage implements SaveStorage {
	private value: string | null = null;
	load(): string | null {
		return this.value;
	}
	save(value: string): void {
		this.value = value;
	}
}
export class KeyValueSaveStorage implements SaveStorage {
	constructor(
		private readonly storage: KeyValueStorage,
		private readonly key = "roguelike-save",
	) {}
	load(): string | null {
		const active = this.storage.getItem(`${this.key}:active`);
		const candidates = ["a", "b"].flatMap((slot) => {
			const value = this.storage.getItem(`${this.key}:${slot}`);
			if (!value) return [];
			try {
				return [{ slot, value, envelope: deserialize(value) }];
			} catch {
				return [];
			}
		});
		candidates.sort(
			(left, right) =>
				right.envelope.generation - left.envelope.generation ||
				(right.slot === active ? 1 : 0) - (left.slot === active ? 1 : 0),
		);
		return candidates[0]?.value ?? null;
	}
	save(value: string): void {
		deserialize(value);
		const active =
			this.storage.getItem(`${this.key}:active`) === "a" ? "a" : "b";
		const target = active === "a" ? "b" : "a";
		this.storage.setItem(`${this.key}:${target}`, value);
		const readback = this.storage.getItem(`${this.key}:${target}`);
		if (readback !== value) throw new Error("save-verification-failed");
		deserialize(readback);
		this.storage.setItem(`${this.key}:active`, target);
	}
}
