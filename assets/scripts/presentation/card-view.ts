import {
	Button,
	Color,
	Graphics,
	Node,
	UIOpacity,
	UITransform,
	tween,
} from "cc";
import type { CardView as CardData } from "../app/game-facade";
import { TOKENS, graphics, label } from "./ui-kit";

export type CardViewOptions = {
	locale: "zh" | "en";
	selected: boolean;
	onSelect: () => void;
	context?: "combat" | "reward" | "deck";
};

const COPY: Record<
	string,
	{ zh: string; en: string; nameZh: string; nameEn: string }
> = {
	strike: {
		nameZh: "打击",
		nameEn: "Strike",
		zh: "对敌人造成6点伤害",
		en: "Deal 6 damage.",
	},
	guard: {
		nameZh: "守备",
		nameEn: "Guard",
		zh: "获得5点格挡",
		en: "Gain 5 Block.",
	},
	insight: {
		nameZh: "洞察",
		nameEn: "Insight",
		zh: "抽2张牌",
		en: "Draw 2 cards.",
	},
	toxin: {
		nameZh: "毒液",
		nameEn: "Toxin",
		zh: "施加2层中毒",
		en: "Apply 2 Poison.",
	},
	doubleCut: {
		nameZh: "双斩",
		nameEn: "Double Cut",
		zh: "造成2次3点伤害",
		en: "Deal 3 damage twice.",
	},
	execute: {
		nameZh: "处决",
		nameEn: "Execute",
		zh: "目标中毒时：\n造成10点伤害；\n否则造成2点",
		en: "Deal 10 damage if poisoned; otherwise 2.",
	},
};
const TYPE: Record<CardData["type"], { zh: string; en: string }> = {
	attack: { zh: "攻击", en: "ATTACK" },
	skill: { zh: "技能", en: "SKILL" },
	tactic: { zh: "战术", en: "TACTIC" },
};

export class CardView {
	readonly node: Node;
	private readonly baseX: number;
	private readonly baseY: number;
	private readonly selected: boolean;
	private readonly focus: UIOpacity;

