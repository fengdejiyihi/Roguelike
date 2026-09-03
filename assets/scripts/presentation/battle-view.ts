import {
	Color,
	Graphics,
	Label,
	Node,
	UIOpacity,
	UITransform,
	tween,
} from "cc";
import * as cc from "cc";
import type { CombatTransition, GameView } from "../app/game-facade";
import { HandView } from "./hand-view";
import {
	TOKENS,
	button,
	graphics,
	healthBar,
	label,
	panel,
	pauseMenu,
	pulse,
} from "./ui-kit";

const ENEMY_LABELS: Record<string, { zh: string; en: string }> = {
	Scout: { zh: "侦察兵", en: "Scout" },
	Brute: { zh: "悍将", en: "Brute" },
	Elite: { zh: "精英敌人", en: "Elite" },
	Boss: { zh: "魔影首领", en: "Boss" },
};
const RELIC_LABELS: Record<string, { zh: string; en: string }> = {
	anchor: { zh: "锚", en: "Anchor" },
	coinPurse: { zh: "钱袋", en: "Coin Purse" },
	ironHeart: { zh: "钢铁之心", en: "Iron Heart" },
};
const STATUS_LABELS: Record<string, { zh: string; en: string }> = {
	poison: { zh: "中毒", en: "Poison" },
	spike: { zh: "尖刺", en: "Spikes" },
	weak: { zh: "虚弱", en: "Weak" },
	vulnerable: { zh: "易伤", en: "Vulnerable" },
};

const BATTLE_ASSETS = {
	background: "art/battle/backgrounds/battle_bg_dream_forest_01/texture",
	playerIdle: "art/battle/characters/player/player_idle/texture",
	playerAttack: "art/battle/characters/player/player_attack/texture",
	enemyIdle: "art/battle/characters/enemy/enemy_idle/texture",
	enemyCast: "art/battle/characters/enemy/enemy_cast/texture",
} as const;

type SpriteComponent = {
	spriteFrame: unknown;
	sizeMode: unknown;
};
type CocosRuntime = typeof cc & {
	resources: {
		load: (
			path: string,
			type: unknown,
			callback: (error: Error | null, asset?: unknown) => void,
		) => void;
	};
	Texture2D: new () => unknown;
	SpriteFrame: new () => { texture: unknown };
	Sprite: {
		new (): SpriteComponent;
		SizeMode: { CUSTOM: unknown };
	};
};
const cocos = cc as unknown as CocosRuntime;
const spriteFrameLoads = new Map<string, Promise<unknown | undefined>>();
const loadedSpriteFrames = new Map<string, unknown>();

function loadSpriteFrame(path: string): Promise<unknown | undefined> {
	const existing = spriteFrameLoads.get(path);
	if (existing) return existing;
	const loading = new Promise<unknown | undefined>((resolve) => {
		try {
			cocos.resources.load(path, cocos.Texture2D, (error, asset) => {
				if (error || !asset) {
					resolve(undefined);
					return;
				}
				const frame = new cocos.SpriteFrame();
				frame.texture = asset;
				loadedSpriteFrames.set(path, frame);
				resolve(frame);
			});
		} catch {
			resolve(undefined);
		}
	});
	spriteFrameLoads.set(path, loading);
	return loading;
}

export type BattleViewOptions = {
	locale: "zh" | "en";
	selectedId?: string;
	onCard: (cardId: string, targetId: string) => void;
	onEndTurn: () => void;
	onLanguage: () => void;
	onSave: () => void;
	onNewRun: () => void;
	canOpenMenu: () => boolean;
};

