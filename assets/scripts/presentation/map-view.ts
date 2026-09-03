import {
	Button,
	Color,
	Graphics,
	Node,
	UIOpacity,
	UITransform,
	tween,
} from "cc";
import * as cc from "cc";
import type { GameView } from "../app/game-facade";
import { TOKENS, button, graphics, label, panel, pauseMenu } from "./ui-kit";

const MAP_ASSETS = {
	background: "art/map/map_bg_dream_sky_01/texture",
	board: "art/map/map_board_parchment_01/texture",
	start: "art/map/map_node_start/texture",
	combat: "art/map/map_node_combat/texture",
	elite: "art/map/map_node_elite/texture",
	event: "art/map/map_node_event/texture",
	shop: "art/map/map_node_shop/texture",
	camp: "art/map/map_node_camp/texture",
	boss: "art/map/map_node_boss/texture",
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
				resolve(frame);
			});
		} catch {
			resolve(undefined);
		}
	});
	spriteFrameLoads.set(path, loading);
	return loading;
}

export type MapViewOptions = {
	locale: "zh" | "en";
	onLanguage: () => void;
	onNewRun: () => void;
	onSave: () => void;
	onSelectNode: (id: string) => void;
};

type Point = { x: number; y: number };
type Copy = { zh: string; en: string };

const NAMES: Record<string, Copy> = {
	start: { zh: "起点", en: "START" },
	combat: { zh: "战斗", en: "COMBAT" },
	elite: { zh: "精英", en: "ELITE" },
	shop: { zh: "商店", en: "SHOP" },
	event: { zh: "事件", en: "EVENT" },
	camp: { zh: "营地", en: "CAMP" },
	boss: { zh: "首领", en: "BOSS" },
};
const RELICS: Record<string, Copy> = {
	anchor: { zh: "锚", en: "Anchor" },
	coinPurse: { zh: "钱袋", en: "Coin Purse" },
	ironHeart: { zh: "钢铁之心", en: "Iron Heart" },
};

/** DreamQuest's fixed route board: nine ranks stay visible without scrolling. */
export class MapView {
	readonly node: Node;
	private readonly locale: "zh" | "en";
	private readonly positions = new Map<string, Point>();

	constructor(parent: Node, view: GameView, options: MapViewOptions) {
		this.locale = options.locale;
		this.node = new Node("MapView");
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		this.layout(view.map);
		this.background();
		this.hud(view, options);
		this.edges(view);
		this.legend();
		this.nodes(view, options);
	}

	private layout(map: GameView["map"]): void {
		const points: Record<number, Point[]> = {
			0: [{ x: -465, y: -218 }],
			1: [
				{ x: -362, y: -157 },
				{ x: -205, y: -184 },
			],
			2: [
				{ x: -391, y: -76 },
				{ x: -140, y: -105 },
			],
			3: [
				{ x: -315, y: 4 },
				{ x: -48, y: -14 },
			],
			4: [
				{ x: -259, y: 80 },
				{ x: 66, y: 59 },
			],
			5: [
				{ x: -153, y: 143 },
				{ x: 170, y: 128 },
			],
			6: [
				{ x: -43, y: 184 },
				{ x: 275, y: 167 },
			],
			7: [
				{ x: 70, y: 222 },
				{ x: 335, y: 207 },
			],
			8: [{ x: 205, y: 240 }],
		};
		for (const item of map) {
			const rank = points[item.rank] ?? [{ x: 0, y: 0 }];
			const branch =
				item.rank === 0 || item.rank === 8 ? 0 : item.id.endsWith("a") ? 0 : 1;
			this.positions.set(item.id, rank[Math.min(branch, rank.length - 1)]);
		}
	}

