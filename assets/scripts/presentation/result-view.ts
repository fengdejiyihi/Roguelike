import { Color, Node } from "cc";
import type { GameView } from "../app/game-facade";
import { TOKENS, button, graphics, label, panel } from "./ui-kit";

type Locale = "zh" | "en";
export type ResultViewOptions = {
	locale: Locale;
	onMap: () => void;
	onMenu: () => void;
	onRestart: () => void;
};

/** Presentation-only victory/defeat summary. Actions are delegated to the host. */
export class ResultView {
	readonly node: Node;
	constructor(parent: Node, view: GameView, options: ResultViewOptions) {
		this.node = new Node("ResultView");
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		const won = view.result === "won";
		const bg = graphics(this.node, "ResultDreamBackdropPlaceholder");
		bg.fillColor = won ? new Color(31, 30, 69) : new Color(37, 24, 45);
		bg.rect(-640, -360, 1280, 720);
		bg.fill();
		panel(
			this.node,
			"ResultFrame",
			0,
			0,
			720,
			500,
			new Color(18, 20, 44, 250),
			won ? TOKENS.gold : TOKENS.rose,
			18,
			2,
		);
		label(
			this.node,
			won
				? options.locale === "zh"
					? "胜利"
					: "VICTORY"
				: options.locale === "zh"
					? "失败"
					: "DEFEAT",
			0,
			190,
			30,
			won ? TOKENS.gold : TOKENS.rose,
			500,
		);
		label(
			this.node,
			won
				? options.locale === "zh"
					? "本局统计"
					: "RUN SUMMARY"
				: options.locale === "zh"
					? "冒险统计"
					: "ADVENTURE SUMMARY",
			0,
			145,
			13,
			TOKENS.paper,
			400,
		);
		label(
			this.node,
			`${options.locale === "zh" ? "探索节点" : "NODES VISITED"}: ${view.visitedNodes}`,
			0,
			92,
			12,
			TOKENS.muted,
			400,
		);
		label(
			this.node,
			`${options.locale === "zh" ? "生命" : "HP"}: ${view.playerHp}/${view.playerMaxHp}   ${options.locale === "zh" ? "金币" : "GOLD"}: ${view.gold}`,
			0,
			62,
			12,
			TOKENS.muted,
			500,
		);
		label(
			this.node,
			won
				? options.locale === "zh"
					? "奖励摘要：旅程仍在延续"
					: "REWARD SUMMARY: THE DREAM CONTINUES"
				: options.locale === "zh"
					? "奖励摘要：暂无"
					: "REWARD SUMMARY: NONE",
			0,
			15,
			11,
			TOKENS.cyan,
			560,
		);
		button(
			this.node,
			options.locale === "zh" ? "返回地图" : "BACK TO MAP",
			-125,
			-150,
			190,
			40,
			options.onMap,
			new Color(54, 43, 80),
			TOKENS.gold,
		);
		button(
			this.node,
			options.locale === "zh" ? "主菜单" : "MAIN MENU",
			0,
			-205,
			160,
			34,
			options.onMenu,
			new Color(43, 36, 70),
			TOKENS.muted,
			10,
		);
		button(
			this.node,
			options.locale === "zh" ? "重新开始" : "RESTART",
			125,
			-150,
			190,
			40,
			options.onRestart,
			new Color(65, 41, 76),
			TOKENS.rose,
		);
	}
}
