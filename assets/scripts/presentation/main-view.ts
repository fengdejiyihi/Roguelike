import { Button, Component, Label, Node, UITransform, _decorator } from "cc";
import { GameFacade, type GameView } from "../app/game-facade";
import { LocalSaveStorage } from "../platform/local-save";

const { ccclass } = _decorator;
const ROW_HEIGHT = 35;
const CONTENT_HEIGHT = 33;

@ccclass("MainView")
export class MainView extends Component {
	private facade = new GameFacade(new LocalSaveStorage());
	private cursor = 0;

	onLoad(): void {
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
		this.node.removeAllChildren();
		this.cursor = 0;
		this.text("Card Roguelike", 28);
		this.button("New Run", () =>
			this.render(this.facade.newRun("phase-3-demo")),
		);
		this.button("Save", () => this.facade.save());
		this.button("Resume", () => this.render(this.tryResume()), !view);
		if (!view) {
			this.text("Choose New Run to begin.", 18);
			return;
		}
		this.text(`Phase: ${view.phase ?? "unknown"}`, 20);
		this.text(
			`Gold: ${view.gold} | Relics: ${view.relics.join(", ") || "none"}`,
			16,
		);
		if (view.currentNodeId)
			this.text(`Current node: ${view.currentNodeId}`, 18);
		if (view.phase === "map") this.renderMap(view);
		if (view.phase === "combat" && view.combat) this.renderCombat(view);
		if (view.phase === "reward" && view.reward) this.renderReward(view);
		if (view.phase === "shop" && view.shop) this.renderShop(view);
		if (view.phase === "event" && view.event) this.renderEvent(view);
		if (view.result)
			this.text(view.result === "won" ? "Victory" : "Defeat", 26);
	}

	private renderMap(view: GameView): void {
		this.text("Map — choose a next node", 18);
		for (const node of view.map.filter((item) => item.enabled)) {
			this.button(
				`${node.id} (${node.type})`,
				() => this.render(this.facade.selectNode(node.id)),
				!node.enabled,
			);
		}
	}

	private renderCombat(view: GameView): void {
		const combat = view.combat!;
		this.text(
			`${combat.enemyName} | HP ${combat.playerHp} | Block ${combat.playerBlock} | Enemy HP ${combat.enemyHp} | Energy ${combat.energy}`,
			18,
		);
		this.text(`Intent: Attack ${combat.enemyIntentDamage}`, 16);
		this.text(
			`Hand: ${combat.hand.map((card) => `${card.name} [${card.cost}] ${card.preview}`).join(" | ") || "empty"}`,
			16,
		);
		for (const card of combat.hand)
			this.button(`${card.name} [${card.cost}] ${card.preview}`, () =>
				this.render(this.facade.playCard(card.instanceId, combat.enemyId)),
			);
		this.button("End turn", () => this.render(this.facade.endTurn()));
	}

	private renderReward(view: GameView): void {
		this.text(`Reward (+${view.reward!.gold} gold)`, 18);
		for (const card of view.reward!.cards)
			this.button(`Take ${card.name} [${card.cost}] ${card.preview}`, () =>
				this.render(this.facade.chooseReward(card.cardId)),
			);
		this.button("Skip reward", () => this.render(this.facade.skipReward()));
	}

	private renderShop(view: GameView): void {
		this.text("Shop", 18);
		for (const item of view.shop!)
			this.button(
				`${item.card ? `${item.card.name} [${item.card.cost}] ${item.card.preview} — ` : `${item.name} — `}${item.price}${item.sold ? " (sold)" : ""}`,
				() => this.render(this.facade.buy(item.id)),
				item.sold,
			);
		this.button("Leave shop", () => this.render(this.facade.leaveShop()));
	}

	private renderEvent(view: GameView): void {
		this.text(`Event: ${view.event}`, 18);
		this.button("Accept", () => this.render(this.facade.chooseEvent("accept")));
		this.button("Skip", () => this.render(this.facade.chooseEvent("skip")));
	}

	private text(value: string, size: number): void {
		const node = new Node("Label");
		const label = node.addComponent(Label);
		label.string = value;
		label.fontSize = size;
		const transform = node.addComponent(UITransform);
		transform.setContentSize(700, CONTENT_HEIGHT);
		node.setPosition(0, 300 - this.cursor * ROW_HEIGHT);
		this.cursor += 1;
		this.node.addChild(node);
	}

	private button(value: string, action: () => void, disabled = false): void {
		const node = new Node("Button");
		const label = node.addComponent(Label);
		label.string = value;
		label.fontSize = 18;
		node.addComponent(UITransform).setContentSize(700, CONTENT_HEIGHT);
		const button = node.addComponent(Button);
		button.interactable = !disabled;
		if (!disabled) node.on(Node.EventType.TOUCH_END, action, this);
		node.setPosition(0, 300 - this.cursor * ROW_HEIGHT);
		this.cursor += 1;
		this.node.addChild(node);
	}
}
