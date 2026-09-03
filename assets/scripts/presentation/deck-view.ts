import { Button, Color, Node } from "cc";
import type { GameView } from "../app/game-facade";
import { CardView } from "./card-view";
import { TOKENS, button, label, panel } from "./ui-kit";

const CARD_NAMES: Record<string, { zh: string; en: string }> = {
	strike: { zh: "打击", en: "Strike" },
	guard: { zh: "守备", en: "Guard" },
	insight: { zh: "洞察", en: "Insight" },
	toxin: { zh: "毒液", en: "Toxin" },
	doubleCut: { zh: "双斩", en: "Double Cut" },
	execute: { zh: "处决", en: "Execute" },
};
const RELIC_NAMES: Record<string, { zh: string; en: string }> = {
	anchor: { zh: "星锚", en: "Star Anchor" },
	coinPurse: { zh: "旅者钱袋", en: "Traveler's Purse" },
	ironHeart: { zh: "钢铁之心", en: "Iron Heart" },
};
const STATUS_NAMES: Record<string, { zh: string; en: string }> = {
	poison: { zh: "中毒", en: "Poison" },
	spike: { zh: "棘刺", en: "Spike" },
};

export type DeckViewOptions = {
	locale: "zh" | "en";
	onBack: () => void;
	selectedCardId?: string;
	onSelectCard?: (id: string) => void;
	onCategory?: (category: "all" | "attack" | "skill" | "tactic") => void;
	category?: "all" | "attack" | "skill" | "tactic";
};
/** Read-only deck inspection. It never mutates the run or applies filters to domain data. */
export class DeckView {
	readonly node: Node;
	private readonly locale: "zh" | "en";
	constructor(parent: Node, view: GameView, options: DeckViewOptions) {
		this.locale = options.locale;
		this.node = new Node("DeckView");
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		panel(
			this.node,
			"DeckBackgroundPlaceholder",
			0,
			0,
			1160,
			650,
			new Color(24, 20, 58),
			new Color(91, 78, 127),
			18,
			2,
		);
		label(
			this.node,
			this.locale === "zh" ? "卡组详情" : "DECK DETAIL",
			-360,
			286,
			24,
			TOKENS.gold,
			400,
		);
		label(
			this.node,
			this.locale === "zh" ? "分类" : "FILTER",
			-360,
			245,
			11,
			TOKENS.muted,
			80,
		);
		(["all", "attack", "skill", "tactic"] as const).forEach(
			(category, index) => {
				const filter = button(
					this.node,
					this.categoryName(category),
					-285 + index * 78,
					245,
					64,
					26,
					() => options.onCategory?.(category),
					new Color(45, 36, 88),
					options.category === category ||
						(!options.category && category === "all")
						? TOKENS.gold
						: TOKENS.muted,
					10,
				);
				filter.getComponent(Button)!.interactable = Boolean(options.onCategory);
			},
		);
		const filtered =
			options.category && options.category !== "all"
				? view.deck.filter((card) => card.type === options.category)
				: view.deck;
		this.cards(filtered, options, view.deck.length);
		this.list(
			this.locale === "zh" ? "遗物" : "RELICS",
			view.relics.map((id) => RELIC_NAMES[id]?.[this.locale] ?? id),
			300,
			145,
		);
		this.list(
			this.locale === "zh" ? "状态 / STATUS" : "STATUS",
			view.playerStatuses.map(
				(status) =>
					`${STATUS_NAMES[status.id]?.[this.locale] ?? status.id} ×${status.stacks}`,
			),
			300,
			-25,
		);
		button(
			this.node,
			this.locale === "zh" ? "返回" : "BACK",
			0,
			-300,
			170,
			38,
			options.onBack,
		);
	}
	private cards(
		cards: GameView["deck"],
		options: DeckViewOptions,
		total = cards.length,
	): void {
		label(
			this.node,
			this.locale === "zh" ? `当前卡组（${total}）` : `CURRENT DECK (${total})`,
			-360,
			207,
			13,
			TOKENS.paper,
			360,
		);
		cards.slice(0, 6).forEach(
			(card, index) =>
				new CardView(
					this.node,
					card,
					-300 + (index % 3) * 150,
					80 - Math.floor(index / 3) * 225,
					0,
					{
						locale: this.locale,
						context: "deck",
						selected: options.selectedCardId === card.instanceId,
						onSelect: () => options.onSelectCard?.(card.instanceId),
					},
				),
		);
		const selected = cards.find(
			(card) => card.instanceId === options.selectedCardId,
		);
		if (selected) {
			const detail = panel(
				this.node,
				"CardDetail",
				300,
				-175,
				420,
				100,
				new Color(45, 36, 82),
				TOKENS.gold,
				10,
				1,
			);
			label(
				detail,
				CARD_NAMES[selected.cardId]?.[this.locale] ?? selected.name,
				0,
				25,
				15,
				TOKENS.paper,
				370,
			);
			label(
				detail,
				this.cardCopy(selected.cardId, selected.type),
				0,
				-8,
				10,
				TOKENS.muted,
				330,
			);
			label(
				detail,
				selected.upgrade ? (this.locale === "zh" ? "已升级" : "UPGRADED") : "",
				0,
				-31,
				9,
				TOKENS.cyan,
				330,
			);
		}
	}
	private categoryName(
		category: "all" | "attack" | "skill" | "tactic",
	): string {
		const names = {
			all: { zh: "全部", en: "ALL" },
			attack: { zh: "攻击", en: "ATTACK" },
			skill: { zh: "技能", en: "SKILL" },
			tactic: { zh: "战术", en: "TACTIC" },
		};
		return names[category][this.locale];
	}
	private cardCopy(id: string, type: string): string {
		const copy: Record<string, { zh: string; en: string }> = {
			strike: { zh: "对敌人造成 6 点伤害", en: "Deal 6 damage." },
			guard: { zh: "获得 5 点格挡", en: "Gain 5 Block." },
			insight: { zh: "抽 2 张牌", en: "Draw 2 cards." },
			toxin: { zh: "施加中毒", en: "Apply poison." },
			doubleCut: { zh: "快速造成两次伤害", en: "Strike twice." },
			execute: { zh: "对受伤目标造成重击", en: "A heavy finishing strike." },
		};
		return (
			copy[id]?.[this.locale] ??
			(this.locale === "zh" ? `${type} 卡牌` : `${type} card`)
		);
	}
	private list(title: string, values: string[], x: number, y: number): void {
		const box = panel(
			this.node,
			"DeckList",
			x,
			y,
			420,
			130,
			new Color(35, 29, 72),
			new Color(91, 78, 127),
			12,
			1,
		);
		label(box, title, 0, 45, 13, TOKENS.gold, 380);
		label(
			box,
			values.join("\n") || (this.locale === "zh" ? "暂无" : "NONE"),
			0,
			8,
			11,
			TOKENS.paper,
			370,
		);
	}
}