export class BattleView {
	readonly node: Node;
	private readonly locale: "zh" | "en";
	private playerSprite?: SpriteComponent;
	private enemySprite?: SpriteComponent;
	constructor(parent: Node, view: GameView, options: BattleViewOptions) {
		this.locale = options.locale;
		this.node = new Node("BattleView");
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		this.background();
		this.topHud(view, options);
		this.relicRail(view);
		this.player(view);
		this.enemy(view);
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
				blockDelta &&
				!transition.events.some((event) => event.type === "BlockGained")
			)
				this.floating(
					`${blockDelta > 0 ? "+" : "−"}${Math.abs(blockDelta)}`,
					-355,
					115,
					TOKENS.cyan,
				);
			const energyDelta = combat.energy - before.energy;
			if (energyDelta)
				this.floating(
					`⚡ ${energyDelta > 0 ? "+" : "−"}${Math.abs(energyDelta)}`,
					-470,
					-294,
					TOKENS.gold,
				);
		}
		for (const event of transition.events) {
			if (event.type === "DamageDealt") {
				const detail = event.detail ?? "";
				const split = detail.lastIndexOf(":");
				const target = split < 0 ? detail : detail.slice(0, split);
				const amount = split < 0 ? "0" : detail.slice(split + 1);
				this.floating(
					`−${amount}`,
					target === "player" ? -355 : 350,
					108,
					TOKENS.rose,
				);
				this.hitPulse(target === "player" ? "PlayerPanel" : "EnemyPanel");
				if (target !== "player")
					this.feedbackSprite(
						this.playerSprite,
						BATTLE_ASSETS.playerAttack,
						BATTLE_ASSETS.playerIdle,
					);
			} else if (event.type === "BlockGained")
				this.floating(`+${event.detail ?? "0"}`, -355, 115, TOKENS.cyan);
			else if (event.type === "EnemyActed") {
				this.intentPulse();
				this.feedbackSprite(
					this.enemySprite,
					BATTLE_ASSETS.enemyCast,
					BATTLE_ASSETS.enemyIdle,
				);
			} else if (event.type === "TurnEnded") this.turnCue();
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
			.delay(0.28)
			.to(0.12, { opacity: 245 })
			.call(() => done?.())
			.start();
	}

	private background(): void {
		const back = graphics(this.node, "DreamBackdrop");
		back.fillColor = TOKENS.indigo;
		back.rect(-640, -360, 1280, 720);
		back.fill();
		const artwork = new Node("DreamBackdropArtwork");
		this.node.addChild(artwork);
		artwork.layer = this.node.layer;
		artwork.addComponent(UITransform).setContentSize(1280, 720);
		const sprite = artwork.addComponent(cocos.Sprite);
		sprite.sizeMode = cocos.Sprite.SizeMode.CUSTOM;
		void loadSpriteFrame(BATTLE_ASSETS.background).then((frame) => {
			if (frame) sprite.spriteFrame = frame;
		});
		const cloud = graphics(this.node, "DreamCloudHaze", 0, -30);
		cloud.fillColor = new Color(67, 45, 128, 24);
		cloud.moveTo(-640, 82);
		cloud.lineTo(-430, 126);
		cloud.lineTo(-210, 100);
		cloud.lineTo(20, 138);
		cloud.lineTo(260, 98);
		cloud.lineTo(470, 128);
		cloud.lineTo(640, 92);
		cloud.lineTo(640, 38);
		cloud.lineTo(420, 70);
		cloud.lineTo(190, 48);
		cloud.lineTo(-40, 80);
		cloud.lineTo(-280, 42);
		cloud.lineTo(-500, 72);
		cloud.lineTo(-640, 46);
		cloud.close();
		cloud.fill();
		const horizon = graphics(this.node, "PaperHorizon", 0, -182);
		horizon.fillColor = new Color(24, 34, 78, 245);
		horizon.moveTo(-640, 60);
		horizon.lineTo(-430, 128);
		horizon.lineTo(-210, 74);
		horizon.lineTo(20, 142);
		horizon.lineTo(260, 84);
		horizon.lineTo(470, 132);
		horizon.lineTo(640, 72);
		horizon.lineTo(640, -180);
		horizon.lineTo(-640, -180);
		horizon.close();
		horizon.fill();
		const stars = graphics(this.node, "Stars");
		stars.fillColor = new Color(255, 223, 151, 190);
		for (const [x, y, r] of [
			[-540, 206, 3],
			[-420, 154, 2],
			[-92, 247, 3],
			[132, 194, 2],
			[430, 236, 3],
			[556, 140, 2],
			[302, 157, 2],
		] as number[][])
			stars.circle(x, y, r);
		stars.fill();
		const frame = graphics(this.node, "Frame");
		frame.strokeColor = new Color(113, 94, 164, 200);
		frame.lineWidth = 2;
		frame.roundRect(-630, -350, 1260, 700, 20);
		frame.stroke();
	}

	private topHud(view: GameView, options: BattleViewOptions): void {
		const bar = panel(
			this.node,
			"GameHUD",
			0,
			312,
			1200,
			58,
			new Color(15, 18, 49, 248),
			new Color(105, 90, 157, 240),
			14,
			1.5,
		);
		const avatar = graphics(bar, "Avatar", -554, 0);
		avatar.fillColor = new Color(231, 193, 170);
		avatar.circle(0, 8, 16);
		avatar.fill();
		avatar.fillColor = new Color(79, 53, 106);
		avatar.circle(-6, 10, 3);
		avatar.circle(6, 10, 3);
		avatar.fill();
		label(
			bar,
			this.locale === "zh" ? "旅梦者" : "CHARACTER",
			-492,
			8,
			13,
			TOKENS.paper,
			110,
		);
		label(
			bar,
			`${this.locale === "zh" ? "生命" : "HP"} ${view.combat?.playerHp ?? 0}/${view.combat?.playerMaxHp ?? 0}`,
			-492,
			-12,
			11,
			new Color(255, 153, 166),
			110,
		);
		this.hudChip(
			bar,
			this.locale === "zh" ? "金币" : "GOLD",
			String(view.gold),
			-245,
			TOKENS.gold,
		);
		this.hudChip(
			bar,
			this.locale === "zh" ? "格挡" : "BLOCK",
			String(view.combat?.playerBlock ?? 0),
			-360,
			TOKENS.cyan,
		);
		const relicText =
			view.relics
				.slice(0, 3)
				.map((id) => `✦ ${RELIC_LABELS[id]?.[this.locale] ?? id}`)
				.join("  ") || (this.locale === "zh" ? "暂无遗物" : "NO RELICS");
		label(bar, relicText, -70, 0, 10, TOKENS.muted, 245);
		const currentRank = view.map.find(
			(item) => item.id === view.currentNodeId,
		)?.rank;
		label(
			bar,
			this.locale === "zh"
				? `区域 · 第 ${(currentRank ?? 0) + 1} 幕`
				: `AREA · ACT ${(currentRank ?? 0) + 1}`,
			175,
			0,
			11,
			TOKENS.gold,
			160,
		);
		label(
			bar,
			this.locale === "zh" ? "梦境之塔" : "TOWER OF DREAMS",
			380,
			0,
			12,
			TOKENS.paper,
			190,
		);
		button(
			bar,
			"⚙",
			552,
			0,
			42,
			34,
			() => {
				if (options.canOpenMenu()) pauseMenu(this.node, this.locale, options);
			},
			new Color(42, 36, 79),
			TOKENS.gold,
			16,
		);
	}

	private relicRail(view: GameView): void {
		const rail = panel(
			this.node,
			"RelicRail",
			-584,
			145,
			54,
			252,
			new Color(12, 16, 44, 224),
			new Color(91, 82, 143, 190),
			14,
			1,
		);
		label(
			rail,
			this.locale === "zh" ? "遗物" : "RELICS",
			0,
			108,
			8,
			TOKENS.muted,
			48,
		);
		const ids = view.relics.length ? view.relics.slice(0, 4) : ["empty"];
		ids.forEach((id, index) => {
			const icon = graphics(rail, `RelicIcon:${id}`, 0, 70 - index * 43);
			icon.fillColor = id === "empty" ? TOKENS.locked : TOKENS.violet;
			icon.circle(0, 0, 14);
			icon.fill();
			icon.strokeColor = id === "empty" ? TOKENS.locked : TOKENS.gold;
			icon.lineWidth = 1;
			icon.circle(0, 0, 14);
			icon.stroke();
			label(
				rail,
				id === "empty" ? "·" : "✦",
				0,
				64 - index * 43,
				12,
				id === "empty" ? TOKENS.muted : TOKENS.gold,
				28,
			);
		});
	}

	private hudChip(
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
			104,
			34,
			new Color(28, 31, 70),
			new Color(71, 75, 133),
			9,
			1,
		);
		label(chip, title, -22, 4, 8, accent, 42);
		label(chip, value, 25, 0, 14, TOKENS.paper, 36);
	}

	private player(view: GameView): void {
		const combat = view.combat!;
		const zone = new Node("PlayerPanel");
		this.node.addChild(zone);
		zone.layer = this.node.layer;
		zone.setPosition(-360, 86);
		zone.addComponent(UITransform).setContentSize(240, 250);
		this.playerSprite = this.figure(zone, -8, -4, false);
		label(
			zone,
			this.locale === "zh" ? "旅梦者" : "DREAMER",
			0,
			117,
			12,
			new Color(190, 213, 244),
			180,
		);
		label(
			zone,
			`${combat.playerHp}/${combat.playerMaxHp}`,
			0,
			-90,
			18,
			TOKENS.paper,
			120,
		);
		healthBar(
			zone,
			0,
			-112,
			150,
			combat.playerHp,
			combat.playerMaxHp,
			new Color(81, 211, 173),
		);
		label(
			zone,
			`${this.locale === "zh" ? "格挡" : "BLOCK"} ${combat.playerBlock}`,
			0,
			-133,
			12,
			TOKENS.cyan,
			130,
		);
		this.statuses(zone, combat.playerStatuses, -2, -153);
	}

	private enemy(view: GameView): void {
		const combat = view.combat!;
		const zone = new Node("EnemyPanel");
		this.node.addChild(zone);
		zone.layer = this.node.layer;
		zone.setPosition(360, 86);
		zone.addComponent(UITransform).setContentSize(250, 250);
		this.enemySprite = this.figure(zone, 0, 0, true);
		label(
			zone,
			this.enemyLabel(combat.enemyName),
			0,
			117,
			14,
			new Color(255, 214, 218),
			200,
		);
		label(
			zone,
			`${combat.enemyHp}/${combat.enemyMaxHp}`,
			0,
			-90,
			18,
			TOKENS.paper,
			120,
		);
		healthBar(
			zone,
			0,
			-112,
			150,
			combat.enemyHp,
			combat.enemyMaxHp,
			TOKENS.rose,
		);
		label(
			zone,
			`${this.locale === "zh" ? "格挡" : "BLOCK"} ${combat.enemyBlock}`,
			0,
			-133,
			12,
			new Color(220, 173, 226),
			130,
		);
		this.statuses(zone, combat.enemyStatuses, 0, -153);
		const intent = new Node("IntentView");
		this.node.addChild(intent);
		intent.layer = this.node.layer;
		intent.setPosition(360, 225);
		intent.addComponent(UITransform).setContentSize(180, 48);
		label(
			intent,
			`⚔ ${combat.enemyIntentDamage} × 1`,
			0,
			0,
			15,
			new Color(255, 216, 191),
			130,
		);
	}

	private figure(
		parent: Node,
		x: number,
		y: number,
		enemy: boolean,
	): SpriteComponent {
		const artwork = new Node(enemy ? "EnemyPortrait" : "PlayerPortrait");
		parent.addChild(artwork);
		artwork.layer = parent.layer;
		artwork.setPosition(x, y);
		artwork.addComponent(UITransform).setContentSize(250, 220);
		const sprite = artwork.addComponent(cocos.Sprite);
		sprite.sizeMode = cocos.Sprite.SizeMode.CUSTOM;
		const idle = enemy ? BATTLE_ASSETS.enemyIdle : BATTLE_ASSETS.playerIdle;
		const action = enemy ? BATTLE_ASSETS.enemyCast : BATTLE_ASSETS.playerAttack;
		void loadSpriteFrame(idle).then((frame) => {
			if (frame) sprite.spriteFrame = frame;
		});
		void loadSpriteFrame(action);
		const shadow = graphics(parent, "CharacterShadow", x, -55);
		shadow.fillColor = new Color(6, 8, 27, 150);
		shadow.roundRect(enemy ? -70 : -57, -5, enemy ? 140 : 114, 12, 6);
		shadow.fill();
		return sprite;
	}

	private feedbackSprite(
		sprite: SpriteComponent | undefined,
		action: string,
		idle: string,
	): void {
		const actionFrame = loadedSpriteFrames.get(action);
		const idleFrame = loadedSpriteFrames.get(idle);
		if (!sprite || !actionFrame || !idleFrame) return;
		sprite.spriteFrame = actionFrame;
		setTimeout(() => {
			if (sprite.spriteFrame === actionFrame) sprite.spriteFrame = idleFrame;
		}, 180);
	}

	private statuses(
		parent: Node,
		statuses: Array<{ id: string; stacks: number }>,
		x: number,
		y: number,
	): void {
		label(
			parent,
			statuses.length
				? statuses
						.map(
							(status) =>
								`${STATUS_LABELS[status.id]?.[this.locale] ?? status.id} ${status.stacks}`,
						)
						.join("  ")
				: this.locale === "zh"
					? "状态：无"
					: "STATUS: NONE",
			x,
			y,
			10,
			TOKENS.muted,
			210,
		);
	}

	private hand(view: GameView, options: BattleViewOptions): void {
		const combat = view.combat!;
		new HandView(this.node, combat.hand, combat.energy, {
			locale: options.locale,
			selectedId: options.selectedId,
			onSelect: (card) => options.onCard(card.instanceId, combat.enemyId),
		});
		const resources = panel(
			this.node,
			"ResourceBar",
			0,
			-329,
			1200,
			38,
			new Color(11, 15, 41, 246),
			new Color(67, 70, 126),
			11,
			1,
		);
		const energyOrb = graphics(resources, "EnergyOrb", -545, 0);
		energyOrb.fillColor = new Color(45, 103, 143, 255);
		energyOrb.circle(0, 0, 28);
		energyOrb.fill();
		energyOrb.strokeColor = TOKENS.cyan;
		energyOrb.lineWidth = 2;
		energyOrb.circle(0, 0, 28);
		energyOrb.stroke();
		label(resources, `${combat.energy}`, -545, 0, 18, TOKENS.paper, 44);
		label(
			resources,
			this.locale === "zh" ? "能量" : "ENERGY",
			-478,
			7,
			10,
			TOKENS.gold,
			80,
		);
		label(resources, `${combat.energy}/3`, -478, -8, 11, TOKENS.paper, 80);
		for (let i = 0; i < 3; i++) {
			const pip = graphics(resources, `Energy${i}`, -424 + i * 21, 0);
			pip.fillColor = i < combat.energy ? TOKENS.gold : new Color(62, 67, 102);
			pip.circle(0, 0, 6);
			pip.fill();
		}
		label(
			resources,
			`◈ ${combat.drawCount}`,
			-290,
			0,
			10,
			new Color(143, 150, 190),
			80,
		);
		label(
			resources,
			`◌ ${combat.discardCount}`,
			-190,
			0,
			10,
			new Color(143, 150, 190),
			95,
		);
		label(
			resources,
			`✧ ${combat.exhaustCount}`,
			-80,
			0,
			10,
			new Color(143, 150, 190),
			95,
		);
		for (const [x, value] of [
			[35, this.locale === "zh" ? "◌ 状态" : "◌ STATUS"],
			[120, this.locale === "zh" ? "✦ 遗物" : "✦ RELICS"],
			[205, this.locale === "zh" ? "▤ 记录" : "▤ LOG"],
		] as [number, string][]) {
			label(resources, value, x, 0, 9, TOKENS.paper, 75);
		}
		label(
			resources,
			`${this.locale === "zh" ? "回合" : "TURN"} ${combat.turn}`,
			300,
			0,
			10,
			TOKENS.muted,
			85,
		);
		label(
			resources,
			`${this.locale === "zh" ? "弃牌" : "DISCARD"} ${combat.discardCount}`,
			405,
			0,
			10,
			TOKENS.muted,
			100,
		);
		button(
			resources,
			this.locale === "zh" ? "结束回合" : "END TURN",
			510,
			0,
			150,
			36,
			options.onEndTurn,
			new Color(117, 53, 112),
			new Color(248, 165, 119),
			11,
		);
	}

	private resultOverlay(won: boolean, done?: () => void): void {
		const overlay = panel(
			this.node,
			"BattleResultOverlay",
			0,
			35,
			430,
			150,
			won ? new Color(67, 51, 101, 250) : new Color(44, 37, 78, 250),
			won ? TOKENS.gold : new Color(201, 124, 186),
			22,
		);
		label(
			overlay,
			won
				? this.locale === "zh"
					? "胜利！"
					: "VICTORY!"
				: this.locale === "zh"
					? "梦境破碎…"
					: "DEFEAT…",
			0,
			39,
			28,
			won ? new Color(255, 222, 139) : new Color(239, 170, 218),
			390,
		);
		label(
			overlay,
			won
				? this.locale === "zh"
					? "敌人已被击退"
					: "THE FOE HAS FALLEN"
				: this.locale === "zh"
					? "旅程暂告一段落"
					: "THE DREAM FADES",
			0,
			2,
			12,
			TOKENS.paper,
			380,
		);
		button(
			overlay,
			this.locale === "zh" ? "继续" : "CONTINUE",
			0,
			-45,
			140,
			32,
			() => done?.(),
			new Color(50, 47, 90),
			new Color(220, 184, 130),
			11,
		);
	}

	private floating(value: string, x: number, y: number, color: Color): void {
		const node = new Node("FloatingNumber");
		this.node.addChild(node);
		node.layer = this.node.layer;
		node.setPosition(x, y);
		node.addComponent(UITransform).setContentSize(150, 34);
		const text = node.addComponent(Label);
		text.string = value;
		text.fontSize = 23;
		text.color = color;
		const opacity = node.addComponent(UIOpacity);
		opacity.opacity = 255;
		tween(opacity).delay(0.18).to(0.22, { opacity: 0 }).start();
	}
	private hitPulse(name: string): void {
		const node = this.node.getChildByName(name);
		if (node) pulse(node, 130);
	}
	private intentPulse(): void {
		const node = this.node.getChildByName("IntentView");
		if (node) pulse(node, 120);
	}
	private turnCue(): void {
		this.floating(
			this.locale === "zh" ? "敌方回合" : "ENEMY TURN",
			0,
			166,
			TOKENS.gold,
		);
	}
	private enemyLabel(id: string): string {
		return ENEMY_LABELS[id]?.[this.locale] ?? id;
	}
}
