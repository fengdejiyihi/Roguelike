import { Button, Color, Node } from "cc";
import type { GameView } from "../app/game-facade";
import { TOKENS, button, graphics, label, panel } from "./ui-kit";

type ShopItem = NonNullable<GameView["shop"]>[number];
const NAMES: Record<string, { zh: string; en: string }> = {
	strike: { zh: "打击", en: "Strike" },
	guard: { zh: "守备", en: "Guard" },
	insight: { zh: "洞察", en: "Insight" },
	toxin: { zh: "毒液", en: "Toxin" },
	doubleCut: { zh: "双斩", en: "Double Cut" },
	execute: { zh: "处决", en: "Execute" },
	anchor: { zh: "星锚", en: "Star Anchor" },
	coinPurse: { zh: "旅者钱袋", en: "Traveler's Purse" },
	ironHeart: { zh: "钢铁之心", en: "Iron Heart" },
};
export type ShopFeedback = {
	kind: "success" | "insufficient" | "sold";
	text?: string;
};
export type ShopViewOptions = {
	locale: "zh" | "en";
	onBuy: (id: string) => void;
	onLeave: () => void;
	feedback?: ShopFeedback;
};

/** Presentation-only shop shell. Buying and affordability remain Facade concerns. */
export class ShopView {
	readonly node: Node;
	private readonly locale: "zh" | "en";
	constructor(parent: Node, view: GameView, options: ShopViewOptions) {
		this.locale = options.locale;
		this.node = new Node("ShopView");
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		this.background();
		label(
			this.node,
			this.locale === "zh" ? "商店" : "DREAM SHOP",
			0,
			292,
			26,
			TOKENS.gold,
			600,
		);
		label(
			this.node,
			`${this.locale === "zh" ? "金币" : "GOLD"}: ${view.gold}`,
			510,
			292,
			15,
			TOKENS.gold,
			180,
		);
		this.inventory(view.shop ?? [], options);
		this.feedback(options.feedback);
		button(
			this.node,
			this.locale === "zh" ? "离开商店" : "LEAVE SHOP",
			0,
			-305,
			190,
			38,
			options.onLeave,
			new Color(55, 41, 82),
			new Color(173, 139, 187),
		);
	}
	private background(): void {
		const sky = graphics(this.node, "ShopBackgroundPlaceholder");
		sky.fillColor = new Color(19, 17, 51, 255);
		sky.rect(-640, -360, 1280, 720);
		sky.fill();
		panel(
			this.node,
			"ShopFrame",
			0,
			-5,
			1160,
			580,
			new Color(28, 23, 65, 248),
			new Color(91, 78, 127, 230),
			18,
			2,
		);
		const art = graphics(this.node, "ShopArtPlaceholder");
		art.fillColor = new Color(75, 48, 91, 180);
		art.circle(-500, 160, 78);
		art.fill();
	}
	private inventory(items: ShopItem[], options: ShopViewOptions): void {
		const cards = items.filter((item) => item.card);
		const relics = items.filter((item) => !item.card);
		this.section(
			cards,
			-265,
			this.locale === "zh" ? "卡牌商品" : "CARDS",
			options,
		);
		this.section(
			relics,
			220,
			this.locale === "zh" ? "遗物商品" : "RELICS",
			options,
		);
		const remove = button(
			this.node,
			this.locale === "zh"
				? "移除卡牌（暂不可用）"
				: "REMOVE CARD (UNAVAILABLE)",
			0,
			-225,
			350,
			48,
			() => undefined,
			new Color(35, 31, 67),
			new Color(83, 87, 127),
			11,
		);
		remove.getComponent(Button)!.interactable = false;
	}
	private section(
		items: ShopItem[],
		x: number,
		title: string,
		options: ShopViewOptions,
	): void {
		label(this.node, title, x, 238, 14, TOKENS.paper, 390);
		items.slice(0, 3).forEach((item, index) => {
			const y = 80 - index * 112;
			const box = panel(
				this.node,
				"ShopItem",
				x,
				y,
				390,
				94,
				new Color(41, 34, 78),
				item.sold ? TOKENS.locked : TOKENS.gold,
				12,
				1.5,
			);
			const thumb = graphics(box, "ItemThumbnail", -105, 0);
			thumb.fillColor = item.card
				? new Color(192, 146, 112)
				: new Color(111, 91, 160);
			thumb.roundRect(-28, -32, 56, 64, 8);
			thumb.fill();
			label(thumb.node, item.card ? "✦" : "◆", 0, 0, 22, TOKENS.paper, 42);
			label(
				box,
				item.card
					? options.locale === "zh"
						? "卡牌"
						: "CARD"
					: options.locale === "zh"
						? "遗物"
						: "RELIC",
				48,
				23,
				10,
				TOKENS.muted,
				120,
			);
			label(
				box,
				NAMES[item.card?.cardId ?? item.name]?.[options.locale] ?? item.name,
				48,
				3,
				13,
				TOKENS.paper,
				145,
			);
			label(
				box,
				`${item.price} ${options.locale === "zh" ? "金币" : "GOLD"}`,
				48,
				-22,
				10,
				TOKENS.gold,
				145,
			);
			const canBuy = !item.sold;
			const highlighted = canBuy && item.affordable;
			const buyButton = button(
				box,
				item.sold
					? options.locale === "zh"
						? "已售"
						: "SOLD"
					: options.locale === "zh"
						? "购买"
						: "BUY",
				145,
				-2,
				78,
				30,
				() => options.onBuy(item.id),
				highlighted ? new Color(77, 51, 91) : new Color(47, 45, 77),
				highlighted ? TOKENS.gold : TOKENS.locked,
				10,
			);
			buyButton.getComponent(Button)!.interactable = canBuy;
		});
	}
	private feedback(feedback?: ShopFeedback): void {
		if (!feedback) return;
		const text =
			feedback.text ??
			(feedback.kind === "success"
				? this.locale === "zh"
					? "购买成功"
					: "PURCHASED"
				: feedback.kind === "sold"
					? this.locale === "zh"
						? "商品已售出"
						: "SOLD OUT"
					: this.locale === "zh"
						? "金币不足"
						: "INSUFFICIENT GOLD");
		label(
			this.node,
			text,
			0,
			-275,
			12,
			feedback.kind === "success" ? TOKENS.cyan : TOKENS.rose,
			360,
		);
	}
}
