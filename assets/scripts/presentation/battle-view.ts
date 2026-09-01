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
import type { CombatTransition, GameView } from "../app/game-facade";
import { HandView } from "./hand-view";

const ENEMY_LABELS: Record<string, { zh: string; en: string }> = {
	Scout: { zh: "侦察兵", en: "Scout" },
	Elite: { zh: "精英敌人", en: "Elite" },
	Boss: { zh: "魔影首领", en: "Boss" },
};
const RELIC_LABELS: Record<string, { zh: string; en: string }> = {
	anchor: { zh: "锚", en: "Anchor" },
	coinPurse: { zh: "钱袋", en: "Coin Purse" },
	ironHeart: { zh: "钢铁之心", en: "Iron Heart" },
};

export type BattleViewOptions = {
	locale: "zh" | "en";
	selectedId?: string;
	onCard: (cardId: string, targetId: string) => void;
	onEndTurn: () => void;
};

export class BattleView {
	readonly node: Node;
	private readonly locale: "zh" | "en";
	constructor(parent: Node, view: GameView, options: BattleViewOptions) {
		this.locale = options.locale;
		this.node = new Node("BattleView");
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		this.background();
		this.topHud(view, options);
		this.playerPanel(view);
		this.enemyPanels(view);
		this.hand(view, options);
	}
	showFeedback(transition: CombatTransition, done?: () => void): void {
		const combat = transition.view.combat;
		if (!combat) {
			done?.();
			return;
		}
		const before = transition.before.combat;
		if (before) {
			const blockDelta = combat.playerBlock - before.playerBlock;
			if (
				blockDelta !== 0 &&
				!transition.events.some((event) => event.type === "BlockGained")
			)
				this.floatingNumber(
					`${blockDelta > 0 ? "+" : "−"}${Math.abs(blockDelta)}`,
					-245,
					70,
					new Color(129, 213, 255),
				);
			const energyDelta = combat.energy - before.energy;
			if (energyDelta !== 0)
				this.floatingNumber(
					`⚡ ${energyDelta > 0 ? "+" : "−"}${Math.abs(energyDelta)}`,
					-425,
					-18,
					new Color(255, 214, 123),
				);
		}
		const delay = 0.28;
		for (const event of transition.events) {
			if (event.type === "DamageDealt") {
				const detail = event.detail ?? "";
				const split = detail.lastIndexOf(":");
				const target = split < 0 ? detail : detail.slice(0, split);
				const amount = split < 0 ? "0" : detail.slice(split + 1);
				this.floatingNumber(
					`${target === "player" ? "−" : "−"}${amount}`,
					target === "player" ? -245 : 270,
					118,
					new Color(255, 132, 145),
				);
				this.hitPulse(target === "player" ? "PlayerPanel" : "EnemyPanel");
			} else if (event.type === "BlockGained") {
				this.floatingNumber(
					`+${event.detail ?? "0"}`,
					-245,
					70,
					new Color(129, 213, 255),
				);
			} else if (event.type === "EnemyActed") {
				this.intentPulse();
			} else if (event.type === "TurnEnded") {
				this.turnCue();
			}
		}
		if (
			transition.events.some(
				(event) => event.type === "CombatWon" || event.type === "CombatLost",
			)
		) {
			this.resultOverlay(
				transition.events.some((event) => event.type === "CombatWon"),
				done,
			);
			return;
		}
		const fade = this.node.addComponent(UIOpacity);
		fade.opacity = 255;
		tween(fade)
			.delay(delay)
			.to(0.12, { opacity: 245 })
			.call(() => done?.())
			.start();
	}
	private background(): void {
		const back = this.graphics("DreamBackdrop");
		back.fillColor = new Color(9, 11, 35);
		back.rect(-640, -360, 1280, 720);
		back.fill();
		const mist = this.graphics("VioletMist", 0, -105);
		mist.fillColor = new Color(63, 48, 112, 170);
		mist.circle(0, 0, 250);
		mist.fill();
		const horizon = this.graphics("Horizon", 0, -180);
		horizon.fillColor = new Color(24, 35, 78, 235);
		horizon.moveTo(-640, 80);
		horizon.lineTo(-450, 150);
		horizon.lineTo(-250, 105);
		horizon.lineTo(-55, 160);
		horizon.lineTo(150, 95);
		horizon.lineTo(360, 145);
		horizon.lineTo(640, 90);
		horizon.lineTo(640, -180);
		horizon.lineTo(-640, -180);
		horizon.close();
		horizon.fill();
		const stars = this.graphics("Stars");
		stars.fillColor = new Color(255, 223, 151, 190);
		for (const [x, y, radius] of [
			[-540, 205, 3],
			[-410, 153, 2],
			[-90, 246, 3],
			[140, 190, 2],
			[425, 238, 3],
			[558, 126, 2],
			[310, 152, 2],
		] as number[][]) {
			stars.circle(x, y, radius);
		}
		stars.fill();
		const frame = this.graphics("Frame");
		frame.strokeColor = new Color(112, 97, 165, 210);
		frame.lineWidth = 2;
		frame.roundRect(-630, -350, 1260, 700, 20);
		frame.stroke();
	}
	private topHud(view: GameView, options: BattleViewOptions): void {
		const bar = this.panelIn(
			this.node,
			"GameHUD",
			0,
			312,
			1200,
			62,
			new Color(17, 24, 57, 245),
			new Color(101, 104, 170),
		);
		const avatar = this.graphicsIn(bar, "Avatar", -554, 0);
		avatar.fillColor = new Color(225, 190, 169);
		avatar.circle(0, 5, 19);
		avatar.fill();
		avatar.fillColor = new Color(81, 60, 112);
		avatar.circle(-7, 8, 3);
		avatar.circle(7, 8, 3);
		avatar.fill();
		this.label(
			bar,
			this.locale === "zh" ? "旅梦者" : "Dreamer",
			-515,
			12,
			16,
			new Color(250, 235, 205),
			140,
		);
		this.label(
			bar,
			`♥ ${view.combat?.playerHp ?? 0}/${view.combat?.playerMaxHp ?? 0}`,
			-515,
			-12,
			12,
			new Color(255, 153, 166),
			140,
		);
		this.chip(
			bar,
			this.locale === "zh" ? "格挡" : "BLOCK",
			-362,
			0,
			String(view.combat?.playerBlock ?? 0),
			new Color(85, 179, 225),
		);
		this.chip(
			bar,
			this.locale === "zh" ? "金币" : "GOLD",
			-242,
			0,
			String(view.gold),
			new Color(255, 208, 106),
		);
		const relicText =
			view.relics
				.slice(0, 3)
				.map((relic) => `✦ ${this.relicLabel(relic)}`)
				.join("  ") || (this.locale === "zh" ? "暂无遗物" : "No relic");
		this.label(bar, relicText, -95, 0, 11, new Color(201, 199, 241), 230);
		this.label(
			bar,
			`${this.locale === "zh" ? "节点" : "NODE"} ${view.currentNodeId ?? "—"}`,
			258,
			0,
			12,
			new Color(228, 217, 184),
			135,
		);
		this.button(
			bar,
			"⚙",
			535,
			0,
			44,
			38,
			() => this.settingsToast(),
			new Color(45, 42, 83),
			new Color(191, 171, 117),
		);
	}
	private playerPanel(view: GameView): void {
		const combat = view.combat!;
		const zone = this.panelIn(
			this.node,
			"PlayerPanel",
			-326,
			78,
			390,
			230,
			new Color(30, 43, 83, 232),
			new Color(95, 132, 200),
		);
		this.label(
			zone,
			this.locale === "zh" ? "旅梦者" : "DREAMER",
			-117,
			88,
			11,
			new Color(150, 191, 237),
			150,
		);
		this.mascot(zone, -92, 18, new Color(100, 179, 221));
		this.label(
			zone,
			`${combat.playerHp}/${combat.playerMaxHp}`,
			88,
			54,
			22,
			new Color(255, 239, 211),
			120,
		);
		this.healthBar(
			zone,
			88,
			25,
			180,
			combat.playerHp,
			combat.playerMaxHp,
			new Color(92, 213, 170),
		);
		this.label(
			zone,
			`${this.locale === "zh" ? "格挡" : "BLOCK"}  ${combat.playerBlock}`,
			88,
			-10,
			13,
			new Color(126, 213, 255),
			150,
		);
		this.statuses(zone, combat.playerStatuses, -8, -87);
	}
	private enemyPanels(view: GameView): void {
		const combat = view.combat!;
		const enemies = [combat];
		enemies.forEach((enemy, index) => {
			const x = 345 + index * 210;
			const zone = this.panelIn(
				this.node,
				"EnemyPanel",
				x,
				78,
				390,
				230,
				new Color(49, 31, 78, 236),
				new Color(166, 93, 157),
			);
			this.label(
				zone,
				this.locale === "zh" ? "敌对目标" : "HOSTILE",
				-117,
				88,
				11,
				new Color(240, 139, 174),
				150,
			);
			this.mascot(zone, 95, 22, new Color(186, 83, 164));
			this.label(
				zone,
				this.enemyLabel(enemy.enemyName),
				-25,
				55,
				19,
				new Color(255, 229, 209),
				170,
			);
			this.label(
				zone,
				`${enemy.enemyHp}/${enemy.enemyMaxHp}`,
				-20,
				23,
				16,
				new Color(255, 196, 207),
				115,
			);
			this.healthBar(
				zone,
				-20,
				0,
				180,
				enemy.enemyHp,
				enemy.enemyMaxHp,
				new Color(239, 108, 132),
			);
			this.label(
				zone,
				`${this.locale === "zh" ? "格挡" : "BLOCK"}  ${enemy.enemyBlock}`,
				-20,
				-30,
				12,
				new Color(208, 167, 218),
				130,
			);
			this.statuses(zone, enemy.enemyStatuses, 0, -87);
			const intent = this.panelIn(
				this.node,
				"IntentView",
				x,
				218,
				260,
				54,
				new Color(103, 39, 78, 245),
				new Color(237, 132, 147),
				16,
			);
			this.label(
				intent,
				this.locale === "zh" ? "预告伤害" : "INTENT",
				-47,
				3,
				10,
				new Color(255, 189, 186),
				110,
			);
			this.label(
				intent,
				`⚔ ${enemy.enemyIntentDamage}`,
				72,
				0,
				18,
				new Color(255, 234, 206),
				80,
			);
		});
	}
	private hand(view: GameView, options: BattleViewOptions): void {
		const combat = view.combat!;
		new HandView(this.node, combat.hand, combat.energy, {
			locale: options.locale,
			selectedId: options.selectedId,
			onSelect: (card) => options.onCard(card.instanceId, combat.enemyId),
		});
		const resources = this.panelIn(
			this.node,
			"ResourceBar",
			0,
			-326,
			1200,
			34,
			new Color(12, 19, 47, 242),
			new Color(74, 83, 138),
			12,
		);
		this.label(
			resources,
			`◈ ${combat.drawCount}`,
			-445,
			0,
			12,
			new Color(194, 205, 239),
			95,
		);
		this.label(
			resources,
			`◌ ${combat.discardCount}`,
			-320,
			0,
			12,
			new Color(194, 205, 239),
			105,
		);
		this.label(
			resources,
			`✧ ${combat.exhaustCount}`,
			-190,
			0,
			12,
			new Color(194, 205, 239),
			105,
		);
		this.label(
			resources,
			`${this.locale === "zh" ? "回合" : "TURN"} ${combat.turn}`,
			210,
			0,
			12,
			new Color(195, 205, 239),
			90,
		);
		this.button(
			resources,
			this.locale === "zh" ? "结束回合" : "END TURN",
			515,
			0,
			145,
			42,
			options.onEndTurn,
			new Color(128, 62, 113),
			new Color(248, 165, 119),
		);
	}
	private mascot(parent: Node, x: number, y: number, fill: Color): void {
		const shape = this.graphicsIn(parent, "CharacterPlaceholder", x, y);
		shape.fillColor = fill;
		shape.circle(0, 38, 22);
		shape.roundRect(-35, -38, 70, 78, 22);
		shape.fill();
		shape.fillColor = new Color(245, 226, 215, 220);
		shape.circle(-8, 42, 4);
		shape.circle(8, 42, 4);
		shape.fill();
	}
	private statuses(
		parent: Node,
		statuses: Array<{ id: string; stacks: number }>,
		x: number,
		y: number,
	): void {
		const value = statuses.length
			? statuses.map((status) => `${status.id} ${status.stacks}`).join("  ")
			: this.locale === "zh"
				? "状态：无"
				: "STATUS: NONE";
		this.label(parent, value, x, y, 10, new Color(190, 190, 224), 280);
	}
	private healthBar(
		parent: Node,
		x: number,
		y: number,
		width: number,
		value: number,
		max: number,
		fill: Color,
	): void {
		const back = this.graphicsIn(parent, "HealthBar", x, y);
		back.fillColor = new Color(23, 25, 48, 230);
		back.roundRect(-width / 2, -7, width, 14, 7);
		back.fill();
		const ratio = Math.max(0, Math.min(1, max ? value / max : 0));
		back.fillColor = fill;
		back.roundRect(-width / 2, -7, width * ratio, 14, 7);
		back.fill();
	}
	private chip(
		parent: Node,
		title: string,
		x: number,
		y: number,
		value: string,
		accent: Color,
	): void {
		const node = this.panelIn(
			parent,
			"Chip",
			x,
			y,
			105,
			38,
			new Color(29, 37, 74),
			new Color(70, 83, 138),
			12,
		);
		this.label(node, title, -20, 6, 9, accent, 52);
		this.label(node, value, 26, 0, 15, new Color(247, 239, 215), 40);
	}
	private resultOverlay(won: boolean, done?: () => void): void {
		const overlay = this.panelIn(
			this.node,
			"BattleResultOverlay",
			0,
			20,
			480,
			176,
			won ? new Color(75, 57, 105, 248) : new Color(49, 39, 83, 250),
			won ? new Color(255, 208, 114) : new Color(201, 124, 186),
			24,
		);
		this.label(
			overlay,
			won
				? this.locale === "zh"
					? "胜利！"
					: "VICTORY!"
				: this.locale === "zh"
					? "梦境破碎…"
					: "DEFEAT…",
			0,
			42,
			30,
			won ? new Color(255, 222, 139) : new Color(239, 170, 218),
			440,
		);
		this.label(
			overlay,
			won
				? this.locale === "zh"
					? "敌人已被击退"
					: "THE FOE HAS FALLEN"
				: this.locale === "zh"
					? "旅程暂告一段落"
					: "THE DREAM FADES",
			0,
			4,
			13,
			new Color(245, 231, 218),
			400,
		);
		const continueButton = this.panelIn(
			overlay,
			"ContinueButton",
			0,
			-58,
			150,
			34,
			new Color(52, 49, 94),
			new Color(220, 184, 130),
			10,
		);
		this.label(
			continueButton,
			this.locale === "zh" ? "继续" : "CONTINUE",
			0,
			0,
			12,
			new Color(255, 244, 222),
			140,
		);
		const continueAction = continueButton.addComponent(Button);
		continueAction.interactable = true;
		continueAction.node.on(Button.EventType.CLICK, () => done?.(), this);
		const fade = overlay.addComponent(UIOpacity);
		fade.opacity = 0;
		tween(fade).to(0.18, { opacity: 255 }).start();
	}
	private settingsToast(): void {
		const toast = this.panelIn(
			this.node,
			"SettingsToast",
			0,
			190,
			310,
			74,
			new Color(35, 39, 78, 248),
			new Color(191, 171, 117),
			18,
		);
		this.label(
			toast,
			this.locale === "zh" ? "设置入口 · V1" : "SETTINGS · V1",
			0,
			8,
			15,
			new Color(255, 236, 198),
			280,
		);
		this.label(
			toast,
			this.locale === "zh"
				? "设置页将在后续阶段开放"
				: "Settings page coming later",
			0,
			-16,
			10,
			new Color(194, 201, 232),
			280,
		);
		const fade = toast.addComponent(UIOpacity);
		fade.opacity = 255;
		tween(fade).delay(1.1).to(0.25, { opacity: 0 }).start();
	}
	private floatingNumber(
		value: string,
		x: number,
		y: number,
		color: Color,
	): void {
		const node = new Node("FloatingNumber");
		this.node.addChild(node);
		node.layer = this.node.layer;
		node.setPosition(x, y);
		const transform = node.addComponent(UITransform);
		transform.setContentSize(160, 38);
		const label = node.addComponent(Label);
		label.string = value;
		label.fontSize = 25;
		label.color = color;
		const opacity = node.addComponent(UIOpacity);
		opacity.opacity = 255;
		tween(opacity).delay(0.18).to(0.22, { opacity: 0 }).start();
	}
	private hitPulse(name: string): void {
		const node = this.node.getChildByName(name);
		if (!node) return;
		const opacity =
			node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
		opacity.opacity = 255;
		tween(opacity)
			.to(0.08, { opacity: 130 })
			.to(0.16, { opacity: 255 })
			.start();
	}
	private intentPulse(): void {
		const node = this.node.getChildByName("IntentView");
		if (!node) return;
		const opacity =
			node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
		opacity.opacity = 255;
		tween(opacity).to(0.1, { opacity: 120 }).to(0.16, { opacity: 255 }).start();
	}
	private enemyLabel(enemyId: string): string {
		return ENEMY_LABELS[enemyId]?.[this.locale] ?? enemyId;
	}
	private relicLabel(relicId: string): string {
		return RELIC_LABELS[relicId]?.[this.locale] ?? relicId;
	}
	private turnCue(): void {
		this.floatingNumber(
			this.locale === "zh" ? "敌方回合" : "ENEMY TURN",
			0,
			152,
			new Color(255, 224, 163),
		);
	}
	private graphics(name: string, x = 0, y = 0): Graphics {
		const node = new Node(name);
		this.node.addChild(node);
		node.layer = this.node.layer;
		node.setPosition(x, y);
		return node.addComponent(Graphics);
	}
	private graphicsIn(parent: Node, name: string, x = 0, y = 0): Graphics {
		const node = new Node(name);
		parent.addChild(node);
		node.layer = this.node.layer;
		node.setPosition(x, y);
		return node.addComponent(Graphics);
	}
	private panelIn(
		parent: Node,
		name: string,
		x: number,
		y: number,
		width: number,
		height: number,
		fill: Color,
		stroke: Color,
		radius = 16,
	): Node {
		const node = new Node(name);
		parent.addChild(node);
		node.layer = parent.layer;
		node.setPosition(x, y);
		const transform = node.addComponent(UITransform);
		transform.setContentSize(width, height);
		const shape = node.addComponent(Graphics);
		shape.fillColor = fill;
		shape.roundRect(-width / 2, -height / 2, width, height, radius);
		shape.fill();
		shape.strokeColor = stroke;
		shape.lineWidth = 2;
		shape.stroke();
		return node;
	}
	private label(
		parent: Node,
		value: string,
		x: number,
		y: number,
		size: number,
		color: Color,
		width: number,
	): void {
		const node = new Node("Label");
		parent.addChild(node);
		node.layer = this.node.layer;
		node.setPosition(x, y);
		const transform = node.addComponent(UITransform);
		transform.setContentSize(width, size + 10);
		const label = node.addComponent(Label);
		label.string = value;
		label.fontSize = size;
		label.lineHeight = size + 4;
		label.color = color;
	}
	private button(
		parent: Node,
		value: string,
		x: number,
		y: number,
		width: number,
		height: number,
		action: () => void,
		fill: Color,
		stroke: Color,
	): void {
		const node = this.panelIn(
			parent,
			"Button",
			x,
			y,
			width,
			height,
			fill,
			stroke,
			12,
		);
		this.label(node, value, 0, 0, 12, new Color(255, 244, 222), width - 8);
		const button = node.addComponent(Button);
		button.interactable = true;
		button.node.on(Button.EventType.CLICK, action, this);
	}
}
