import { Color, Graphics, Label, Node, UITransform } from "cc";
import type { CardView as CardData } from "../app/game-facade";
import { CardView } from "./card-view";

export type HandViewOptions = {
	locale: "zh" | "en";
	selectedId?: string;
	onSelect: (card: CardData) => void;
};

export class HandView {
	readonly node: Node;
	constructor(
		parent: Node,
		cards: CardData[],
		energy: number,
		options: HandViewOptions,
	) {
		this.node = new Node("HandView");
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		this.node.setPosition(0, -200);
		const backdrop = this.node.addComponent(Graphics);
		backdrop.fillColor = new Color(15, 24, 52, 244);
		backdrop.roundRect(-610, -112, 1220, 224, 26);
		backdrop.fill();
		backdrop.strokeColor = new Color(100, 91, 166, 220);
		backdrop.lineWidth = 2;
		backdrop.stroke();
		this.label(
			options.locale === "zh" ? "手牌" : "HAND",
			-555,
			91,
			12,
			new Color(184, 199, 240),
		);
		this.label(
			`${options.locale === "zh" ? "能量" : "ENERGY"} ${energy}/3`,
			-552,
			-91,
			16,
			new Color(255, 214, 123),
		);
		for (let index = 0; index < 3; index += 1) {
			const pip = this.graphics(`Energy${index}`, -486 + index * 23, -68);
			pip.fillColor =
				index < energy ? new Color(255, 200, 112) : new Color(68, 75, 103);
			pip.circle(0, 0, 7);
			pip.fill();
		}
		const step =
			cards.length <= 1 ? 0 : Math.min(120, 720 / (cards.length - 1));
		const start = -((cards.length - 1) * step) / 2;
		cards.forEach((card, index) => {
			const center = (cards.length - 1) / 2;
			const rotation = (center - index) * 2.4;
			const offset = index - center;
			const y = -16 + Math.max(0, 18 - offset * offset * 2.2);
			new CardView(this.node, card, start + index * step, y, rotation, {
				locale: options.locale,
				selected: options.selectedId === card.instanceId,
				onSelect: () => options.onSelect(card),
			});
		});
	}
	private graphics(name: string, x: number, y: number): Graphics {
		const node = new Node(name);
		this.node.addChild(node);
		node.layer = this.node.layer;
		node.setPosition(x, y);
		return node.addComponent(Graphics);
	}
	private label(
		value: string,
		x: number,
		y: number,
		size: number,
		color: Color,
	): void {
		const node = new Node("Label");
		this.node.addChild(node);
		node.layer = this.node.layer;
		node.setPosition(x, y);
		const transform = node.addComponent(UITransform);
		transform.setContentSize(150, size + 8);
		const label = node.addComponent(Label);
		label.string = value;
		label.fontSize = size;
		label.lineHeight = size + 4;
		label.color = color;
	}
}
