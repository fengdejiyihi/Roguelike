import {
	Button,
	Color,
	Component,
	Graphics,
	Label,
	Node,
	UIOpacity,
	UITransform,
	_decorator,
	tween,
} from "cc";
import { type CardView, GameFacade, type GameView } from "../app/game-facade";
import { LocalSaveStorage } from "../platform/local-save";

const { ccclass } = _decorator;
const ROW_HEIGHT = 35;
const CONTENT_HEIGHT = 33;
type Locale = "zh" | "en";
const UI_TEXT: Record<string, { zh: string; en: string }> = {
	title: { zh: "卡牌远征", en: "Card Expedition" },
	newRun: { zh: "新游戏", en: "New Run" },
	save: { zh: "保存", en: "Save" },
	resume: { zh: "继续", en: "Resume" },
	noRunHint: { zh: "请选择“新游戏”开始。", en: "Choose New Run to begin." },
	phase: { zh: "阶段", en: "Phase" },
	gold: { zh: "金币", en: "Gold" },
	relics: { zh: "遗物", en: "Relics" },
	currentNode: { zh: "当前节点", en: "Current node" },
	mapTitle: { zh: "地图 — 选择下一节点", en: "Map — choose a next node" },
	playerHp: { zh: "生命", en: "HP" },
	block: { zh: "格挡", en: "Block" },
	enemyHp: { zh: "敌人生命", en: "Enemy HP" },
	energy: { zh: "能量", en: "Energy" },
	intent: { zh: "意图", en: "Intent" },
	attack: { zh: "攻击", en: "Attack" },
	hand: { zh: "手牌", en: "Hand" },
	empty: { zh: "空", en: "empty" },
	endTurn: { zh: "结束回合", en: "End turn" },
	reward: { zh: "奖励", en: "Reward" },
	take: { zh: "选择", en: "Take" },
	goldLabel: { zh: "金币", en: "gold" },
	skipReward: { zh: "跳过奖励", en: "Skip reward" },
	shop: { zh: "商店", en: "Shop" },
	sold: { zh: "（已售）", en: " (sold)" },
	leaveShop: { zh: "离开商店", en: "Leave shop" },
	event: { zh: "事件", en: "Event" },
	accept: { zh: "接受", en: "Accept" },
	skip: { zh: "跳过", en: "Skip" },
	victory: { zh: "胜利", en: "Victory" },
	defeat: { zh: "失败", en: "Defeat" },
	none: { zh: "无", en: "none" },
	language: { zh: "EN", en: "中文" },
	price: { zh: "价格", en: "Price" },
	combatTitle: { zh: "暮色远征", en: "DUSK EXPEDITION" },
	battleCue: { zh: "战斗进行中", en: "BATTLE IN PROGRESS" },
	vanguard: { zh: "远征者", en: "VANGUARD" },
	foe: { zh: "敌对目标", en: "HOSTILE" },
	status: { zh: "状态", en: "STATUS" },
	cardAttack: { zh: "攻击", en: "ATTACK" },
	cardSkill: { zh: "技能", en: "SKILL" },
	cardTactic: { zh: "战术", en: "TACTIC" },
	unavailable: { zh: "能量不足", en: "NOT ENOUGH ENERGY" },
	playable: { zh: "可使用", en: "READY" },
	intentCue: { zh: "预告伤害", en: "INCOMING DAMAGE" },
	energyShort: { zh: "能量", en: "ENERGY" },
	relicNone: { zh: "暂无遗物", en: "No relics" },
	runCue: { zh: "战局", en: "RUN" },
};
const NODE_ID_LABELS: Record<string, { zh: string; en: string }> = {
	start: { zh: "起点", en: "Start" },
	boss: { zh: "首领", en: "Boss" },
};
const PHASE_LABELS: Record<string, { zh: string; en: string }> = {
	map: { zh: "地图", en: "Map" },
	combat: { zh: "战斗", en: "Combat" },
	reward: { zh: "奖励", en: "Reward" },
	shop: { zh: "商店", en: "Shop" },
	event: { zh: "事件", en: "Event" },
	won: { zh: "胜利", en: "Won" },
	lost: { zh: "失败", en: "Lost" },
};
const NODE_TYPE_LABELS: Record<string, { zh: string; en: string }> = {
	start: { zh: "起点", en: "Start" },
	combat: { zh: "战斗", en: "Combat" },
	elite: { zh: "精英", en: "Elite" },
	boss: { zh: "首领", en: "Boss" },
	shop: { zh: "商店", en: "Shop" },
	event: { zh: "事件", en: "Event" },
};
const ENEMY_LABELS: Record<string, { zh: string; en: string }> = {
	Scout: { zh: "侦察兵", en: "Scout" },
	Brute: { zh: "悍将", en: "Brute" },
	Elite: { zh: "精英", en: "Elite" },
	Boss: { zh: "首领", en: "Boss" },
};
const CARD_LABELS: Record<
	string,
	{ name: { zh: string; en: string }; preview: { zh: string; en: string } }