	constructor(
		parent: Node,
		data: CardData,
		x: number,
		y: number,
		rotation: number,
		options: CardViewOptions,
	) {
		this.baseX = x;
		this.baseY = y;
		this.selected = options.selected;
		this.node = new Node(`CardView:${data.instanceId}`);
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		this.node.setPosition(x, y + (options.selected ? 22 : 0));
		const scale = options.selected ? 1.08 : 1;
		this.node.setScale(scale, scale, 1);
		this.node.setRotationFromEuler(0, 0, rotation);
		const available = data.playable !== false;
		const copy = COPY[data.cardId] ?? {
			nameZh: "卡牌",
			nameEn: "Card",
			zh: "施展一项行动",
			en: "Perform an action.",
		};
		const colors = this.colors(data.type, available);
		const width = 148;
		const height = 216;
		this.node.addComponent(UITransform).setContentSize(width, height);
		const paper = this.node.addComponent(Graphics);
		paper.fillColor = colors.paper;
		paper.roundRect(-width / 2, -height / 2, width, height, 16);
		paper.fill();
		paper.strokeColor = colors.edge;
		paper.lineWidth = options.selected ? 4 : 2;
		paper.roundRect(-width / 2, -height / 2, width, height, 16);
		paper.stroke();
		const inset = graphics(this.node, "PaperInset");
		inset.strokeColor = new Color(255, 241, 207, available ? 120 : 36);
		inset.lineWidth = 1;
		inset.roundRect(
			-width / 2 + 8,
			-height / 2 + 8,
			width - 16,
			height - 16,
			13,
		);
		inset.stroke();
		this.art(data.cardId, colors.art);
		label(
			this.node,
			TYPE[data.type]?.[options.locale] ?? "CARD",
			0,
			94,
			10,
			colors.accent,
			128,
		);
		label(
			this.node,
			options.locale === "zh" ? copy.nameZh : copy.nameEn,
			0,
			70,
			17,
			colors.ink,
			128,
		);
		const cost = graphics(this.node, "Cost", -57, 82);
		cost.fillColor = colors.accent;
		cost.circle(0, 0, 16);
		cost.fill();
		label(this.node, String(data.cost), -57, 77, 14, TOKENS.ink, 30);
		label(
			this.node,
			this.wrap(options.locale === "zh" ? copy.zh : copy.en, options.locale),
			0,
			-26,
			13,
			colors.ink,
			128,
		);
		if (data.upgrade) label(this.node, "＋", 55, 82, 15, colors.accent, 24);
		if (data.rarity)
			label(
				this.node,
				data.rarity === "common"
					? options.locale === "zh"
						? "普通"
						: "COMMON"
					: data.rarity,
				0,
				-94,
				8,
				colors.muted,
				100,
			);
		if (options.selected)
			label(
				this.node,
				options.context === "reward"
					? options.locale === "zh"
						? "确认领取此卡"
						: "CONFIRM THIS CARD"
					: options.context === "deck"
						? options.locale === "zh"
							? "已选中 · 点击取消"
							: "SELECTED · CLICK TO CLEAR"
						: options.locale === "zh"
							? "再次点击打出"
							: "CLICK AGAIN TO PLAY",
				0,
				-74,
				8,
				colors.accent,
				126,
			);
		if (!available)
			label(
				this.node,
				options.locale === "zh" ? "能量不足" : "NOT ENOUGH ENERGY",
				0,
				-75,
				9,
				colors.muted,
				126,
			);
		const focusNode = new Node("FocusRing");
		this.node.addChild(focusNode);
		focusNode.layer = this.node.layer;
		const focus = focusNode.addComponent(Graphics);
		focus.strokeColor = TOKENS.gold;
		focus.lineWidth = 3;
		focus.roundRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 19);
		focus.stroke();
		this.focus = focusNode.addComponent(UIOpacity);
		this.focus.opacity = options.selected ? 255 : 0;
		this.node.on(Node.EventType.TOUCH_START, () => this.setFocused(true));
		this.node.on(Node.EventType.MOUSE_ENTER, () => this.setFocused(true));
		this.node.on(Node.EventType.TOUCH_END, () =>
			this.setFocused(this.selected),
		);
		this.node.on(Node.EventType.TOUCH_CANCEL, () =>
			this.setFocused(this.selected),
		);
		this.node.on(Node.EventType.MOUSE_LEAVE, () =>
			this.setFocused(this.selected),
		);
		const button = this.node.addComponent(Button);
		button.interactable = available;
		if (available)
			button.node.on(Button.EventType.CLICK, options.onSelect, this);
		const fade = this.node.addComponent(UIOpacity);
		fade.opacity = 0;
		tween(fade).to(0.18, { opacity: 255 }).start();
	}

	private setFocused(focused: boolean): void {
		this.focus.opacity = focused ? 255 : 0;
		const scale = focused || this.selected ? 1.08 : 1;
		this.node.setScale(scale, scale, 1);
		this.node.setPosition(
			this.baseX,
			this.baseY + (focused || this.selected ? 28 : 0),
		);
	}

	private art(cardId: string, fill: Color): void {
		const art = graphics(this.node, "PaperCutArt", 0, 25);
		art.fillColor = fill;
		art.roundRect(-61, -39, 122, 78, 9);
		art.fill();
		art.fillColor = new Color(255, 227, 172, 190);
		for (const [x, y, radius] of [
			[-46, 23, 2],
			[-23, 8, 1],
			[13, 29, 2],
			[44, 10, 1],
			[31, -23, 2],
		] as number[][])
			art.circle(x, y, radius);
		art.fill();
		art.strokeColor = new Color(163, 135, 206, 150);
		art.lineWidth = 1;
		art.moveTo(-49, -15);
		art.lineTo(-11, 22);
		art.lineTo(27, -5);
		art.stroke();
		art.fillColor = new Color(244, 204, 112, 220);
		if (cardId === "guard") art.circle(0, 1, 24);
		else if (cardId === "toxin") {
			art.circle(-17, -2, 16);
			art.circle(17, -2, 16);
		} else if (cardId === "doubleCut") {
			art.moveTo(-30, -24);
			art.lineTo(0, 27);
			art.lineTo(30, -24);
			art.close();
		} else if (cardId === "execute") {
			art.moveTo(0, 30);
			art.lineTo(27, 0);
			art.lineTo(0, -27);
			art.lineTo(-27, 0);
			art.close();
		} else art.circle(0, 0, 25);
		art.fill();
	}

	private colors(
		type: CardData["type"],
		available: boolean,
	): {
		paper: Color;
		edge: Color;
		art: Color;
		accent: Color;
		ink: Color;
		muted: Color;
	} {
		const base =
			type === "attack"
				? [
						new Color(247, 222, 180),
						new Color(166, 98, 112),
						new Color(48, 32, 87),
						new Color(154, 78, 129),
					]
				: type === "skill"
					? [
							new Color(239, 229, 201),
							new Color(80, 128, 160),
							new Color(30, 50, 89),
							new Color(48, 123, 167),
						]
					: [
							new Color(245, 228, 190),
							new Color(151, 116, 78),
							new Color(49, 34, 87),
							new Color(179, 123, 58),
						];
		return {
			paper: available ? base[0] : new Color(174, 174, 163),
			edge: available ? base[1] : new Color(92, 96, 108),
			art: available ? base[2] : new Color(72, 73, 83),
			accent: available ? base[3] : new Color(112, 116, 124),
			ink: available ? new Color(45, 30, 62) : new Color(77, 79, 85),
			muted: available ? new Color(104, 75, 100) : new Color(103, 106, 112),
		};
	}

	private wrap(value: string, locale: "zh" | "en"): string {
		if (value.includes("\n")) return value;
		const limit = locale === "zh" ? 9 : 18;
		if (locale === "zh") {
			const lines: string[] = [];
			for (let i = 0; i < value.length; i += limit)
				lines.push(value.slice(i, i + limit));
			return lines.slice(0, 3).join("\n");
		}
		const lines: string[] = [];
		let line = "";
		for (const word of value.split(/\s+/)) {
			if (line && line.length + word.length + 1 > limit) {
				lines.push(line);
				line = word;
			} else line = line ? `${line} ${word}` : word;
		}
		if (line) lines.push(line);
		return lines.slice(0, 3).join("\n");
	}
}
