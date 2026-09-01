import type { CardDefinition, Effect, StatusId, Window } from "./model";

export const CARDS: Record<string, CardDefinition> = {
	strike: {
		id: "strike",
		cost: 1,
		effects: [{ kind: "damage", value: 6, target: "enemy" }],
	},
	guard: { id: "guard", cost: 1, effects: [{ kind: "block", value: 5 }] },
	insight: { id: "insight", cost: 0, effects: [{ kind: "draw", value: 2 }] },
	toxin: {
		id: "toxin",
		cost: 1,
		effects: [
			{ kind: "applyStatus", statusId: "poison", stacks: 2, target: "enemy" },
		],
	},
	doubleCut: {
		id: "doubleCut",
		cost: 1,
		effects: [
			{
				kind: "sequence",
				effects: [
					{ kind: "damage", value: 3, target: "enemy" },
					{ kind: "damage", value: 3, target: "enemy" },
				],
			},
		],
	},
	execute: {
		id: "execute",
		cost: 2,
		effects: [
			{
				kind: "if",
				predicate: "targetHasPoison",
				then: [{ kind: "damage", value: 10, target: "enemy" }],
				else: [{ kind: "damage", value: 2, target: "enemy" }],
			},
		],
	},
};

export function validateCardDefinitions(
	cards: Record<string, CardDefinition>,
): void {
	for (const [key, card] of Object.entries(cards)) {
		if (
			!key ||
			!card ||
			card.id !== key ||
			!Number.isInteger(card.cost) ||
			card.cost < 0 ||
			!Array.isArray(card.effects) ||
			card.effects.length === 0
		)
			invalid(key, "definition", "id-cost-or-effects");
		for (const [index, effect] of card.effects.entries())
			validateEffect(effect, key, `effects[${index}]`);
	}
}

function invalid(key: string, path: string, reason: string): never {
	throw new Error(`invalid-card:${key || "<empty>"}:${path}:${reason}`);
}
function validateEffect(effect: Effect, key: string, path: string): void {
	const validTarget = (target: unknown) =>
		target === "enemy" || target === "player";
	const validInteger = (value: unknown) =>
		Number.isFinite(value) && Number.isInteger(value) && (value as number) >= 0;
	if (!effect || typeof effect !== "object") invalid(key, path, "not-object");
	if (effect.kind === "damage") {
		if (!validInteger(effect.value) || !validTarget(effect.target))
			invalid(key, path, "damage-value-or-target");
		return;
	}
	if (effect.kind === "block" || effect.kind === "draw") {
		if (!validInteger(effect.value)) invalid(key, path, "value");
		return;
	}
	if (effect.kind === "applyStatus") {
		if (
			!validInteger(effect.stacks) ||
			!validTarget(effect.target) ||
			!["poison", "spike"].includes(effect.statusId)
		)
			invalid(key, path, "status-stacks-or-target");
		return;
	}
	if (effect.kind === "sequence") {
		if (!Array.isArray(effect.effects) || effect.effects.length === 0)
			invalid(key, path, "sequence-empty");
		for (const [index, child] of effect.effects.entries())
			validateEffect(child, key, `${path}.effects[${index}]`);
		return;
	}
	if (effect.kind === "if") {
		if (
			effect.predicate !== "targetHasPoison" ||
			!Array.isArray(effect.then) ||
			effect.then.length === 0 ||
			(effect.else && effect.else.length === 0)
		)
			invalid(key, path, "predicate-or-branches");
		for (const [index, child] of effect.then
			.concat(effect.else ?? [])
			.entries())
			validateEffect(child, key, `${path}.branch[${index}]`);
		return;
	}
	if (
		effect.kind === "emitWindow" &&
		[
			"CombatStart",
			"TurnStart",
			"CardPlayed",
			"AfterDamage",
			"TurnEnd",
		].includes(effect.window)
	)
		return;
	invalid(key, path, "kind-or-window");
}

validateCardDefinitions(CARDS);

export type Trigger = {
	id: string;
	priority: number;
	window: Window;
	effects: Effect[];
};
export const STATUS_TRIGGERS: Record<StatusId, Trigger[]> = {
	poison: [
		{
			id: "poison:tick",
			priority: 0,
			window: "TurnEnd",
			effects: [{ kind: "damage", value: 0, target: "enemy" }],
		},
	],
	spike: [
		{
			id: "spike:retaliate",
			priority: 0,
			window: "AfterDamage",
			effects: [{ kind: "damage", value: 1, target: "player" }],
		},
	],
};

// Directly reopening a trigger's own window is rejected when content is loaded.
const effectReopensSelfWindow = (effect: Effect, window: string): boolean => {
	if (effect.kind === "emitWindow") return effect.window === window;
	if (effect.kind === "sequence")
		return effect.effects.some((child) =>
			effectReopensSelfWindow(child, window),
		);
	if (effect.kind === "if")
		return (
			effect.then.some((child) => effectReopensSelfWindow(child, window)) ||
			(effect.else ?? []).some((child) =>
				effectReopensSelfWindow(child, window),
			)
		);
	return false;
};
for (const triggers of Object.values(STATUS_TRIGGERS)) {
	for (const trigger of triggers) {
		if (
			trigger.effects.some((effect) =>
				effectReopensSelfWindow(effect, trigger.window),
			)
		)
			throw new Error(`direct self-trigger: ${trigger.id}`);
	}
}
