export const RULES_VERSION = 'phase-2.0';
export const MAX_TRIGGER_DEPTH = 32;
export const MAX_RESOLUTION_STEPS = 1024;

export type RngState = { state: number };
export type RngStreams = { mapRng: RngState; combatRng: RngState; rewardRng: RngState; eventRng: RngState };
export type StatusId = 'poison' | 'spike';
export type Window = 'CombatStart' | 'TurnStart' | 'CardPlayed' | 'AfterDamage' | 'TurnEnd';
export type Effect =
  | { kind: 'damage'; value: number; target: 'enemy' | 'player' }
  | { kind: 'block'; value: number }
  | { kind: 'draw'; value: number }
  | { kind: 'applyStatus'; statusId: StatusId; stacks: number; target: 'enemy' | 'player' }
  | { kind: 'sequence'; effects: Effect[] }
  | { kind: 'if'; predicate: 'targetHasPoison'; then: Effect[]; else?: Effect[] }
  | { kind: 'emitWindow'; window: Window };
export type CardDefinition = { id: string; cost: number; effects: Effect[] };
export type Status = { id: StatusId; stacks: number };
export type Fighter = { id: string; hp: number; maxHp: number; block: number; statuses: Status[] };
export type CombatState = {
  id: string; phase: 'AwaitPlayerAction' | 'Victory' | 'Defeat'; turn: number; commandIndex: number; energy: number;
  player: Fighter; enemy: Fighter; draw: string[]; hand: string[]; discard: string[]; exhaust: string[];
};
export type RunState = { schemaVersion: number; contentVersion: string; rulesVersion: string; runId: string; seed: string; rngStreams: RngStreams; combat: CombatState };
export type Command = { type: 'playCard'; cardInstanceId: string; targetId: string } | { type: 'endTurn' };
export type DomainEvent = { sequence: number; resolutionId: string; triggerChainId: string; type: string; detail?: string };
export type CommandResult = { accepted: boolean; run: RunState; events: DomainEvent[]; reason?: string };
