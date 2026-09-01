import type { CardDefinition, StatusId, Window, Effect } from './model.ts';

export const CARDS: Record<string, CardDefinition> = {
  strike: { id: 'strike', cost: 1, effects: [{ kind: 'damage', value: 6, target: 'enemy' }] },
  guard: { id: 'guard', cost: 1, effects: [{ kind: 'block', value: 5 }] },
  insight: { id: 'insight', cost: 0, effects: [{ kind: 'draw', value: 2 }] },
  toxin: { id: 'toxin', cost: 1, effects: [{ kind: 'applyStatus', statusId: 'poison', stacks: 2, target: 'enemy' }] },
  doubleCut: { id: 'doubleCut', cost: 1, effects: [{ kind: 'sequence', effects: [{ kind: 'damage', value: 3, target: 'enemy' }, { kind: 'damage', value: 3, target: 'enemy' }] }] },
  execute: { id: 'execute', cost: 2, effects: [{ kind: 'if', predicate: 'targetHasPoison', then: [{ kind: 'damage', value: 10, target: 'enemy' }], else: [{ kind: 'damage', value: 2, target: 'enemy' }] }] },
};

export type Trigger = { id: string; priority: number; window: Window; effects: Effect[] };
export const STATUS_TRIGGERS: Record<StatusId, Trigger[]> = {
  poison: [{ id: 'poison:tick', priority: 0, window: 'TurnEnd', effects: [{ kind: 'damage', value: 0, target: 'enemy' }] }],
  spike: [{ id: 'spike:retaliate', priority: 0, window: 'AfterDamage', effects: [{ kind: 'damage', value: 1, target: 'player' }] }],
};

// Directly reopening a trigger's own window is rejected when content is loaded.
const effectReopensSelfWindow = (effect: Effect, window: string): boolean => {
  if (effect.kind === 'emitWindow') return effect.window === window;
  if (effect.kind === 'sequence') return effect.effects.some((child) => effectReopensSelfWindow(child, window));
  if (effect.kind === 'if') return (effect.then.some((child) => effectReopensSelfWindow(child, window)) || (effect.else ?? []).some((child) => effectReopensSelfWindow(child, window)));
  return false;
};
for (const triggers of Object.values(STATUS_TRIGGERS)) {
  for (const trigger of triggers) {
    if (trigger.effects.some((effect) => effectReopensSelfWindow(effect, trigger.window))) throw new Error(`direct self-trigger: ${trigger.id}`);
  }
}
