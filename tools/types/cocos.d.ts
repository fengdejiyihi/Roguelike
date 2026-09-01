declare module "cc" {
	class Component {
		node: Node;
	}
	class Node {
		static EventType: { TOUCH_END: string };
		name: string;
		constructor(name?: string);
		addChild(child: Node): void;
		removeAllChildren(): void;
		addComponent<T>(type: new () => T): T;
		on(event: string, callback: () => void, target?: unknown): void;
		setPosition(x: number, y: number, z?: number): void;
	}
	class Label {
		string: string;
		fontSize: number;
	}
	class Button {
		interactable: boolean;
		node: Node;
	}
	class UITransform {
		setContentSize(width: number, height: number): void;
	}
	const _decorator: {
		ccclass(name: string): (target: new () => Component) => void;
	};
	const sys: {
		localStorage: {
			getItem(key: string): string | null;
			setItem(key: string, value: string): void;
		};
	};
}
