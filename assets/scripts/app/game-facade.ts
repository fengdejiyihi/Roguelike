import { CARDS } from "../domain/cards";
import type { Command, RunState } from "../domain/model";
import type { Effect } from "../domain/model";
import type { DomainEvent, Status } from "../domain/model";
import {
	buy,
	chooseEvent,
	claimReward,
	combatCommand,
	leaveShop,
	newRun,
	selectNode,
} from "../domain/run";
import { deserialize, serialize } from "../domain/save";
import type { SaveStorage } from "../domain/save";

export type GameView = {
	phase?: string;
	currentNodeId?: string;
	map: Array<{ id: string; type: string; enabled: boolean }>;
	combat?: {
		playerHp: number;
		playerMaxHp: number;
		playerBlock: number;
		playerStatuses: Status[];
		enemyHp: number;
		enemyMaxHp: number;
		enemyBlock: number;
		enemyStatuses: Status[];
		enemyId: string;
		enemyName: string;
		enemyIntentDamage: number;
		hand: CardView[];
		energy: number;
		drawCount: number;
		discardCount: number;
		exhaustCount: number;
		turn: number;
	};
	gold: number;
	relics: string[];
	reward?: { cards: CardView[]; gold: number };
	shop?: {
		id: string;
		name: string;
		price: number;
		sold: boolean;
		card?: CardView;
	}[];
	event?: string;
	result?: "won" | "lost";
};
export type CardView = {
	instanceId: string;
	cardId: string;
	name: string;
	cost: number;
	preview: string;
	type: "attack" | "skill" | "tactic";
	keywords: string[];
	upgrade?: boolean;
	rarity?: "common";
	playable?: boolean;
};
export type CombatTransition = {
	accepted: boolean;
	before: GameView;
	view: GameView;
	after: GameView;
	events: DomainEvent[];
	reason?: string;
};
const preview = (effect: Effect): string => {
	if (effect.kind === "damage")
		return `damage ${effect.target} ${effect.value}`;
	if (effect.kind === "block") return `block ${effect.value}`;
	if (effect.kind === "draw") return `draw ${effect.value}`;
	if (effect.kind === "applyStatus")
		return `applyStatus ${effect.statusId} ${effect.stacks} ${effect.target}`;
	if (effect.kind === "sequence")
		return `sequence ${effect.effects.map(preview).join(" then ")}`;
	if (effect.kind === "if")
		return `if ${effect.predicate}: then ${effect.then.map(preview).join(" then ")}; else ${(effect.else ?? []).map(preview).join(" then ")}`;
	return effect.window;
};
export function cardView(instanceId: string): CardView {
	const cardId = instanceId.split("#")[0];
	const card = CARDS[cardId];
	if (!card) throw new Error("unknown-card");
	const keywords = Array.from(new Set(card.effects.flatMap(effectKinds)));
	const type = card.effects.some((effect) =>
		effectKinds(effect).includes("damage"),
	)
		? "attack"
		: card.effects.some((effect) => effectKinds(effect).includes("block"))
			? "skill"
			: "tactic";
	return {
		instanceId,
		cardId,
		name: card.id,
		cost: card.cost,
		preview: card.effects.map(preview).join("; "),
		type,
		keywords,
	};
}
const effectKinds = (effect: Effect): string[] => {
	if (effect.kind === "sequence") return effect.effects.flatMap(effectKinds);
	if (effect.kind === "if")
		return [
			effect.predicate,
			...effect.then.flatMap(effectKinds),
			...(effect.else ?? []).flatMap(effectKinds),
		];
	return [effect.kind];
};
export class GameFacade {
	private run?: RunState;
	private generation = 0;
	constructor(private readonly storage: SaveStorage) {}
	newRun(seed: string): GameView {
		this.run = newRun(seed);
		this.generation = 0;
		return this.view();
	}
	resume(): GameView | undefined {
		const raw = this.storage.load();
		if (!raw) return undefined;
		const saved = deserialize(raw);
		this.run = saved.payload;
		this.generation = saved.generation;
		return this.view();
	}
	save(): void {
		if (!this.run) return;
		this.generation += 1;
		this.storage.save(serialize(this.run, this.generation));
	}
	selectNode(id: string): GameView {
		return this.apply(selectNode(this.require(), id));
	}
	playCard(cardInstanceId: string, targetId: string): GameView {
		return this.apply(
			combatCommand(this.require(), {
				type: "playCard",
				cardInstanceId,
				targetId,
			}),
		);
	}
	endTurn(): GameView {
		return this.apply(combatCommand(this.require(), { type: "endTurn" }));
	}
	playCardTransition(
		cardInstanceId: string,
		targetId: string,
	): CombatTransition {
		return this.applyCombat({ type: "playCard", cardInstanceId, targetId });
	}
	endTurnTransition(): CombatTransition {
		return this.applyCombat({ type: "endTurn" });
	}
	chooseReward(cardId?: string): GameView {
		return this.apply(claimReward(this.require(), cardId));
	}
	skipReward(): GameView {
		return this.chooseReward();
	}
	buy(id: string): GameView {
		return this.apply(buy(this.require(), id));
	}
	leaveShop(): GameView {
		return this.apply(leaveShop(this.require()));
	}
	chooseEvent(choice: "accept" | "skip"): GameView {
		return this.apply(chooseEvent(this.require(), choice));
	}
	view(): GameView {
		const run = this.require();
		const next =
			run.map?.find((node) => node.id === run.currentNodeId)?.next ?? [];
		return {
			phase: run.phase,
			currentNodeId: run.currentNodeId,
			gold: run.gold ?? 0,
			relics: [...(run.relics ?? [])],
			map: (run.map ?? []).map((node) => ({
				id: node.id,
				type: node.type,
				enabled: next.includes(node.id),
			})),
			combat: run.phase === "combat" ? this.combatView(run) : undefined,
			reward: run.pendingReward
				? {
						cards: run.pendingReward.cards.map((cardId, index) =>
							cardView(`${cardId}#reward:${run.pendingReward!.id}:${index}`),
						),
						gold: run.pendingReward.gold,
					}
				: undefined,
			shop: run.shop?.inventory.map((item) => ({
				id: item.id,
				name: item.cardId ?? item.relicId ?? item.id,
				price: item.price,
				sold: item.sold,
				card: item.cardId
					? cardView(`${item.cardId}#shop:${item.id}`)
					: undefined,
			})),
			event: run.event?.id,
			result:
				run.phase === "won" || run.phase === "lost" ? run.phase : undefined,
		};
	}
	private apply(result: { accepted: boolean; run: RunState }): GameView {
		if (result.accepted) this.run = result.run;
		return this.view();
	}
	private applyCombat(command: Command): CombatTransition {
		const before = this.viewForCombat();
		const result = combatCommand(this.require(), command);
		if (result.accepted) this.run = result.run;
		const after = this.view();
		return {
			accepted: result.accepted,
			before,
			view: this.viewForCombat(),
			after,
			events: result.events,
			reason: result.reason,
		};
	}
	private viewForCombat(): GameView {
		const view = this.view();
		return {
			...view,
			phase: "combat",
			result: undefined,
			reward: undefined,
			combat: this.combatView(this.require()),
		};
	}
	private combatView(run: RunState): NonNullable<GameView["combat"]> {
		const combat = run.combat;
		return {
			playerHp: combat.player.hp,
			playerMaxHp: combat.player.maxHp,
			playerBlock: combat.player.block,
			playerStatuses: combat.player.statuses.map((status) => ({ ...status })),
			enemyHp: combat.enemy.hp,
			enemyMaxHp: combat.enemy.maxHp,
			enemyBlock: combat.enemy.block,
			enemyStatuses: combat.enemy.statuses.map((status) => ({ ...status })),
			enemyId: combat.enemy.id,
			enemyName: combat.enemyName,
			enemyIntentDamage: combat.enemyIntentDamage,
			hand: combat.hand.map((instanceId) => {
				const card = cardView(instanceId);
				return { ...card, playable: card.cost <= combat.energy };
			}),
			energy: combat.energy,
			drawCount: combat.draw.length,
			discardCount: combat.discard.length,
			exhaustCount: combat.exhaust.length,
			turn: combat.turn,
		};
	}
	private require(): RunState {
		if (!this.run) throw new Error("run-not-started");
		return this.run;
	}
}