	private background(): void {
		const backdropFallback = new Node("DreamBackdropFallback");
		this.node.addChild(backdropFallback);
		backdropFallback.layer = this.node.layer;
		const backdropOpacity = backdropFallback.addComponent(UIOpacity);
		this.dreamBackdrop(backdropFallback);
		const backdropArtwork = new Node("DreamBackdropArtwork");
		this.node.addChild(backdropArtwork);
		backdropArtwork.layer = this.node.layer;
		backdropArtwork.addComponent(UITransform).setContentSize(1280, 720);
		const backdropSprite = backdropArtwork.addComponent(cocos.Sprite);
		backdropSprite.sizeMode = cocos.Sprite.SizeMode.CUSTOM;
		void loadSpriteFrame(MAP_ASSETS.background).then((frame) => {
			if (
				frame &&
				(this.node as unknown as { isValid?: boolean }).isValid !== false &&
				(backdropArtwork as unknown as { isValid?: boolean }).isValid !== false
			) {
				backdropSprite.spriteFrame = frame;
				backdropOpacity.opacity = 0;
			}
		});
		const frame = panel(
			this.node,
			"NavyMapFrame",
			0,
			-10,
			1160,
			570,
			new Color(10, 18, 39, 255),
			new Color(57, 74, 101, 255),
			18,
			3,
		);
		const paper = panel(
			frame,
			"ParchmentMap",
			-62,
			0,
			930,
			566,
			new Color(231, 213, 174, 255),
			new Color(122, 104, 77, 255),
			15,
			2,
		);
		const paperArtwork = new Node("ParchmentMapArtwork");
		frame.addChild(paperArtwork);
		paperArtwork.layer = frame.layer;
		paperArtwork.setPosition(-62, 0);
		paperArtwork.addComponent(UITransform).setContentSize(930, 566);
		const paperSprite = paperArtwork.addComponent(cocos.Sprite);
		paperSprite.sizeMode = cocos.Sprite.SizeMode.CUSTOM;
		const paperOpacity = paper.addComponent(UIOpacity);
		void loadSpriteFrame(MAP_ASSETS.board).then((loadedFrame) => {
			if (
				loadedFrame &&
				(this.node as unknown as { isValid?: boolean }).isValid !== false &&
				(paperArtwork as unknown as { isValid?: boolean }).isValid !== false
			) {
				paperSprite.spriteFrame = loadedFrame;
				paperOpacity.opacity = 0;
			}
		});
		const texture = graphics(paper, "ParchmentTexture");
		texture.fillColor = new Color(178, 148, 105, 20);
		for (const [x, y, r] of [
			[-350, 155, 70],
			[-80, -180, 92],
			[245, 135, 58],
			[360, -120, 80],
		] as number[][])
			texture.circle(x, y, r);
		texture.fill();
		const terrain = graphics(paper, "ParchmentTerrain");
		terrain.strokeColor = new Color(121, 103, 76, 45);
		terrain.lineWidth = 1;
		for (const [x, y] of [
			[-395, 180],
			[-220, -210],
			[25, 190],
			[315, -155],
			[385, 65],
		] as number[][]) {
			terrain.moveTo(x - 18, y);
			terrain.lineTo(x - 7, y + 5);
			terrain.lineTo(x + 9, y - 5);
			terrain.lineTo(x + 20, y + 1);
			terrain.moveTo(x, y - 13);
			terrain.lineTo(x + 5, y - 4);
			terrain.lineTo(x - 3, y + 10);
		}
		terrain.stroke();
		const contours = graphics(paper, "ParchmentContours");
		contours.strokeColor = new Color(121, 103, 76, 28);
		contours.lineWidth = 1;
		for (const [cx, cy, rx, ry] of [
			[-350, 155, 92, 42],
			[-80, -180, 115, 52],
			[245, 135, 78, 35],
			[360, -120, 105, 48],
		] as number[][]) {
			for (const inset of [0, 10, 20]) {
				for (let index = 0; index <= 8; index += 1) {
					const angle = (index / 8) * Math.PI * 2;
					const x = cx + Math.cos(angle) * (rx - inset);
					const y = cy + Math.sin(angle) * (ry - inset * 0.45);
					index ? contours.lineTo(x, y) : contours.moveTo(x, y);
				}
				contours.close();
			}
		}
		contours.stroke();
	}

