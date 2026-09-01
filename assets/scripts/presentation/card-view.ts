import {
	Button,
	Color,
	Graphics,
	Label,
	Node,
	UIOpacity,
	UITransform,
	tween,
} from "cc";
import type { CardView as CardData } from "../app/game-facade";

export type CardViewOptions = {
	locale: "zh" | "en";
	selected: boolean;
	onSelect: () => void;
};

const NAMES: Record<string, { zh: string; en: string }> = {
	strike: { zh: "打击", en: "Strike" },
	guard: { zh: "守备", en: "Guard" },
	insight: { zh: "洞察", en: "Insight" },
	toxin: { zh: "毒液", en: "Toxin" },
	doubleCut: { zh: "双斩", en: "Double Cut" },
	execute: { zh: "处决", en: "Execute" },
};
const TYPE: Record<string, { zh: string; en: string }> = {
	attack: { zh: "攻击", en: "ATTACK" },
	skill: { zh: "技能", en: "SKILL" },
	tactic: { zh: "战术", en: "TACTIC" },
};

export class CardView {
	readonly node: Node;
	private readonly focus: UIOpacity;
	private readonly x: number;
	private readonly y: number;
	private readonly selected: boolean;
	constructor(
		parent: Node,
		data: CardData,
		x: number,
		y: number,
		rotation: number,
		options: CardViewOptions,
	) {
		this.x = x;
		this.y = y;
		this.selected = options.selected;
		this.node = new Node(`CardView:${data.instanceId}`);
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		this.node.setPosition(x, y + (options.selected ? 24 : 0));
		this.node.setRotationFromEuler(0, 0, rotation);
		const available = data.playable !== false;
		const palette = this.palette(data.type, available);
		const width = 148;
		const height = 216;
		const frame = this.node.addComponent(UITransform);
		frame.setContentSize(width, height);
		const paper = this.node.addComponent(Graphics);
		paper.fillColor = palette.paper;
		paper.roundRect(-width / 2, -height / 2, width, height, 18);
		paper.fill();
		paper.strokeColor = palette.edge;
		paper.lineWidth = 3;
		paper.stroke();
		const inner = this.graphics(this.node, "PaperInset");
		inner.strokeColor = new Color(255, 236, 198, available ? 100 : 35);
		inner.lineWidth = 1;
		inner.roundRect(
			-width / 2 + 7,
			-height / 2 + 7,
			width - 14,
			height - 14,
			13,
		);
		inner.stroke();
		const art = this.graphics(this.node, "ArtworkPlaceholder", 0, 28);
		art.fillColor = palette.art;
		art.circle(0, 0, 40);
		art.fill();
		art.fillColor = new Color(255, 244, 206, 105);
		art.circle(-11, 9, 6);
		art.circle(14, -7, 4);
		art.fill();
		this.label(TYPE[data.type][options.locale], 0, 92, 12, palette.accent);
		this.label(
			NAMES[data.cardId]?.[options.locale] ?? data.name,
			0,
			68,
			18,
			palette.ink,
		);
		const cost = this.graphics(this.node, "Cost", -57, 82);
		cost.fillColor = palette.accent;
		cost.circle(0, 0, 16);
		cost.fill();
		this.label(String(data.cost), -57, 77, 14, new Color(40, 24, 56));
		this.label(
			this.wrap(
				this.localizedPreview(data.preview, options.locale),
				options.locale,
			),
			0,
			-25,
			11,
			palette.ink,
		);
		this.label(
			data.keywords.slice(0, 2).join(" · "),
			0,
			-79,
			9,
			palette.accent,
		);
		if (data.upgrade) this.label("＋", 55, 82, 15, palette.accent);
		if (!available)
			this.label(
				options.locale === "zh" ? "能量不足" : "NOT ENOUGH ENERGY",
				0,
				-99,
				9,
				palette.muted,
			);
		const focusNode = new Node("FocusRing");
		this.node.addChild(focusNode);
		focusNode.layer = this.node.layer;
		const focusShape = focusNode.addComponent(Graphics);
		focusShape.strokeColor = new Color(255, 241, 167);
		focusShape.lineWidth = 4;
		focusShape.roundRect(
			-width / 2 - 3,
			-height / 2 - 3,
			width + 6,
			height + 6,
			20,
		);
		focusShape.stroke();
		this.focus = focusNode.addComponent(UIOpacity);
		this.focus.opacity = options.selected ? 255 : 0;
		this.node.on(Node.EventType.TOUCH_START, () => {
			this.focus.opacity = 255;
			this.lift(true);
		});
		this.node.on(Node.EventType.MOUSE_ENTER, () => {
			this.focus.opacity = 255;
			this.lift(true);
		});
		this.node.on(Node.EventType.MOUSE_LEAVE, () => {
			this.focus.opacity = options.selected ? 255 : 0;
			this.lift(options.selected);
		});
		const button = this.node.addComponent(Button);
		button.interactable = available;
		if (available)
			button.node.on(Button.EventType.CLICK, options.onSelect, this);
		const fade = this.node.addComponent(UIOpacity);
		fade.opacity = 0;
		tween(fade).to(0.18, { opacity: 255 }).start();
	}
	private lift(focused: boolean): void {
		this.node.setPosition(this.x, this.y + (focused || this.selected ? 24 : 0));
	}
	private palette(
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
		const colors =
			type === "attack"
				? [
						new Color(69, 43, 85),
						new Color(224, 126, 137),
						new Color(177, 100, 169),
						new Color(255, 210, 164),
					]
				: type === "skill"
					? [
							new Color(38, 66, 106),
							new Color(120, 188, 220),
							new Color(80, 151, 195),
							new Color(208, 232, 250),
						]
					: [
							new Color(77, 57, 80),
							new Color(226, 175, 91),
							new Color(151, 110, 182),
							new Color(255, 230, 174),
						];
		return {
			paper: available ? colors[0] : new Color(39, 45, 58),
			edge: available ? colors[1] : new Color(87, 93, 104),
			art: available ? colors[2] : new Color(76, 82, 94),
			accent: available ? colors[3] : new Color(139, 145, 151),
			ink: available ? new Color(250, 241, 220) : new Color(153, 159, 166),
			muted: new Color(191, 157, 167),
		};
	}
	private graphics(parent: Node, name: string, x = 0, y = 0): Graphics {
		const node = new Node(name);
		parent.addChild(node);
		node.layer = parent.layer;
		node.setPosition(x, y);
		return node.addComponent(Graphics);
	}
	private label(
		value: string,
		x: number,
		y: number,
		size: number,
		color: Color,
	): void {
		const node = new Node("Label");
		this.node.addChild(node);
		node.layer = this.node.layer;
		node.setPosition(x, y);
		const transform = node.addComponent(UITransform);
		transform.setContentSize(132, size + 8);
		const label = node.addComponent(Label);
		label.string = value;
		label.fontSize = size;
		label.lineHeight = Math.max(size + 4, 15);
		label.color = color;
	}
	private localizedPreview(value: string, locale: "zh" | "en"): string {
		if (locale === "en") return value;
		return value
			.replace(/damage enemy (\d+)/g, "对敌人造成 $1 点伤害")
			.replace(/damage player (\d+)/g, "对自己造成 $1 点伤害")
			.replace(/block (\d+)/g, "获得 $1 点格挡")
			.replace(/draw (\d+)/g, "抽 $1 张牌")
			.replace(/applyStatus (\w+) (\d+) enemy/g, "使敌人获得 $2 层 $1")
			.replace(/sequence /g, "依次 ")
			.replace(/ then /g, "，然后")
			.replace(/if targetHasPoison: then /g, "若目标中毒：")
			.replace(/; else /g, "；否则")
			.replace(/if /g, "若")
			.replace(/targetHasPoison/g, "目标中毒");
	}
	private wrap(value: string, locale: "zh" | "en"): string {
		const limit = locale === "zh" ? 11 : 19;
		if (locale === "en") {
			const lines: string[] = [];
			let line = "";
			for (const word of value.split(/\s+/)) {
				if (!word) continue;
				if (line && line.length + word.length + 1 > limit) {
					lines.push(line);
					line = word;
				} else line = line ? `${line} ${word}` : word;
			}
			if (line) lines.push(line);
			return lines.slice(0, 3).join("\n");
		}
		const lines: string[] = [];
		for (let index = 0; index < value.length; index += limit)
			lines.push(value.slice(index, index + limit));
		return lines.slice(0, 3).join("\n");
	}
}
