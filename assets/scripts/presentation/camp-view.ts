import { Button, Color, Node } from "cc";
import type { GameView } from "../app/game-facade";
import { TOKENS, graphics, label, panel } from "./ui-kit";

type Locale = "zh" | "en";
export type CampAction = "heal" | "upgrade" | "leave";
export type CampViewOptions = {
	locale: Locale;
	healAvailable?: boolean;
	upgradeAvailable?: boolean;
	leaveAvailable?: boolean;
	feedback?: string;
	onAction: (action: CampAction) => void;
};

/** Presentation-only camp shell; availability and effects are supplied by the caller. */
export class CampView {
	readonly node: Node;
	constructor(parent: Node, _view: GameView, options: CampViewOptions) {
		this.node = new Node("CampView");
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		const bg = graphics(this.node, "CampDreamBackdropPlaceholder");
		bg.fillColor = new Color(27, 24, 48, 255);
		bg.rect(-640, -360, 1280, 720);
		bg.fill();
		panel(
			this.node,
			"CampFrame",
			0,
			0,
			900,
			520,
			new Color(21, 27, 47, 248),
			new Color(111, 92, 126),
			18,
			2,
		);
		label(
			this.node,
			options.locale === "zh" ? "营地" : "CAMPFIRE",
			0,
			205,
			26,
			TOKENS.gold,
			400,
		);
		label(
			this.node,
			options.locale === "zh"
				? "休整并准备下一段旅程"
				: "REST BEFORE THE NEXT LEG",
			0,
			170,
			11,
			TOKENS.muted,
			500,
		);
		panel(
			this.node,
			"CampScenePlaceholder",
			0,
			70,
			500,
			130,
			new Color(55, 42, 65),
			new Color(138, 100, 119),
			14,
			1,
		);
		label(
			this.node,
			options.locale === "zh" ? "篝火场景占位区域" : "CAMP SCENE PLACEHOLDER",
			0,
			70,
			11,
			TOKENS.paper,
			460,
		);
		this.action(
			"heal",
			options.locale === "zh" ? "治疗" : "HEAL",
			-220,
			options.healAvailable === true,
			options,
			"消耗选择",
			"Spend choice",
		);
		this.action(
			"upgrade",
			options.locale === "zh" ? "升级卡牌" : "UPGRADE CARD",
			0,
			options.upgradeAvailable === true,
			options,
			"消耗选择",
			"Spend choice",
		);
		this.action(
			"leave",
			options.locale === "zh" ? "离开" : "LEAVE",
			220,
			options.leaveAvailable === true,
			options,
		);
		if (options.feedback)
			label(this.node, options.feedback, 0, -180, 11, TOKENS.cyan, 600);
	}
	private action(
		action: CampAction,
		text: string,
		x: number,
		available: boolean,
		options: CampViewOptions,
		zhHint?: string,
		enHint?: string,
	): void {
		const node = panel(
			this.node,
			"CampAction",
			x,
			-95,
			190,
			76,
			available ? new Color(54, 40, 78) : new Color(40, 39, 58),
			available ? TOKENS.gold : TOKENS.locked,
			11,
			1.5,
		);
		label(node, text, 0, 17, 12, available ? TOKENS.paper : TOKENS.muted, 175);
		label(
			node,
			available
				? options.locale === "zh"
					? (zhHint ?? "")
					: (enHint ?? "")
				: options.locale === "zh"
					? "暂不可用"
					: "UNAVAILABLE",
			0,
			-14,
			8,
			available ? TOKENS.cyan : TOKENS.rose,
			175,
		);
		const control = node.addComponent(Button);
		control.interactable = available;
		if (available)
			control.node.on(
				Button.EventType.CLICK,
				() => options.onAction(action),
				this.node,
			);
	}
}
