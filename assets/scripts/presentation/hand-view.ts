import { Color, Node } from "cc";
import type { CardView as CardData } from "../app/game-facade";
import { CardView } from "./card-view";
import { TOKENS, label, panel } from "./ui-kit";

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
		_energy: number,
		options: HandViewOptions,
	) {
		this.node = new Node("HandView");
		parent.addChild(this.node);
		this.node.layer = parent.layer;
		this.node.setPosition(0, -196);
		const tray = panel(
			this.node,
			"HandTray",
			0,
			-4,
			1080,
			248,
			new Color(13, 17, 45, 214),
			new Color(103, 82, 155, 230),
			22,
			2,
		);
		const step =
			cards.length <= 1 ? 0 : Math.min(152, 900 / (cards.length - 1));
		const start = -((cards.length - 1) * step) / 2;
		cards.forEach((card, index) => {
			const center = (cards.length - 1) / 2;
			const offset = index - center;
			new CardView(
				this.node,
				card,
				start + index * step,
				-7 + Math.max(0, 13 - offset * offset * 1.65),
				(center - index) * 2.4,
				{
					locale: options.locale,
					selected: options.selectedId === card.instanceId,
					onSelect: () => options.onSelect(card),
				},
			);
		});
	}
}
