import { CARDS, STATUS_TRIGGERS } from './cards.ts';
import { MAX_RESOLUTION_STEPS, MAX_TRIGGER_DEPTH, RULES_VERSION } from './model.ts';
import type { Command, CommandResult, CombatState, DomainEvent, Effect, Fighter, RunState, StatusId, Window } from './model.ts';
import { deriveRngStreams, shuffle } from './rng.ts';

class ResolutionFault extends Error {}
type Resolution = { id: string; chainId: string; events: DomainEvent[]; steps: number; stack: string[] };

const deck = ['strike', 'strike', 'strike', 'guard', 'guard', 'insight', 'toxin', 'doubleCut', 'execute', 'execute'];
const cardId = (instance: string) => instance.split('#')[0];
const event = (resolution: Resolution, type: string, detail?: string) => resolution.events.push({ sequence: resolution.events.length, resolutionId: resolution.id, triggerChainId: resolution.chainId, type, detail });
const fighter = (id: string, hp: number): Fighter => ({ id, hp, maxHp: hp, block: 0, statuses: [] });

export function createRun(seed: string, rulesVersion = RULES_VERSION): RunState {
  const rngStreams = deriveRngStreams(seed, rulesVersion);
  const draw = shuffle(deck.map((id, index) => `${id}#${index}`), rngStreams.combatRng);
  const run: RunState = { schemaVersion: 1, contentVersion: 'phase-2', rulesVersion, runId: `run:${seed}`, seed, rngStreams,
    combat: { id: `combat:${seed}`, phase: 'AwaitPlayerAction', turn: 1, commandIndex: 0, energy: 3, player: fighter('player', 40), enemy: fighter('enemy:0', 30), draw, hand: [], discard: [], exhaust: [] } };
  drawCards(run, 5, undefined);
  return run;
}

