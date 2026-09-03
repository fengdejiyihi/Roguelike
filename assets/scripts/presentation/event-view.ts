import { Button, Color, Node } from "cc";
import type { GameView } from "../app/game-facade";
import { TOKENS, button, graphics, label, panel } from "./ui-kit";

type Locale = "zh" | "en";
export type EventChoice = {
	id: string;
	zh: string;
	en: string;
	reward?: string;
	risk?: string;
	disabled?: boolean;
};
export type EventViewOptions = {
	locale: Locale;
	choices?: EventChoice[];
	selectedChoiceId?: string;
	rewardResult?: string;
	onSelect: (choiceId: string) => void;
	onConfirm: (choiceId: string) => void;
	onCancel?: () => void;
};

const EVENT_COPY: Record<
	string,
	{ title: string; titleEn: string; description: string; descriptionEn: string }
> = {
	shrine: {
		title: "寂静圣坛",
		titleEn: "SILENT SHRINE",
		description: "古老的圣坛等待你的选择。",
		descriptionEn: "An ancient shrine awaits your choice.",
	},
	gamble: {
		title: "命运赌局",
		titleEn: "GAMBLE OF FATE",
		description: "骰子在阴影中滚动，代价与回报同样真实。",
		descriptionEn: "The dice roll in shadow; cost and reward are both real.",
	},
};

/** Presentation-only event shell. Choice resolution remains in GameFacade. */
export class EventView {
	readonly node: Node;
	constructor(parent: Node, view: GameView, options: EventViewOptions) {
		this.node = new Node("EventView");
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		const bg = graphics(this.node, "EventDreamBackdropPlaceholder");
		bg.fillColor = new Color(24, 20, 59, 255);
		bg.rect(-640, -360, 1280, 720);
		bg.fill();
		panel(
			this.node,
			"EventFrame",
			0,
			0,
			1080,
			600,
			new Color(16, 18, 48, 248),
			new Color(91, 78, 130),
			18,
			2,
		);
		const npc = panel(
			this.node,
			"EventNpcPlaceholder",
			-350,
			55,
			250,
			310,
			new Color(48, 38, 78),
			new Color(123, 103, 158),
			16,
			2,
		);
		label(
			npc,
			options.locale === "zh" ? "NPC 占位区域" : "NPC PLACEHOLDER",
			0,
			0,
			12,
			TOKENS.muted,
			220,
		);
		const copy = EVENT_COPY[view.event ?? ""] ?? {
			title: view.event ?? "事件",
			titleEn: "EVENT",
			description: "等待事件描述。",
			descriptionEn: "Event description pending.",
		};
		label(
			this.node,
			options.locale === "zh" ? copy.title : copy.titleEn,
			110,
			220,
			24,
			TOKENS.gold,
			560,
		);
		label(
			this.node,
			options.locale === "zh" ? copy.description : copy.descriptionEn,
			110,
			175,
			13,
			TOKENS.paper,
			560,
		);
		label(
			this.node,
			options.locale === "zh" ? "选择你的行动" : "CHOOSE YOUR ACTION",
			110,
			125,
			10,
			TOKENS.muted,
			560,
		);
		if (options.rewardResult)
			label(
				this.node,
				`${options.locale === "zh" ? "结果" : "RESULT"}: ${options.rewardResult}`,
				110,
				100,
				10,
				TOKENS.cyan,
				560,
			);
		const choices = options.choices ?? this.defaultChoices(options.locale);
		choices.forEach((choice, index) => this.choice(choice, index, options));
		const selected = choices.find(
			(choice) => choice.id === options.selectedChoiceId && !choice.disabled,
		);
		const confirm = button(
			this.node,
			options.locale === "zh" ? "确认选择" : "CONFIRM",
			110,
			-235,
			190,
			38,
			() => selected && options.onConfirm(selected.id),
			selected ? new Color(84, 54, 98) : new Color(39, 35, 60),
			selected ? TOKENS.gold : new Color(91, 87, 112),
		);
		confirm.getComponent(Button)!.interactable = Boolean(selected);
		if (options.onCancel)
			button(
				this.node,
				options.locale === "zh" ? "取消选择" : "CLEAR SELECTION",
				380,
				-245,
				170,
				36,
				options.onCancel,
				new Color(43, 36, 70),
				TOKENS.muted,
			);
	}
	private defaultChoices(locale: Locale): EventChoice[] {
		return [
			{ id: "accept", zh: "接受", en: "ACCEPT" },
			{
				id: "skip",
				zh: "离开",
				en: "LEAVE",
				risk: locale === "zh" ? "放弃当前事件" : "Abandon this event",
			},
		];
	}
	private choice(
		choice: EventChoice,
		index: number,
		options: EventViewOptions,
	): void {
		const x = 110 + (index % 2) * 285;
		const y = 65 - Math.floor(index / 2) * 105;
		const selected = options.selectedChoiceId === choice.id;
		const box = panel(
			this.node,
			"EventChoice",
			x,
			y,
			250,
			82,
			choice.disabled
				? new Color(38, 37, 61)
				: selected
					? new Color(73, 51, 94)
					: new Color(48, 36, 78),
			choice.disabled ? TOKENS.locked : selected ? TOKENS.cyan : TOKENS.gold,
			12,
			1.5,
		);
		label(
			box,
			options.locale === "zh" ? choice.zh : choice.en,
			0,
			20,
			13,
			choice.disabled ? TOKENS.muted : TOKENS.paper,
			230,
		);
		if (choice.reward)
			label(
				box,
				`${options.locale === "zh" ? "奖励" : "REWARD"}: ${choice.reward}`,
				0,
				-4,
				9,
				TOKENS.cyan,
				230,
			);
		if (choice.risk)
			label(
				box,
				`${options.locale === "zh" ? "风险" : "RISK"}: ${choice.risk}`,
				0,
				-22,
				8,
				TOKENS.rose,
				230,
			);
		const control = box.addComponent(Button);
		control.interactable = !choice.disabled;
		if (!choice.disabled)
			control.node.on(
				Button.EventType.CLICK,
				() => options.onSelect(choice.id),
				this.node,
			);
	}
}