> = {
	strike: {
		name: { zh: "打击", en: "Strike" },
		preview: { zh: "对敌人造成 6 点伤害", en: "Damage enemy 6" },
	},
	guard: {
		name: { zh: "守备", en: "Guard" },
		preview: { zh: "获得 5 点格挡", en: "Gain 5 block" },
	},
	insight: {
		name: { zh: "洞察", en: "Insight" },
		preview: { zh: "抽 2 张牌", en: "Draw 2 cards" },
	},
	toxin: {
		name: { zh: "毒液", en: "Toxin" },
		preview: {
			zh: "使敌人获得 2 层毒",
			en: "Apply poison 2 to enemy",
		},
	},
	doubleCut: {
		name: { zh: "双斩", en: "Double Cut" },
		preview: {
			zh: "对敌人造成 3 点伤害两次",
			en: "Deal 3 damage twice to enemy",
		},
	},
	execute: {
		name: { zh: "处决", en: "Execute" },
		preview: {
			zh: "如果目标有毒则对其造成 10 点伤害，否则造成 2 点伤害",
			en: "If target has poison, damage enemy 10; otherwise damage enemy 2",
		},
	},
};
const RELIC_LABELS: Record<string, { zh: string; en: string }> = {
	anchor: { zh: "锚", en: "Anchor" },
	coinPurse: { zh: "钱袋", en: "Coin Purse" },
	ironHeart: { zh: "钢铁之心", en: "Iron Heart" },
};
const EVENT_LABELS: Record<string, { zh: string; en: string }> = {
	shrine: { zh: "圣坛", en: "Shrine" },
	gamble: { zh: "赌博", en: "Gamble" },
};

@ccclass("MainView")
export class MainView extends Component {
	private facade = new GameFacade(new LocalSaveStorage());
	private locale: Locale = "zh";
	private currentView?: GameView;
	private cursor = 0;
	private contentRoot = new Node("MainViewContent");

	onLoad(): void {
		this.contentRoot.layer = this.node.layer;
		this.node.addChild(this.contentRoot);
		this.render(this.tryResume());
	}

	private tryResume(): GameView | undefined {
		try {
			return this.facade.resume();
		} catch {
			return undefined;
		}
	}

	private render(view?: GameView): void {
		this.contentRoot.removeAllChildren();
		this.cursor = 0;
		this.currentView = view;
		if (view?.phase === "combat" && view.combat) {
			this.renderCombat(view);
			return;
		}
		this.button(this.i18n("language"), () => {
			this.locale = this.locale === "zh" ? "en" : "zh";
			this.render(this.currentView);
		});
		this.text(this.i18n("title"), 28);
		this.button(this.i18n("newRun"), () =>
			this.render(this.facade.newRun("phase-3-demo")),
		);
		this.button(this.i18n("save"), () => this.facade.save());
		this.button(
			this.i18n("resume"),
			() => this.render(this.tryResume()),
			!view,
		);
		if (!view) {
			this.text(this.i18n("noRunHint"), 18);
			return;
		}
		this.text(`${this.i18n("phase")}: ${this.phaseLabel(view.phase)}`, 20);
		this.text(
			`${this.i18n("gold")}: ${view.gold} | ${this.i18n("relics")}: ${view.relics.map((relic) => this.relicLabel(relic)).join(", ") || this.i18n("none")}`,
			16,
		);
		if (view.currentNodeId)
			this.text(
				`${this.i18n("currentNode")}: ${this.nodeIdLabel(view.currentNodeId)}`,
				18,
			);
		if (view.phase === "map") this.renderMap(view);
		if (view.phase === "reward" && view.reward) this.renderReward(view);
		if (view.phase === "shop" && view.shop) this.renderShop(view);
		if (view.phase === "event" && view.event) this.renderEvent(view);
		if (view.result)
			this.text(
				view.result === "won" ? this.i18n("victory") : this.i18n("defeat"),
				26,
			);
	}