export function stateDigest(run: RunState): string {
  const stable = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
    if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
    return JSON.stringify(value);
  };
  let hash = 2166136261;
  for (const character of stable(run)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function executeCommand(run: RunState, command: Command): CommandResult {
  const draft = structuredClone(run);
  const combat = draft.combat;
  const resolution: Resolution = { id: `${combat.id}:${combat.commandIndex + 1}`, chainId: `${combat.id}:${combat.commandIndex + 1}:0`, events: [], steps: 0, stack: [] };
  if (combat.phase !== 'AwaitPlayerAction') return rejected(run, resolution, 'combat-not-active');
  try {
    combat.commandIndex += 1;
    switch (command.type) {
      case 'playCard': play(draft, command, resolution); break;
      case 'endTurn': endTurn(draft, resolution); break;
      default: throw new ResolutionFault('unknown-command');
    }
    terminal(combat, resolution);
    return { accepted: true, run: draft, events: resolution.events };
  } catch (error) {
    if (error instanceof ResolutionFault) return rejected(run, resolution, error.message);
    throw error;
  }
}

function rejected(run: RunState, resolution: Resolution, reason: string): CommandResult {
  return { accepted: false, run, events: [{ sequence: 0, resolutionId: resolution.id, triggerChainId: resolution.chainId, type: 'ResolutionRejected', detail: reason }], reason };
}

function play(run: RunState, command: Extract<Command, { type: 'playCard' }>, resolution: Resolution): void {
  const combat = run.combat;
  if (command.targetId !== combat.enemy.id) throw new ResolutionFault('invalid-target');
  const handIndex = combat.hand.indexOf(command.cardInstanceId);
  const card = handIndex < 0 ? undefined : CARDS[cardId(command.cardInstanceId)];
  if (!card) throw new ResolutionFault('card-not-in-hand');
  if (combat.energy < card.cost) throw new ResolutionFault('insufficient-energy');
  combat.energy -= card.cost; combat.hand.splice(handIndex, 1); combat.discard.push(command.cardInstanceId);
  event(resolution, 'CardPlayed', card.id); resolveEffects(run, card.effects, resolution); resolveWindow(run, 'CardPlayed', resolution); terminal(combat, resolution);
}

function endTurn(run: RunState, resolution: Resolution): void {
  const combat = run.combat;
  event(resolution, 'TurnEnded'); resolveWindow(run, 'TurnEnd', resolution); terminal(combat, resolution);
  if (combat.phase !== 'AwaitPlayerAction') return;
  combat.hand.forEach((card) => combat.discard.push(card)); combat.hand = []; combat.player.block = 0;
  resolveEffects(run, [{ kind: 'damage', value: 4, target: 'player' }], resolution); event(resolution, 'EnemyActed', '4'); terminal(combat, resolution);
  if (combat.phase !== 'AwaitPlayerAction') return;
  combat.turn += 1; combat.energy = 3; drawCards(run, 5, resolution); resolveWindow(run, 'TurnStart', resolution);
}

function resolveEffects(run: RunState, effects: Effect[], resolution: Resolution): void {
  for (const effect of effects) {
    countResolutionStep(resolution);
    const combat = run.combat;
    if (effect.kind === 'sequence') resolveEffects(run, effect.effects, resolution);
    else if (effect.kind === 'if') resolveEffects(run, hasStatus(combat.enemy, 'poison') ? effect.then : effect.else ?? [], resolution);
    else if (effect.kind === 'draw') drawCards(run, effect.value, resolution);
    else if (effect.kind === 'block') { combat.player.block += effect.value; event(resolution, 'BlockGained', String(effect.value)); }
    else if (effect.kind === 'applyStatus') { const target = effect.target === 'enemy' ? combat.enemy : combat.player; addStatus(target, effect.statusId, effect.stacks); event(resolution, 'StatusApplied', effect.statusId); }
    else if (effect.kind === 'emitWindow') resolveWindow(run, effect.window, resolution);
    else if (effect.kind === 'damage') { const target = effect.target === 'enemy' ? combat.enemy : combat.player; const damage = effect.value || (hasStatus(target, 'poison') ? statusStacks(target, 'poison') : 0); dealDamage(target, damage, resolution); resolveWindow(run, 'AfterDamage', resolution); }
    terminal(combat, resolution);
    if (combat.phase !== 'AwaitPlayerAction') return;
  }
}

function countResolutionStep(resolution: Resolution): void {
  resolution.steps += 1;
  if (resolution.steps > MAX_RESOLUTION_STEPS) throw new ResolutionFault('resolution-step-limit');
}

function resolveWindow(run: RunState, window: Window, resolution: Resolution): void {
  const combat = run.combat;
  const triggers = [combat.player, combat.enemy].flatMap((owner, ownerOrder) => owner.statuses.flatMap((status) => STATUS_TRIGGERS[status.id]
    .filter((trigger) => trigger.window === window).map((trigger) => ({ owner, ownerOrder, status, trigger }))));
  for (const { owner, status, trigger } of triggers.sort((left, right) => left.trigger.priority - right.trigger.priority || left.ownerOrder - right.ownerOrder || (left.trigger.id < right.trigger.id ? -1 : left.trigger.id > right.trigger.id ? 1 : 0))) {
    countResolutionStep(resolution);
    const key = `${owner.id}:${trigger.id}:${window}`;
    if (resolution.stack.includes(key)) throw new ResolutionFault('trigger-cycle');
    if (resolution.stack.length >= MAX_TRIGGER_DEPTH) throw new ResolutionFault('trigger-depth-limit');
    resolution.stack.push(key); event(resolution, 'TriggerResolved', key);
    const effects = trigger.effects.map((effect) => effect.kind === 'damage' && effect.value === 0 ? { ...effect, value: status.stacks } : effect);
    resolveEffects(run, effects, resolution); resolution.stack.pop();
  }
}

function drawCards(run: RunState, count: number, resolution?: Resolution): void {
  const combat = run.combat;
  for (let index = 0; index < count; index += 1) {
    if (combat.draw.length === 0 && combat.discard.length > 0) { combat.draw = shuffle(combat.discard, run.rngStreams.combatRng); combat.discard = []; if (resolution) event(resolution, 'DiscardShuffled'); }
    const card = combat.draw.pop(); if (!card) return;
    combat.hand.push(card); if (resolution) event(resolution, 'CardDrawn', cardId(card));
  }
}

function addStatus(target: Fighter, id: StatusId, stacks: number): void { const existing = target.statuses.find((status) => status.id === id); if (existing) existing.stacks += stacks; else target.statuses.push({ id, stacks }); }
function hasStatus(target: Fighter, id: StatusId): boolean { return target.statuses.some((status) => status.id === id); }
function statusStacks(target: Fighter, id: StatusId): number { return target.statuses.find((status) => status.id === id)?.stacks ?? 0; }
function dealDamage(target: Fighter, raw: number, resolution: Resolution): void { const damage = Math.max(0, raw - target.block); target.block = Math.max(0, target.block - raw); target.hp -= damage; event(resolution, 'DamageDealt', `${target.id}:${damage}`); }
function terminal(combat: CombatState, resolution: Resolution): void { if (combat.phase !== 'AwaitPlayerAction') return; if (combat.enemy.hp <= 0) { combat.phase = 'Victory'; event(resolution, 'CombatWon'); } else if (combat.player.hp <= 0) { combat.phase = 'Defeat'; event(resolution, 'CombatLost'); } }