	private dreamBackdrop(parent: Node): void {
		const sky = graphics(parent, "DreamSkyPlaceholder");
		sky.fillColor = new Color(17, 18, 57, 255);
		sky.rect(-640, -360, 1280, 720);
		sky.fill();
		for (const [y, color] of [
			[300, new Color(43, 35, 88, 255)],
			[210, new Color(51, 42, 105, 255)],
			[120, new Color(40, 43, 101, 255)],
			[30, new Color(27, 34, 81, 255)],
		] as Array<[number, Color]>) {
			sky.fillColor = color;
			sky.rect(-640, y - 45, 1280, 90);
			sky.fill();
		}
		const stars = graphics(parent, "DreamStarsPlaceholder");
		stars.fillColor = new Color(255, 224, 167, 205);
		for (const [x, y, radius] of [
			[-590, 300, 2],
			[-520, 238, 1],
			[-420, 327, 1],
			[-330, 282, 2],
			[-235, 322, 1],
			[-118, 294, 1],
			[12, 331, 2],
			[148, 298, 1],
			[292, 329, 2],
			[424, 285, 1],
			[558, 316, 2],
			[615, 226, 1],
			[-610, -300, 1],
			[-540, -326, 2],
			[-375, -302, 1],
			[430, -318, 2],
			[570, -275, 1],
		] as number[][]) {
			stars.circle(x, y, radius);
		}
		stars.fill();
		const clouds = graphics(parent, "DreamCloudsPlaceholder");
		clouds.fillColor = new Color(132, 124, 185, 48);
		for (const [x, y, width] of [
			[-548, 190, 150],
			[536, 178, 170],
			[-576, -218, 180],
			[576, -204, 140],
		] as number[][]) {
			clouds.circle(x - width * 0.28, y, width * 0.22);
			clouds.circle(x, y + 10, width * 0.3);
			clouds.circle(x + width * 0.28, y, width * 0.2);
		}
		clouds.fill();
		const islands = graphics(parent, "FloatingIslandsPlaceholder");
		islands.fillColor = new Color(25, 26, 62, 220);
		for (const [x, y, width] of [
			[-560, 110, 92],
			[560, 96, 105],
			[-570, -265, 78],
			[574, -258, 84],
		] as number[][]) {
			islands.moveTo(x - width / 2, y + 8);
			islands.lineTo(x + width / 2, y + 8);
			islands.lineTo(x + width * 0.2, y - 20);
			islands.lineTo(x, y - 34);
			islands.lineTo(x - width * 0.22, y - 19);
			islands.close();
		}
		islands.fill();
	}