	private renderMap(view: GameView): void {
		this.text(this.i18n("mapTitle"), 18);
		for (const node of view.map.filter((item) => item.enabled)) {
			this.button(
				`${this.nodeIdLabel(node.id)} (${this.nodeTypeLabel(node.type)})`,
				() => this.render(this.facade.selectNode(node.id)),
				!node.enabled,
			);
		}
	}

	private renderCombat(view: GameView): void {
		const combat = view.combat!;
		const root = new Node("CombatConcept");
		this.contentRoot.addChild(root);
		root.layer = this.node.layer;
		this.drawBackdrop(root);
		this.combatTopBar(root, view);
		this.combatPlayer(root, combat.playerHp, combat.playerBlock);
		this.combatEnemy(
			root,
			combat.enemyName,
			combat.enemyHp,
			combat.enemyIntentDamage,
		);
		this.combatHand(root, combat.hand, combat.energy, combat.enemyId);
		const opacity = root.addComponent(UIOpacity);
		opacity.opacity = 0;
		tween(opacity).to(0.22, { opacity: 255 }).start();
	}

	private drawBackdrop(parent: Node): void {
		const back = this.graphics(parent, "Backdrop", 0, 0);
		back.fillColor = this.color(8, 20, 36);
		back.rect(-640, -360, 1280, 720);
		back.fill();
		this.sceneBand(parent, -190, 1280, 210, this.color(10, 43, 57));
		this.sceneBand(parent, -275, 1280, 120, this.color(15, 62, 70));
		const ridges = this.graphics(parent, "Ridges", 0, 0);
		ridges.fillColor = this.color(14, 52, 66);
		ridges.moveTo(-640, -205);
		ridges.lineTo(-480, -120);
		ridges.lineTo(-300, -185);
		ridges.lineTo(-80, -110);
		ridges.lineTo(130, -180);
		ridges.lineTo(330, -125);
		ridges.lineTo(500, -205);
		ridges.lineTo(640, -155);
		ridges.lineTo(640, -360);
		ridges.lineTo(-640, -360);
		ridges.close();
		ridges.fill();
		const glow = this.graphics(parent, "HorizonGlow", 0, 0);
		glow.fillColor = this.color(30, 103, 108, 90);
		glow.circle(0, -115, 190);
		glow.fill();
		const frame = this.graphics(parent, "DecorativeFrame", 0, 0);
		frame.strokeColor = this.color(54, 95, 103);
		frame.lineWidth = 4;
		frame.rect(-624, -344, 1248, 688);
		frame.strokeColor = this.color(25, 57, 70);
		frame.lineWidth = 1;
		frame.rect(-612, -332, 1224, 664);
		frame.stroke();
		frame.strokeColor = this.color(240, 177, 78, 180);
		frame.lineWidth = 3;
		frame.moveTo(-624, 275);
		frame.lineTo(-594, 305);
		frame.moveTo(624, 275);
		frame.lineTo(594, 305);
		frame.stroke();
	}

	private sceneBand(
		parent: Node,
		y: number,
		width: number,
		height: number,
		fill: Color,
	): void {
		const band = this.graphics(parent, "SceneBand", 0, 0);
		band.fillColor = fill;
		band.rect(-width / 2, y - height / 2, width, height);
		band.fill();
	}

