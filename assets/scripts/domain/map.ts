import type { MapNode, NodeType, RngState } from "./model";
import { nextInt } from "./rng";

const pair = (rank: number, types: [NodeType, NodeType]): MapNode[] => {
	const next = rank === 7 ? ["boss"] : [`r${rank + 1}a`, `r${rank + 1}b`];
	return [
		{ id: `r${rank}a`, rank, type: types[0], next, visited: false },
		{ id: `r${rank}b`, rank, type: types[1], next, visited: false },
	];
};

export function createMap(rng: RngState): MapNode[] {
	const rank1: [NodeType, NodeType] = nextInt(rng, 2)
		? ["combat", "event"]
		: ["event", "combat"];
	const rank5: [NodeType, NodeType] = nextInt(rng, 2)
		? ["elite", "combat"]
		: ["combat", "elite"];
	return [
		{
			id: "start",
			rank: 0,
			type: "start",
			next: ["r1a", "r1b"],
			visited: true,
		},
		...pair(1, rank1),
		...pair(2, ["combat", "combat"]),
		...pair(3, ["shop", "combat"]),
		...pair(4, ["combat", "combat"]),
		...pair(5, rank5),
		...pair(6, ["shop", "combat"]),
		...pair(7, ["combat", "elite"]),
		{ id: "boss", rank: 8, type: "boss", next: [], visited: false },
	];
}

export function legalNext(map: MapNode[], currentId: string): string[] {
	return map.find((node) => node.id === currentId)?.next ?? [];
}
