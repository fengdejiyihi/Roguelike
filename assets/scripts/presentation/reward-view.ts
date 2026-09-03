import { Button, Color, Graphics, Node, UITransform } from "cc";
import type { GameView } from "../app/game-facade";
import { CardView } from "./card-view";
import { TOKENS, button, graphics, label, panel, pauseMenu } from "./ui-kit";

type RewardData = NonNullable<GameView["reward"]>;

export type RewardViewOptions = {
	locale: "zh" | "en";
	selectedCardId?: string;
	onLanguage: () => void;
	onNewRun: () => void;
	onSave: () => void;
	onSelectCard: (id: string) => void;
	onConfirm: (id: string) => void;
	onSkip: () => void;
};

const RELICS: Record<
	string,
	{ name: string; nameEn: string; zh: string; en: string }
> = {
	anchor: {
		name: "星锚",
		nameEn: "Star Anchor",
		zh: "每场战斗开始时获得 3 点格挡。",
		en: "Gain 3 Block at the start of each combat.",
	},
	coinPurse: {
		name: "旅者钱袋",
		nameEn: "Traveler's Purse",
		zh: "获得时额外获得 10 金币。",
		en: "Gain 10 additional gold when acquired.",
	},
	ironHeart: {
		name: "钢铁之心",
		nameEn: "Iron Heart",
		zh: "每场战斗开始时恢复 3 点生命。",
		en: "Recover 3 HP at the start of each combat.",
	},
};

/** Reward presentation only: selection is local until the user confirms. */
export class RewardView {
	readonly node: Node;
	private readonly locale: "zh" | "en";

	constructor(
		parent: Node,
		view: GameView,
		reward: RewardData,
		options: RewardViewOptions,
	) {
		this.locale = options.locale;
		this.node = new Node("RewardView");
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		this.background();
		this.hud(view, options);
		this.content(reward, options);
	}

	private background(): void {
		const sky = graphics(this.node, "RewardDreamBackdropPlaceholder");
		sky.fillColor = new Color(17, 18, 57, 255);
		sky.rect(-640, -360, 1280, 720);
		sky.fill();
		for (const [y, color] of [
			[280, new Color(47, 34, 88, 255)],
			[190, new Color(57, 39, 104, 255)],
			[100, new Color(40, 38, 91, 255)],
		] as Array<[number, Color]>) {
			sky.fillColor = color;
			sky.rect(-640, y - 45, 1280, 90);
			sky.fill();
		}
		const stars = graphics(this.node, "RewardStarsPlaceholder");
		stars.fillColor = new Color(255, 224, 167, 180);
		for (const [x, y, radius] of [
			[-560, 246, 2],
			[-410, 320, 1],
			[-160, 290, 2],
			[140, 324, 1],
			[410, 265, 2],
			[580, 220, 1],
			[-520, -280, 1],
			[520, -300, 2],
		] as number[][])
			stars.circle(x, y, radius);
		stars.fill();
		panel(
			this.node,
			"RewardFrame",
			0,
			-10,
			1160,
			570,
			new Color(11, 18, 42, 248),
			new Color(73, 77, 116, 230),
			18,
			3,
		);
		panel(
			this.node,
			"RewardPaper",
			0,
			-20,
			1040,
			475,
			new Color(34, 27, 70, 245),
			new Color(108, 82, 131, 210),
			16,
			1,
		);
	}

	private hud(view: GameView, options: RewardViewOptions): void {
		const bar = panel(
			this.node,
			"GameHUD",
			0,
			314,
			1120,
			48,
			new Color(8, 15, 33, 246),
			new Color(69, 85, 112, 210),
			14,
			1,
		);
		const avatar = graphics(bar, "Avatar", -522, 0);
		avatar.fillColor = new Color(213, 190, 166, 255);
		avatar.circle(0, 0, 16);
		avatar.fill();
		avatar.strokeColor = new Color(244, 222, 184, 220);
		avatar.lineWidth = 2;
		avatar.circle(0, 0, 13);
		avatar.stroke();
		label(
			bar,
			this.locale === "zh" ? "旅梦者" : "DREAMER",
			-476,
			7,
			12,
			TOKENS.paper,
			80,
		);
		label(
			bar,
			`${this.locale === "zh" ? "生命" : "HP"} ${view.playerHp}/${view.playerMaxHp}`,
			-476,
			-11,
			10,
			new Color(245, 132, 145),
			80,
		);
		this.chip(
			bar,
			this.locale === "zh" ? "金币" : "GOLD",
			String(view.gold),
			-344,
			TOKENS.gold,
		);
		const relicText =
			view.relics
				.slice(0, 3)
				.map(
					(id) =>
						`✦ ${RELICS[id]?.[this.locale === "zh" ? "name" : "nameEn"] ?? id}`,
				)
				.join("  ") || (this.locale === "zh" ? "暂无遗物" : "NO RELICS");
		label(bar, relicText, -112, 0, 10, new Color(206, 194, 172), 245);
		label(
			bar,
			this.locale === "zh" ? "奖励阶段" : "REWARD",
			220,
			0,
			11,
			TOKENS.paper,
			180,
		);
		button(
			bar,
			"⚙",
			520,
			0,
			42,
			34,
			() => pauseMenu(this.node, this.locale, options),
			new Color(24, 35, 55),
			TOKENS.paper,
			16,
		);
	}