	private combatTopBar(parent: Node, view: GameView): void {
		const bar = this.panel(
			parent,
			"TopBar",
			0,
			315,
			1180,
			62,
			this.color(13, 32, 49),
			this.color(57, 104, 111),
			14,
		);
		this.labelAt(
			bar,
			this.i18n("combatTitle"),
			-455,
			7,
			260,
			28,
			20,
			this.color(235, 220, 176),
		);
		this.labelAt(
			bar,
			this.i18n("battleCue"),
			-455,
			-15,
			260,
			18,
			10,
			this.color(111, 177, 175),
		);
		const relics = view.relics.length ? view.relics : ["none"];
		relics.slice(0, 3).forEach((relic, index) => {
			const chip = this.panel(
				bar,
				`RelicChip${index}`,
				-228 + index * 108,
				0,
				96,
				34,
				this.color(24, 56, 65),
				this.color(63, 126, 120),
				10,
			);
			this.labelAt(
				chip,
				relic === "none" ? this.i18n("relicNone") : this.relicLabel(relic),
				0,
				0,
				88,
				28,
				10,
				this.color(183, 215, 195),
			);
		});
		const topPhase = this.phaseLabel(view.phase);
		this.labelAt(
			bar,
			`${this.i18n("runCue")} · ${this.locale === "en" ? topPhase.toUpperCase() : topPhase}`,
			23,
			6,
			180,
			24,
			13,
			this.color(220, 229, 211),
		);
		this.buttonAt(
			bar,
			this.i18n("save"),
			465,
			0,
			86,
			34,
			() => this.facade.save(),
			false,
			this.color(26, 72, 76),
			this.color(101, 183, 156),
		);
		this.buttonAt(
			bar,
			this.i18n("language"),
			560,
			0,
			68,
			34,
			() => {
				this.locale = this.locale === "zh" ? "en" : "zh";
				this.render(this.currentView);
			},
			false,
			this.color(30, 47, 61),
			this.color(94, 135, 145),
		);
	}

	private combatPlayer(parent: Node, hp: number, block: number): void {
		const zone = this.panel(
			parent,
			"PlayerZone",
			-345,
			78,
			360,
			224,
			this.color(12, 39, 55, 235),
			this.color(47, 117, 123),
			22,
		);
		this.labelAt(
			zone,
			this.i18n("vanguard"),
			-116,
			84,
			124,
			20,
			11,
			this.color(111, 193, 185),
		);
		this.labelAt(
			zone,
			this.i18n("playerHp"),
			80,
			82,
			100,
			18,
			11,
			this.color(137, 173, 171),
		);
		this.labelAt(
			zone,
			String(hp),
			92,
			50,
			80,
			40,
			31,
			this.color(231, 242, 218),
		);
		this.labelAt(
			zone,
			`${this.i18n("block")}  ${block}`,
			82,
			12,
			112,
			22,
			13,
			this.color(240, 177, 78),
		);
		this.labelAt(
			zone,
			this.i18n("status"),
			0,
			-91,
			320,
			19,
			10,
			this.color(99, 159, 163),
		);
		this.playerSilhouette(zone);
	}

	private playerSilhouette(parent: Node): void {
		const art = this.graphics(parent, "PlayerSilhouette", -91, 12);
		art.fillColor = this.color(43, 157, 157);
		art.circle(0, 50, 20);
		art.roundRect(-31, -42, 62, 82, 18);
		art.fill();
		art.fillColor = this.color(89, 205, 183, 150);
		art.roundRect(24, -20, 44, 58, 12);
		art.fill();
		art.fillColor = this.color(240, 177, 78);
		art.circle(47, 16, 9);
		art.fill();
	}

	private combatEnemy(
		parent: Node,
		name: string,
		hp: number,
		intentDamage: number,
	): void {
		const intent = this.panel(
			parent,
			"EnemyIntent",
			345,
			238,
			266,
			58,
			this.color(92, 25, 61),
			this.color(221, 77, 112),
			16,
		);
		this.labelAt(
			intent,
			this.i18n("intentCue"),
			-44,
			13,
			145,
			16,
			10,
			this.color(252, 177, 169),
		);
		this.labelAt(
			intent,
			`${this.i18n("attack")}  ${intentDamage}`,
			61,
			8,
			76,
			26,
			21,
			this.color(255, 229, 194),
		);
		const zone = this.panel(
			parent,
			"EnemyZone",
			345,
			84,
			360,
			224,
			this.color(35, 31, 56, 240),
			this.color(119, 70, 112),
			22,
		);
		this.labelAt(
			zone,
			this.i18n("foe"),
			-116,
			84,
			124,
			20,
			11,
			this.color(224, 113, 143),
		);
		this.labelAt(
			zone,
			this.enemyLabel(name),
			-20,
			49,
			172,
			25,
			20,
			this.color(246, 226, 205),
		);
		this.labelAt(
			zone,
			`${this.i18n("enemyHp")}  ${hp}`,
			0,
			14,
			270,
			20,
			13,
			this.color(218, 166, 186),
		);
		this.labelAt(
			zone,
			this.i18n("status"),
			0,
			-91,
			320,
			19,
			10,
			this.color(159, 110, 146),
		);
		this.enemySilhouette(zone);
	}

