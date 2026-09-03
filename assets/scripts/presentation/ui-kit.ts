import {
	BlockInputEvents,
	Button,
	Color,
	Graphics,
	Label,
	Node,
	UIOpacity,
	UITransform,
	tween,
} from "cc";

/** Small presentation-only palette and primitives shared by map, battle and cards. */
export const TOKENS = {
	indigo: new Color(8, 10, 34),
	violet: new Color(43, 31, 77),
	violetDeep: new Color(18, 18, 52),
	gold: new Color(255, 215, 132),
	cyan: new Color(91, 211, 232),
	paper: new Color(249, 229, 195),
	ink: new Color(32, 24, 55),
	muted: new Color(160, 169, 211),
	locked: new Color(69, 70, 112),
	rose: new Color(232, 121, 150),
};

export type PauseActions = {
	onLanguage: () => void;
	onSave: () => void;
	onNewRun: () => void;
};

const ACTIVE_PAUSE_MENUS = new WeakMap<Node, Node>();

export function graphics(parent: Node, name: string, x = 0, y = 0): Graphics {
	const node = new Node(name);
	parent.addChild(node);
	node.layer = parent.layer;
	node.setPosition(x, y);
	return node.addComponent(Graphics);
}

export function panel(
	parent: Node,
	name: string,
	x: number,
	y: number,
	width: number,
	height: number,
	fill: Color,
	stroke: Color,
	radius = 14,
	lineWidth = 2,
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
	shape.lineWidth = lineWidth;
	shape.stroke();
	return node;
}

export function label(
	parent: Node,
	value: string,
	x: number,
	y: number,
	size: number,
	color: Color,
	width: number,
): Label {
	const node = new Node("Label");
	parent.addChild(node);
	node.layer = parent.layer;
	node.setPosition(x, y);
	const transform = node.addComponent(UITransform);
	transform.setContentSize(width, size + 12);
	const text = node.addComponent(Label);
	text.string = value;
	text.fontSize = size;
	text.lineHeight = size + 4;
	text.color = color;
	return text;
}

export function button(
	parent: Node,
	value: string,
	x: number,
	y: number,
	width: number,
	height: number,
	action: () => void,
	fill = TOKENS.violet,
	stroke = TOKENS.gold,
	fontSize = 11,
): Node {
	const node = panel(
		parent,
		"Button",
		x,
		y,
		width,
		height,
		fill,
		stroke,
		10,
		1.5,
	);
	label(node, value, 0, 0, fontSize, TOKENS.paper, width - 8);
	const control = node.addComponent(Button);
	control.interactable = true;
	control.node.on(Button.EventType.CLICK, action, node);
	return node;
}

export function healthBar(
	parent: Node,
	x: number,
	y: number,
	width: number,
	value: number,
	max: number,
	fill: Color,
): void {
	const bar = graphics(parent, "HealthBar", x, y);
	bar.fillColor = new Color(18, 18, 42, 240);
	bar.roundRect(-width / 2, -5, width, 10, 5);
	bar.fill();
	const ratio = Math.max(0, Math.min(1, max ? value / max : 0));
	bar.fillColor = fill;
	bar.roundRect(-width / 2, -5, width * ratio, 10, 5);
	bar.fill();
}

export function pulse(node: Node, low = 120): void {
	const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
	opacity.opacity = 255;
	tween(opacity).to(0.1, { opacity: low }).to(0.16, { opacity: 255 }).start();
}

export function pauseMenu(
	parent: Node,
	locale: "zh" | "en",
	actions: PauseActions,
): Node {
	const existing = ACTIVE_PAUSE_MENUS.get(parent);
	if (existing) return existing;
	const overlay = new Node("PauseMenuOverlay");
	parent.addChild(overlay);
	overlay.layer = parent.layer;
	overlay.addComponent(UITransform).setContentSize(1280, 720);
	overlay.addComponent(BlockInputEvents);
	ACTIVE_PAUSE_MENUS.set(parent, overlay);
	const menu = panel(
		overlay,
		"PauseMenu",
		0,
		30,
		300,
		260,
		new Color(27, 23, 67, 252),
		TOKENS.gold,
		20,
		2,
	);
	label(
		menu,
		locale === "zh" ? "梦境之塔" : "TOWER OF DREAMS",
		0,
		93,
		18,
		TOKENS.gold,
		270,
	);
	label(
		menu,
		locale === "zh" ? "暂停菜单" : "PAUSE MENU",
		0,
		68,
		10,
		TOKENS.muted,
		270,
	);
	button(
		menu,
		locale === "zh" ? "语言" : "LANGUAGE",
		-76,
		28,
		110,
		34,
		actions.onLanguage,
		new Color(45, 36, 88),
		new Color(123, 139, 191),
		10,
	);
	button(
		menu,
		locale === "zh" ? "保存" : "SAVE",
		76,
		28,
		110,
		34,
		actions.onSave,
		new Color(45, 36, 88),
		new Color(123, 139, 191),
		10,
	);
	button(
		menu,
		locale === "zh" ? "新游戏" : "NEW RUN",
		-76,
		-17,
		110,
		34,
		actions.onNewRun,
		new Color(76, 48, 92),
		new Color(215, 158, 124),
		10,
	);
	button(
		menu,
		locale === "zh" ? "继续" : "RESUME",
		76,
		-17,
		110,
		34,
		() => {
			overlay.removeFromParent();
			ACTIVE_PAUSE_MENUS.delete(parent);
		},
		new Color(45, 36, 88),
		new Color(123, 139, 191),
		10,
	);
	return overlay;
}