	private chip(
		parent: Node,
		title: string,
		value: string,
		x: number,
		accent: Color,
	): void {
		const chip = panel(
			parent,
			"Chip",
			x,
			0,
			100,
			34,
			new Color(20, 31, 51),
			new Color(74, 91, 111),
			9,
			1,
		);
		label(chip, title, -21, 4, 8, accent, 42);
		label(chip, value, 25, 0, 14, TOKENS.paper, 36);
	}

	private content(reward: RewardData, options: RewardViewOptions): void {
		label(
			this.node,
			this.locale === "zh" ? "战利品" : "TREASURE",
			0,
			248,
			25,
			TOKENS.gold,
			480,
		);
		label(
			this.node,
			reward.relicId
				? this.locale === "zh"
					? "从梦境中带走一张卡牌；金币与遗物将一并收下"
					: "TAKE ONE CARD; GOLD AND RELIC ARE GRANTED TOGETHER"
				: this.locale === "zh"
					? "从梦境中带走一张卡牌；金币将一并收下"
					: "TAKE ONE CARD; GOLD IS GRANTED TOGETHER",
			0,
			217,
			10,
			new Color(205, 186, 211),
			760,
		);
		const cards = reward.cards.slice(0, 3);
		for (let index = 0; index < cards.length; index += 1) {
			const card = cards[index];
			new CardView(this.node, card, (index - 1) * 250, 25, (index - 1) * -3, {
				locale: this.locale,
				selected: options.selectedCardId === card.cardId,
				onSelect: () => options.onSelectCard(card.cardId),
				context: "reward",
			});
		}
		this.guaranteedGold(reward.gold);
		this.relic(reward.relicId);
		this.actionButton(
			this.locale === "zh" ? "确认领取" : "CONFIRM",
			-86,
			-207,
			180,
			Boolean(options.selectedCardId),
			() => options.selectedCardId && options.onConfirm(options.selectedCardId),
		);
		this.actionButton(
			this.locale === "zh" ? "跳过卡牌" : "SKIP CARD",
			126,
			-207,
			180,
			true,
			options.onSkip,
			new Color(55, 41, 82),
			new Color(173, 139, 187),
		);
	}

	private guaranteedGold(amount: number): void {
		const box = panel(
			this.node,
			"GuaranteedGold",
			-430,
			-168,
			190,
			76,
			new Color(49, 34, 76, 240),
			new Color(255, 215, 132, 150),
			12,
			1,
		);
		label(
			box,
			this.locale === "zh" ? "必得金币" : "GUARANTEED GOLD",
			0,
			20,
			9,
			TOKENS.gold,
			170,
		);
		label(box, `+${amount}`, 0, -10, 22, TOKENS.paper, 170);
	}

	private relic(relicId?: string): void {
		const data = relicId ? RELICS[relicId] : undefined;
		const box = panel(
			this.node,
			"RewardRelic",
			430,
			-168,
			230,
			76,
			new Color(49, 34, 76, 240),
			new Color(183, 137, 214, 150),
			12,
			1,
		);
		if (!data) {
			label(
				box,
				this.locale === "zh" ? "本次没有遗物奖励" : "NO RELIC THIS TIME",
				0,
				14,
				10,
				TOKENS.paper,
				210,
			);
			label(
				box,
				this.locale === "zh" ? "继续远征" : "CONTINUE THE DREAM",
				0,
				-12,
				8,
				new Color(190, 174, 202),
				210,
			);
			return;
		}
		label(
			box,
			this.locale === "zh" ? "梦境遗物" : "DREAM RELIC",
			0,
			23,
			8,
			TOKENS.gold,
			210,
		);
		label(
			box,
			this.locale === "zh" ? data.name : data.nameEn,
			0,
			6,
			13,
			TOKENS.paper,
			210,
		);
		label(
			box,
			this.locale === "zh" ? data.zh : data.en,
			0,
			-16,
			8,
			new Color(213, 197, 216),
			216,
		);
	}

	private actionButton(
		value: string,
		x: number,
		y: number,
		width: number,
		enabled: boolean,
		action: () => void,
		fill = new Color(84, 54, 98),
		stroke = TOKENS.gold,
	): void {
		const node = panel(
			this.node,
			"RewardAction",
			x,
			y,
			width,
			38,
			enabled ? fill : new Color(39, 35, 60),
			enabled ? stroke : new Color(91, 87, 112),
			10,
			1.5,
		);
		label(
			node,
			value,
			0,
			0,
			11,
			enabled ? TOKENS.paper : new Color(129, 127, 147),
			width - 8,
		);
		const control = node.addComponent(Button);
		control.interactable = enabled;
		if (enabled) control.node.on(Button.EventType.CLICK, action, this);
	}
}