	private enemySilhouette(parent: Node): void {
		const art = this.graphics(parent, "EnemySilhouette", 100, -8);
		art.fillColor = this.color(177, 46, 102);
		art.circle(0, 48, 23);
		art.moveTo(-50, -46);
		art.lineTo(-31, 24);
		art.lineTo(0, 8);
		art.lineTo(31, 24);
		art.lineTo(50, -46);
		art.close();
		art.fill();
		art.fillColor = this.color(239, 93, 104, 190);
		art.circle(-12, 51, 4);
		art.circle(12, 51, 4);
		art.fill();
	}

	private combatHand(
		parent: Node,
		cards: CardView[],
		energy: number,
		enemyId: string,
	): void {
		const hand = this.panel(
			parent,
			"HandArea",
			0,
			-248,
			1180,
			194,
			this.color(9, 27, 42, 246),
			this.color(43, 85, 96),
			24,
		);
		this.labelAt(
			hand,
			this.i18n("hand"),
			-532,
			78,
			90,
			20,
			11,
			this.color(111, 177, 175),
		);
		this.labelAt(
			hand,
			`${this.i18n("energyShort")}  ${energy} / 3`,
			-533,
			-72,
			130,
			24,
			17,
			this.color(245, 190, 95),
		);
		this.energyPips(hand, energy);
		this.buttonAt(
			hand,
			this.i18n("endTurn"),
			518,
			-4,
			142,
			52,
			() => this.render(this.facade.endTurn()),
			false,
			this.color(160, 55, 76),
			this.color(247, 143, 116),
			16,
		);
		const cardWidth = cards.length > 5 ? Math.max(1, 760 / cards.length) : 166;
		const step =
			cards.length > 5
				? cardWidth
				: cards.length > 1
					? Math.min(cardWidth + 13, 880 / (cards.length - 1))
					: 0;
		const start = -((cards.length - 1) * step) / 2;
		cards.forEach((card, index) => {
			const available = card.cost <= energy;
			this.combatCard(
				hand,
				card,
				start + index * step,
				enemyId,
				available,
				index,
				cardWidth,
				cards.length,
			);
		});
	}

	private energyPips(parent: Node, energy: number): void {
		const firstPipX = -500;
		for (let index = 0; index < 3; index++) {
			const pip = this.graphics(
				parent,
				`EnergyPip${index}`,
				firstPipX + index * 22,
				-49,
			);
			pip.fillColor =
				index < energy ? this.color(240, 177, 78) : this.color(59, 77, 84);
			pip.circle(0, 0, 7);
			pip.fill();
		}
	}

	private combatCard(
		parent: Node,
		card: CardView,
		x: number,
		enemyId: string,
		available: boolean,
		index: number,
		width = 166,
		total = 1,
	): void {
		const type = this.cardType(card.cardId);
		const colors = this.cardColors(type, available);
		const cardNode = this.panel(
			parent,
			`Card${index}`,
			x,
			1,
			width,
			158,
			colors.fill,
			colors.border,
			16,
		);
		this.labelAt(cardNode, type, 0, 61, width - 20, 16, 9, colors.accent);
		this.labelAt(
			cardNode,
			this.cardName(card),
			-width * 0.07,
			35,
			width - 38,
			25,
			17,
			colors.text,
		);
		const costX = -width / 2 + 22;
		const cost = this.graphics(cardNode, "Cost", costX, 58);
		cost.fillColor = colors.accent;
		cost.circle(0, 0, 15);
		cost.fill();
		this.labelAt(
			cardNode,
			String(card.cost),
			costX,
			57,
			24,
			24,
			14,
			this.color(11, 27, 38),
		);
		this.labelAt(
			cardNode,
			this.wrapText(this.cardPreview(card), width),
			0,
			-8,
			width - 28,
			48,
			11,
			colors.text,
		);
		this.labelAt(
			cardNode,
			available ? this.i18n("playable") : this.i18n("unavailable"),
			0,
			-59,
			width - 20,
			17,
			9,
			colors.muted,
		);
		cardNode.setPosition(
			x,
			1 + Math.max(0, 10 - Math.abs(index - (total - 1) / 2) * 3),
		);
		const button = cardNode.addComponent(Button);
		button.interactable = available;
		if (available)
			button.node.on(
				Button.EventType.CLICK,
				() => this.render(this.facade.playCard(card.instanceId, enemyId)),
				this,
			);
		const fade = cardNode.addComponent(UIOpacity);
		fade.opacity = 0;
		tween(fade)
			.delay(index * 0.045)
			.to(0.18, { opacity: 255 })
			.start();
	}

