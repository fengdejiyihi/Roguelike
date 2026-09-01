export const SCHEMA_VERSION = 1;
export const CONTENT_VERSION = "phase-3-test";
export const RULES_VERSION = "phase-3.0";
export const MAX_TRIGGER_DEPTH = 32;
export const MAX_RESOLUTION_STEPS = 1024;

export type RngState = { state: number };
export type RngStreams = {
	mapRng: RngState;
	combatRng: RngState;
	rewardRng: RngState;
	eventRng: RngState;
};
export type StatusId = "poison" | "spike";
export type Window =
	| "CombatStart"
	| "TurnStart"
	| "CardPlayed"
	| "AfterDamage"
	| "TurnEnd";
export type Effect =
	| { kind: "damage"; value: number; target: "enemy" | "player" }
	| { kind: "block"; value: number }
	| { kind: "draw"; value: number }
	| {
			kind: "applyStatus";
			statusId: StatusId;
			stacks: number;
			target: "enemy" | "player";
	  }
	| { kind: "sequence"; effects: Effect[] }
	| {
			kind: "if";
			predicate: "targetHasPoison";
			then: Effect[];
			else?: Effect[];
	  }
	| { kind: "emitWindow"; window: Window };
export type CardDefinition = { id: string; cost: number; effects: Effect[] };
export type Status = { id: StatusId; stacks: number };
export type Fighter = {
	id: string;
	hp: number;
	maxHp: number;
	block: number;
	statuses: Status[];
};
export type CombatState = {
	id: string;
	phase: "AwaitPlayerAction" | "Victory" | "Defeat";
	turn: number;
	commandIndex: number;
	energy: number;
	player: Fighter;
	enemy: Fighter;
	enemyName: string;
	enemyIntentDamage: number;
	draw: string[];
	hand: string[];
	discard: string[];
	exhaust: string[];
};
export type NodeType = "start" | "combat" | "elite" | "shop" | "event" | "boss";
export type MapNode = {
	id: string;
	rank: number;
	type: NodeType;
	next: string[];
	visited: boolean;
};
export type Reward = {
	id: string;
	cards: string[];
	gold: number;
	claimed: boolean;
};
export type ShopState = {
	id: string;
	inventory: Array<{
		id: string;
		cardId?: string;
		relicId?: RelicId;
		price: number;
		sold: boolean;
	}>;
	left: boolean;
};
export type EventState = { id: "shrine" | "gamble"; settled: boolean };
export type RelicId = "anchor" | "coinPurse" | "ironHeart";
export type RunPhase =
	| "map"
	| "combat"
	| "reward"
	| "shop"
	| "event"
	| "won"
	| "lost";
export type RunState = {
	schemaVersion: number;
	contentVersion: string;
	rulesVersion: string;
	runId: string;
	seed: string;
	rngStreams: RngStreams;
	combat: CombatState;
	phase?: RunPhase;
	map?: MapNode[];
	currentNodeId?: string;
	visited?: string[];
	gold?: number;
	deck?: string[];
	relics?: RelicId[];
	pendingReward?: Reward;
	shop?: ShopState;
	event?: EventState;
};
export type Command =
	| { type: "playCard"; cardInstanceId: string; targetId: string }
	| { type: "endTurn" };
export type DomainEvent = {
	sequence: number;
	resolutionId: string;
	triggerChainId: string;
	type: string;
	detail?: string;
};
export type CommandResult = {
	accepted: boolean;
	run: RunState;
	events: DomainEvent[];
	reason?: string;
};
