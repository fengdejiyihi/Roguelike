declare module "cc" {
	class Component {
		node: Node;
	}
	class Color {
		constructor(red?: number, green?: number, blue?: number, alpha?: number);
	}
	class Node {
		static EventType: {
			TOUCH_END: string;
			TOUCH_CANCEL: string;
			TOUCH_START: string;
			MOUSE_ENTER: string;
			MOUSE_LEAVE: string;
		};
		name: string;
		layer: number;
		constructor(name?: string);
		addChild(child: Node): void;
		removeAllChildren(): void;
		removeFromParent(): void;
		getChildByName(name: string): Node | null;
		getComponent<T>(type: new () => T): T | null;
		addComponent<T>(type: new () => T): T;
		on(event: string, callback: () => void, target?: unknown): void;
		setPosition(x: number, y: number, z?: number): void;
		setScale(x: number, y?: number, z?: number): void;
		setRotationFromEuler(x: number, y: number, z: number): void;
	}
	class Label {
		string: string;
		fontSize: number;
		color: Color;
		lineHeight: number;
	}
	class Graphics {
		node: Node;
		fillColor: Color;
		strokeColor: Color;
		lineWidth: number;
		rect(x: number, y: number, width: number, height: number): void;
		roundRect(
			x: number,
			y: number,
			width: number,
			height: number,
			radius: number,
		): void;
		circle(x: number, y: number, radius: number): void;
		moveTo(x: number, y: number): void;
		lineTo(x: number, y: number): void;
		close(): void;
		fill(): void;
		stroke(): void;
	}
	class UIOpacity {
		opacity: number;
	}
	interface Tween<T extends object = object> {
		repeatForever(action: Tween<T>): Tween<T>;
		to(
			duration: number,
			properties: Partial<{
				[key in keyof T as T[key] extends number ? key : never]: T[key];
			}>,
		): Tween<T>;
		delay(duration: number): Tween;
		call(callback: () => void): Tween<T>;
		start(): Tween;
	}
	function tween<T extends object>(target: T): Tween<T>;
	class Button {
		static EventType: { CLICK: string };
		interactable: boolean;
		node: Node;
	}
	class BlockInputEvents {}
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