	private cardType(cardId: string): string {
		if (["strike", "doubleCut", "execute"].includes(cardId))
			return this.i18n("cardAttack");
		if (["guard", "insight"].includes(cardId)) return this.i18n("cardSkill");
		return this.i18n("cardTactic");
	}

	private cardColors(
		type: string,
		available: boolean,
	): { fill: Color; border: Color; accent: Color; text: Color; muted: Color } {
		const attack = type === this.i18n("cardAttack");
		const skill = type === this.i18n("cardSkill");
		const palette = attack
			? [
					this.color(64, 34, 48),
					this.color(167, 71, 93),
					this.color(245, 137, 111),
				]
			: skill
				? [
						this.color(22, 55, 65),
						this.color(67, 144, 137),
						this.color(116, 220, 186),
					]
				: [
						this.color(68, 51, 31),
						this.color(165, 125, 56),
						this.color(245, 190, 95),
					];
		return {
			fill: available ? palette[0] : this.color(26, 35, 43),
			border: available ? palette[1] : this.color(65, 76, 80),
			accent: available ? palette[2] : this.color(108, 121, 121),
			text: available ? this.color(238, 239, 219) : this.color(137, 148, 146),
			muted: available ? this.color(139, 182, 170) : this.color(101, 113, 112),
		};
	}

	private cardName(card: CardView): string {
		return CARD_LABELS[card.cardId]?.name?.[this.locale] ?? card.name;
	}

	private cardPreview(card: CardView): string {
		return CARD_LABELS[card.cardId]?.preview?.[this.locale] ?? card.preview;
	}

	private wrapText(value: string, cardWidth: number): string {
		const lines: string[] = [];
		const widthLimit =
			this.locale === "zh"
				? Math.max(4, Math.min(12, Math.floor(cardWidth / 11)))
				: Math.max(7, Math.min(22, Math.floor(cardWidth / 6)));
		for (let index = 0; index < value.length; index += widthLimit)
			lines.push(value.slice(index, index + widthLimit));
		return lines.slice(0, 3).join("\n");
	}

	private color(red: number, green: number, blue: number, alpha = 255): Color {
		return new Color(red, green, blue, alpha);
	}

	private graphics(parent: Node, name: string, x: number, y: number): Graphics {
		const node = new Node(name);
		parent.addChild(node);
		node.layer = this.node.layer;
		node.setPosition(x, y);
		return node.addComponent(Graphics);
	}

	private panel(
		parent: Node,
		name: string,
		x: number,
		y: number,
		width: number,
		height: number,
		fill: Color,
		stroke?: Color,
		radius = 12,
	): Node {
		const node = new Node(name);
		parent.addChild(node);
		node.layer = this.node.layer;
		node.setPosition(x, y);
		const transform = node.addComponent(UITransform);
		transform.setContentSize(width, height);
		const shape = node.addComponent(Graphics);
		shape.fillColor = fill;
		shape.roundRect(-width / 2, -height / 2, width, height, radius);
		shape.fill();
		if (stroke) {
			shape.strokeColor = stroke;
			shape.lineWidth = 1;
			shape.stroke();
		}
		return node;
	}

	private labelAt(
		parent: Node,
		value: string,
		x: number,
		y: number,
		width: number,
		height: number,
		size: number,
		color: Color,
	): void {
		const node = new Node("Label");
		parent.addChild(node);
		node.layer = this.node.layer;
		node.setPosition(x, y);
		const transform = node.addComponent(UITransform);
		transform.setContentSize(width, height);
		const label = node.addComponent(Label);
		label.string = value;
		label.fontSize = size;
		label.color = color;
		label.lineHeight = Math.max(size + 4, 16);
	}

