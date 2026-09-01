import { Button, Component, Label, Node, UITransform, _decorator } from "cc";
import {
	type CombatTransition,
	GameFacade,
	type GameView,
} from "../app/game-facade";
import { LocalSaveStorage } from "../platform/local-save";
import { BattleView } from "./battle-view";

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
const CARD_LABELS: Record<string, { name: { zh: string; en: string } }> = {
	strike: {
		name: { zh: "打击", en: "Strike" },
	},
	guard: {
		name: { zh: "守备", en: "Guard" },
	},
	insight: {
		name: { zh: "洞察", en: "Insight" },
	},
	toxin: {
		name: { zh: "毒液", en: "Toxin" },
	},
	doubleCut: {
		name: { zh: "双斩", en: "Double Cut" },
	},
	execute: {
		name: { zh: "处决", en: "Execute" },
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
	private selectedCardId?: string;
	private combatBusy = false;
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
		this.button(this.i18n("newRun"), () => {
			this.selectedCardId = undefined;
			this.render(this.facade.newRun("phase-3-demo"));
		});
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

	private renderCombat(
		view: GameView,
		events: CombatTransition["events"] = [],
		after?: GameView,
		before?: GameView,
	): void {
		this.combatBusy = events.length > 0;
		this.contentRoot.removeAllChildren();
		this.cursor = 0;
		this.currentView = view;
		const root = new Node("CombatConcept");
		this.contentRoot.addChild(root);
		root.layer = this.node.layer;
		const battle = new BattleView(root, view, {
			locale: this.locale,
			selectedId: this.selectedCardId,
			onCard: (id, target) => this.cardInput(id, target),
			onEndTurn: () => this.endTurnInput(),
		});
		if (events.length)
			battle.showFeedback(
				{
					accepted: true,
					before: before ?? view,
					view,
					after: after ?? view,
					events,
				},
				() => {
					this.combatBusy = false;
					after && this.render(after);
				},
			);
	}

	private cardInput(cardId: string, targetId: string): void {
		if (this.combatBusy) return;
		if (this.selectedCardId !== cardId) {
			this.selectedCardId = cardId;
			this.render(this.currentView);
			return;
		}
		this.selectedCardId = undefined;
		const transition = this.facade.playCardTransition(cardId, targetId);
		if (!transition.accepted) {
			this.selectedCardId = cardId;
			this.render(transition.view);
			return;
		}
		this.renderCombat(
			transition.view,
			transition.events,
			transition.after,
			transition.before,
		);
	}

	private endTurnInput(): void {
		if (this.combatBusy) return;
		this.selectedCardId = undefined;
		const transition = this.facade.endTurnTransition();
		if (!transition.accepted) {
			this.render(transition.after);
			return;
		}
		this.renderCombat(
			transition.view,
			transition.events,
			transition.after,
			transition.before,
		);
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
		return `${name} [${card.cost}] ${card.preview}`;
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