	private hud(view: GameView, options: MapViewOptions): void {
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
				.map((id) => `✦ ${RELICS[id]?.[this.locale] ?? id}`)
				.join("  ") || (this.locale === "zh" ? "暂无遗物" : "NO RELICS");
		label(bar, relicText, -112, 0, 10, new Color(206, 194, 172), 245);
		const current = view.map.find((item) => item.id === view.currentNodeId);
		label(
			bar,
			this.locale === "zh"
				? `梦境层数 ${Math.min(9, (current?.rank ?? 0) + 1)}`
				: `DREAM LAYER ${Math.min(9, (current?.rank ?? 0) + 1)}`,
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

	private edges(view: GameView): void {
		const glow = graphics(this.node, "ActivePathGlow");
		const paths = graphics(this.node, "InkRoutePaths");
		for (const source of view.map) {
			const from = this.positions.get(source.id);
			if (!from) continue;
			for (const targetId of source.next) {
				const to = this.positions.get(targetId);
				if (!to) continue;
				const target = view.map.find((item) => item.id === targetId);
				const active =
					source.id === view.currentNodeId && Boolean(target?.enabled);
				const trail = source.visited && Boolean(target?.visited);
				if (active) {
					glow.strokeColor = new Color(45, 132, 147, 84);
					glow.lineWidth = 11;
					this.dashedCurve(glow, from, to, this.bend(source.id, targetId));
				}
				paths.strokeColor = active
					? new Color(35, 107, 123, 255)
					: trail
						? new Color(107, 87, 76, 220)
						: new Color(79, 76, 74, 212);
				paths.lineWidth = active ? 3.3 : trail ? 2.6 : 2.2;
				this.dashedCurve(paths, from, to, this.bend(source.id, targetId));
				if (active) this.routeArrow(paths, from, to);
			}
		}
	}

	private routeArrow(graph: Graphics, from: Point, to: Point): void {
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const length = Math.sqrt(dx * dx + dy * dy) || 1;
		const x = to.x - (dx / length) * 13;
		const y = to.y - (dy / length) * 13;
		const nx = -dy / length;
		const ny = dx / length;
		graph.moveTo(x, y);
		graph.lineTo(
			x - (dx / length) * 8 + nx * 5,
			y - (dy / length) * 8 + ny * 5,
		);
		graph.moveTo(x, y);
		graph.lineTo(
			x - (dx / length) * 8 - nx * 5,
			y - (dy / length) * 8 - ny * 5,
		);
		graph.stroke();
	}

	private bend(sourceId: string, targetId: string): number {
		const seed =
			(sourceId.charCodeAt(sourceId.length - 1) +
				targetId.charCodeAt(targetId.length - 1)) %
			3;
		return (seed - 1) * 22;
	}

	private dashedCurve(
		graph: Graphics,
		from: Point,
		to: Point,
		bend: number,
	): void {
		const points: Point[] = [];
		for (let index = 0; index <= 12; index += 1) {
			const t = index / 12;
			const u = 1 - t;
			const controlX = (from.x + to.x) / 2 + bend;
			const controlY = (from.y + to.y) / 2;
			points.push({
				x: u * u * from.x + 2 * u * t * controlX + t * t * to.x,
				y: u * u * from.y + 2 * u * t * controlY + t * t * to.y,
			});
		}
		for (let index = 0; index < points.length - 1; index += 1) {
			if (index % 2 === 0) graph.moveTo(points[index].x, points[index].y);
			else continue;
			graph.lineTo(points[index + 1].x, points[index + 1].y);
		}
		graph.stroke();
	}

	private legend(): void {
		const box = panel(
			this.node,
			"MapLegend",
			468,
			0,
			172,
			566,
			new Color(231, 213, 174, 255),
			new Color(122, 104, 77, 255),
			14,
			1,
		);
		label(
			box,
			this.locale === "zh" ? "地图图例" : "MAP LEGEND",
			0,
			218,
			12,
			TOKENS.ink,
			150,
		);
		const types = ["combat", "elite", "camp", "event", "shop", "boss"];
		for (let index = 0; index < types.length; index += 1) {
			const type = types[index];
			const y = 174 - index * 38;
			const iconNode = new Node(`Legend:${type}`);
			box.addChild(iconNode);
			iconNode.layer = box.layer;
			iconNode.setPosition(-57, y);
			iconNode.addComponent(UITransform).setContentSize(30, 30);
			const fallback = new Node("LegendIconGraphicsFallback");
			iconNode.addChild(fallback);
			fallback.layer = iconNode.layer;
			const fallbackOpacity = fallback.addComponent(UIOpacity);
			const icon = fallback.addComponent(Graphics);
			icon.strokeColor =
				type === "boss" ? new Color(125, 64, 55) : new Color(62, 53, 45);
			icon.fillColor =
				type === "boss" ? new Color(165, 103, 73) : new Color(195, 171, 127);
			icon.lineWidth = 1.5;
			this.drawShape(icon, type, type === "boss" ? 22 : 18);
			icon.fill();
			icon.stroke();
			const artwork = new Node("LegendIconApprovedArtwork");
			iconNode.addChild(artwork);
			artwork.layer = iconNode.layer;
			artwork.addComponent(UITransform).setContentSize(24, 24);
			const sprite = artwork.addComponent(cocos.Sprite);
			sprite.sizeMode = cocos.Sprite.SizeMode.CUSTOM;
			const assetPath = MAP_ASSETS[type as keyof typeof MAP_ASSETS];
			if (assetPath)
				void loadSpriteFrame(assetPath).then((frame) => {
					if (
						frame &&
						(this.node as unknown as { isValid?: boolean }).isValid !== false &&
						(artwork as unknown as { isValid?: boolean }).isValid !== false
					) {
						sprite.spriteFrame = frame;
						fallbackOpacity.opacity = 0;
					}
				});
			label(box, NAMES[type][this.locale], -4, y - 3, 10, TOKENS.ink, 92);
		}
		const cue = graphics(box, "BossDirectionCue", 0, -222);
		cue.strokeColor = new Color(112, 78, 61, 180);
		cue.lineWidth = 1.5;
		cue.moveTo(-53, -3);
		cue.lineTo(38, -3);
		cue.lineTo(28, 4);
		cue.moveTo(38, -3);
		cue.lineTo(28, -10);
		cue.stroke();
		label(
			box,
			this.locale === "zh" ? "向首领前进" : "TOWARD BOSS",
			0,
			-250,
			9,
			new Color(105, 70, 57),
			140,
		);
	}

	private nodes(view: GameView, options: MapViewOptions): void {
		for (const item of view.map) {
			const point = this.positions.get(item.id);
			if (!point) continue;
			const current = item.id === view.currentNodeId;
			const size = item.type === "boss" ? 64 : item.type === "start" ? 48 : 46;
			const node = new Node(`MapNode:${item.type}`);
			this.node.addChild(node);
			node.layer = this.node.layer;
			node.setPosition(point.x, point.y);
			node.addComponent(UITransform).setContentSize(size + 26, size + 26);
			const fallback = new Node("MapNodeGraphicsFallback");
			node.addChild(fallback);
			fallback.layer = node.layer;
			const fallbackOpacity = fallback.addComponent(UIOpacity);
			const shape = fallback.addComponent(Graphics);
			const enabled = item.enabled;
			const fill = current
				? new Color(67, 54, 55, 255)
				: item.type === "boss"
					? new Color(91, 51, 47, item.visited ? 255 : 220)
					: enabled
						? new Color(30, 59, 71, 255)
						: item.visited
							? new Color(151, 123, 88, 240)
							: new Color(199, 181, 143, 238);
			const edge = current
				? TOKENS.gold
				: item.type === "boss"
					? new Color(128, 66, 56, 255)
					: enabled
						? new Color(27, 77, 83, 255)
						: item.visited
							? new Color(86, 66, 54, 235)
							: new Color(119, 106, 88, 205);
			shape.fillColor = fill;
			shape.strokeColor = edge;
			shape.lineWidth =
				current || item.type === "boss" ? 3.5 : enabled ? 2.8 : 1.6;
			this.drawShape(shape, item.type, size);
			shape.fill();
			shape.stroke();
			const icon = graphics(fallback, `MapNodeIconGraphic:${item.type}`);
			icon.fillColor =
				current || enabled ? TOKENS.paper : new Color(73, 63, 54);
			icon.strokeColor =
				current || enabled ? TOKENS.paper : new Color(73, 63, 54);
			icon.lineWidth = 2;
			this.drawIcon(icon, item.type, size);
			const artwork = new Node("MapNodeApprovedArtwork");
			node.addChild(artwork);
			artwork.layer = node.layer;
			artwork.addComponent(UITransform).setContentSize(size, size);
			const sprite = artwork.addComponent(cocos.Sprite);
			sprite.sizeMode = cocos.Sprite.SizeMode.CUSTOM;
			const artworkOpacity = artwork.addComponent(UIOpacity);
			artworkOpacity.opacity =
				current || enabled ? 255 : item.visited ? 195 : 110;
			const assetPath = MAP_ASSETS[item.type as keyof typeof MAP_ASSETS];
			if (assetPath)
				void loadSpriteFrame(assetPath).then((frame) => {
					if (
						frame &&
						(this.node as unknown as { isValid?: boolean }).isValid !== false &&
						(artwork as unknown as { isValid?: boolean }).isValid !== false
					) {
						sprite.spriteFrame = frame;
						fallbackOpacity.opacity = 0;
					}
				});
			if (item.visited && !current) {
				const mark = graphics(node, "VisitedMark", size * 0.28, size * 0.28);
				mark.fillColor = new Color(239, 207, 136, 255);
				mark.circle(0, 0, 4);
				mark.fill();
			}
			if (!current && !enabled && !item.visited) this.lockMark(node, size);
			const focus = graphics(node, "StateRing");
			focus.strokeColor = current
				? TOKENS.gold
				: enabled
					? new Color(36, 111, 116)
					: new Color(77, 69, 60, 180);
			focus.lineWidth = current || item.type === "boss" ? 2.5 : 1.2;
			focus.circle(0, 0, size / 2 + 7);
			focus.stroke();
			const opacity = focus.node.addComponent(UIOpacity);
			opacity.opacity = current || enabled ? 255 : item.visited ? 200 : 150;
			if (current || enabled)
				tween(opacity)
					.repeatForever(
						tween(opacity)
							.to(0.55, { opacity: current ? 145 : 205 })
							.to(0.55, { opacity: 255 }),
					)
					.start();
			if (current) this.currentFx(node, size);
			if (item.type === "boss") this.bossAura(node, size);
			if (current) this.traveler(point);
			const control = node.addComponent(Button);
			control.interactable = enabled;
			if (enabled)
				control.node.on(
					Button.EventType.CLICK,
					() => options.onSelectNode(item.id),
					this,
				);
			if (enabled) {
				node.on(
					Node.EventType.TOUCH_START,
					() => node.setScale(0.9, 0.9, 1),
					this,
				);
				node.on(Node.EventType.TOUCH_END, () => node.setScale(1, 1, 1), this);
				node.on(
					Node.EventType.TOUCH_CANCEL,
					() => node.setScale(1, 1, 1),
					this,
				);
			}
		}
	}

	private lockMark(parent: Node, size: number): void {
		const lock = graphics(parent, "LockedMark", size * 0.25, size * 0.25);
		lock.fillColor = new Color(57, 51, 53, 205);
		lock.strokeColor = new Color(237, 213, 166, 180);
		lock.lineWidth = 1;
		lock.roundRect(-5, -5, 10, 8, 2);
		lock.fill();
		lock.stroke();
		lock.moveTo(-3, 3);
		lock.circle(0, 3, 3);
		lock.stroke();
	}

	private currentFx(parent: Node, size: number): void {
		const fx = graphics(parent, "CurrentNodeFxPlaceholder");
		fx.strokeColor = new Color(255, 215, 132, 100);
		fx.lineWidth = 1.5;
		fx.circle(0, 0, size / 2 + 15);
		fx.fillColor = new Color(255, 215, 132, 180);
		for (const [x, y] of [
			[-size * 0.65, size * 0.7],
			[size * 0.7, size * 0.55],
			[size * 0.72, -size * 0.6],
			[-size * 0.7, -size * 0.55],
		] as number[][])
			fx.circle(x, y, 2);
		fx.fill();
		const opacity = fx.node.addComponent(UIOpacity);
		opacity.opacity = 220;
		tween(opacity)
			.repeatForever(
				tween(opacity).to(0.6, { opacity: 90 }).to(0.6, { opacity: 220 }),
			)
			.start();
	}

	private bossAura(parent: Node, size: number): void {
		const aura = graphics(parent, "BossAuraPlaceholder");
		aura.fillColor = new Color(126, 57, 49, 42);
		aura.circle(0, 0, size / 2 + 14);
		aura.fill();
		aura.strokeColor = new Color(132, 67, 53, 180);
		aura.lineWidth = 2;
		aura.circle(0, 0, size / 2 + 10);
		aura.stroke();
	}

	private traveler(point: Point): void {
		const marker = new Node("TravelerMarkerPlaceholder");
		this.node.addChild(marker);
		marker.layer = this.node.layer;
		marker.setPosition(point.x - 31, point.y + 2);
		const art = marker.addComponent(Graphics);
		art.fillColor = new Color(232, 217, 187, 255);
		art.circle(0, 8, 8);
		art.fill();
		art.fillColor = new Color(48, 42, 49, 255);
		art.circle(0, -4, 11);
		art.fill();
		art.strokeColor = TOKENS.gold;
		art.lineWidth = 1.5;
		art.circle(0, 8, 8);
		art.stroke();
		label(
			marker,
			this.locale === "zh" ? "旅梦者" : "DREAMER",
			0,
			-25,
			8,
			TOKENS.ink,
			72,
		);
	}

	private drawIcon(icon: Graphics, type: string, size: number): void {
		const r = Math.max(5, size * 0.2);
		if (type === "combat") {
			icon.moveTo(-r, r);
			icon.lineTo(r, -r);
			icon.moveTo(-r * 0.7, -r);
			icon.lineTo(r * 0.7, r);
			icon.stroke();
			return;
		}
		if (type === "elite" || type === "boss") {
			const points = type === "boss" ? 8 : 4;
			for (let index = 0; index < points; index += 1) {
				const angle = -Math.PI / 2 + (index * Math.PI) / (points / 2);
				const radius = index % 2 ? r * 0.45 : r;
				const x = Math.cos(angle) * radius;
				const y = Math.sin(angle) * radius;
				index ? icon.lineTo(x, y) : icon.moveTo(x, y);
			}
			icon.close();
			icon.fill();
			icon.stroke();
			return;
		}
		if (type === "event") {
			icon.circle(0, -2, r * 0.7);
			icon.circle(0, r, 1.5);
			icon.stroke();
			return;
		}
		if (type === "shop") {
			icon.moveTo(-r, -r * 0.2);
			icon.lineTo(0, r);
			icon.lineTo(r, -r * 0.2);
			icon.moveTo(-r * 0.8, -r * 0.2);
			icon.lineTo(r * 0.8, -r * 0.2);
			icon.stroke();
			return;
		}
		if (type === "camp") {
			icon.moveTo(-r, -r);
			icon.lineTo(0, r);
			icon.lineTo(r, -r);
			icon.moveTo(-r * 0.8, -r);
			icon.lineTo(r * 0.8, -r);
			icon.stroke();
			return;
		}
		icon.circle(0, 0, r * 0.7);
		icon.fill();
		icon.stroke();
	}

	private drawShape(shape: Graphics, type: string, size: number): void {
		const r = size / 2 - 2;
		if (type === "combat") shape.roundRect(-r, -r, size - 4, size - 4, 7);
		else if (type === "elite") {
			for (let index = 0; index < 6; index += 1) {
				const angle = -Math.PI / 2 + (index * Math.PI) / 3;
				const x = Math.cos(angle) * r;
				const y = Math.sin(angle) * r;
				index ? shape.lineTo(x, y) : shape.moveTo(x, y);
			}
			shape.close();
		} else if (type === "shop") {
			shape.moveTo(0, r);
			shape.lineTo(r, 0);
			shape.lineTo(0, -r);
			shape.lineTo(-r, 0);
			shape.close();
		} else if (type === "event") shape.circle(0, 0, r);
		else if (type === "camp") {
			shape.moveTo(-r, -r * 0.45);
			shape.lineTo(0, r);
			shape.lineTo(r, -r * 0.45);
			shape.lineTo(r * 0.62, -r);
			shape.lineTo(-r * 0.62, -r);
			shape.close();
		} else if (type === "boss") {
			for (let index = 0; index < 10; index += 1) {
				const angle = -Math.PI / 2 + (index * Math.PI) / 5;
				const radius = index % 2 ? r * 0.62 : r;
				const x = Math.cos(angle) * radius;
				const y = Math.sin(angle) * radius;
				index ? shape.lineTo(x, y) : shape.moveTo(x, y);
			}
			shape.close();
		} else shape.circle(0, 0, r);
	}
}