	private buttonAt(
		parent: Node,
		value: string,
		x: number,
		y: number,
		width: number,
		height: number,
		action: () => void,
		disabled: boolean,
		fill: Color,
		stroke: Color,
		radius = 10,
	): void {
		const node = this.panel(
			parent,
			"Button",
			x,
			y,
			width,
			height,
			fill,
			stroke,
			radius,
		);
		this.labelAt(
			node,
			value,
			0,
			0,
			width - 10,
			height - 6,
			12,
			this.color(242, 239, 216),
		);
		const button = node.addComponent(Button);
		button.interactable = !disabled;
		if (!disabled) button.node.on(Button.EventType.CLICK, action, this);
	}

	private renderReward(view: GameView): void {
		this.text(
			`${this.i18n("reward")} (+${view.reward!.gold} ${this.i18n("goldLabel")})`,
			18,
		);
		for (const card of view.reward!.cards)
			this.button(`${this.i18n("take")} ${this.cardLabel(card)}`, () =>
				this.render(this.facade.chooseReward(card.cardId)),
			);
		this.button(this.i18n("skipReward"), () =>
			this.render(this.facade.skipReward()),
		);
	}

	private renderShop(view: GameView): void {
		this.text(this.i18n("shop"), 18);
		for (const item of view.shop!)
			this.button(
				`${item.card ? `${this.cardLabel(item.card)} — ` : `${this.relicLabel(item.name)} — `}${this.i18n("price")}: ${item.price}${item.sold ? this.i18n("sold") : ""}`,
				() => this.render(this.facade.buy(item.id)),
				item.sold,
			);
		this.button(this.i18n("leaveShop"), () =>
			this.render(this.facade.leaveShop()),
		);
	}

	private renderEvent(view: GameView): void {
		this.text(
			`${this.i18n("event")}: ${this.eventLabel(view.event ?? "")}`,
			18,
		);
		this.button(this.i18n("accept"), () =>
			this.render(this.facade.chooseEvent("accept")),
		);
		this.button(this.i18n("skip"), () =>
			this.render(this.facade.chooseEvent("skip")),
		);
	}

	private phaseLabel(phase?: string): string {
		return (
			PHASE_LABELS[phase ?? "unknown"]?.[this.locale] ??
			phase ??
			this.i18n("none")
		);
	}
	private nodeTypeLabel(type: string): string {
		return NODE_TYPE_LABELS[type]?.[this.locale] ?? type;
	}
	private nodeIdLabel(id: string): string {
		return NODE_ID_LABELS[id]?.[this.locale] ?? id;
	}
	private enemyLabel(name: string): string {
		return ENEMY_LABELS[name]?.[this.locale] ?? name;
	}
	private cardLabel(card: {
		cardId: string;
		name: string;
		cost: number;
		preview: string;
	}): string {
		const name = CARD_LABELS[card.cardId]?.name?.[this.locale] ?? card.name;
		const preview =
			CARD_LABELS[card.cardId]?.preview?.[this.locale] ?? card.preview;
		return `${name} [${card.cost}] ${preview}`;
	}
	private relicLabel(relicId: string): string {
		return RELIC_LABELS[relicId]?.[this.locale] ?? relicId;
	}
	private eventLabel(eventId: string): string {
		return EVENT_LABELS[eventId]?.[this.locale] ?? eventId;
	}
	private i18n(key: string): string {
		return UI_TEXT[key]?.[this.locale] ?? key;
	}

	private text(value: string, size: number): void {
		const node = new Node("Label");
		this.contentRoot.addChild(node);
		const transform = node.addComponent(UITransform);
		const label = node.addComponent(Label);
		label.string = value;
		label.fontSize = size;
		transform.setContentSize(700, CONTENT_HEIGHT);
		node.layer = this.node.layer;
		node.setPosition(0, 300 - this.cursor * ROW_HEIGHT);
		this.cursor += 1;
	}

	private button(value: string, action: () => void, disabled = false): void {
		const node = new Node("Button");
		this.contentRoot.addChild(node);
		const transform = node.addComponent(UITransform);
		const label = node.addComponent(Label);
		label.string = value;
		label.fontSize = 18;
		transform.setContentSize(700, CONTENT_HEIGHT);
		const button = node.addComponent(Button);
		button.interactable = !disabled;
		node.layer = this.node.layer;
		if (!disabled) {
			button.node.on(Button.EventType.CLICK, action, this);
		}
		node.setPosition(0, 300 - this.cursor * ROW_HEIGHT);
		this.cursor += 1;
	}
}
