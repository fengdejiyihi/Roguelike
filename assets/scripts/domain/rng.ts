import type { RngState, RngStreams } from "./model";

function hash(text: string): number {
	let value = 2166136261;
	for (let index = 0; index < text.length; index += 1)
		value = Math.imul(value ^ text.charCodeAt(index), 16777619);
	return value >>> 0 || 1;
}

export function deriveRngStreams(
	seed: string,
	rulesVersion: string,
): RngStreams {
	const derive = (name: string): RngState => ({
		state: hash(`${rulesVersion}:${seed}:${name}`),
	});
	return {
		mapRng: derive("map"),
		combatRng: derive("combat"),
		rewardRng: derive("reward"),
		eventRng: derive("event"),
	};
}

export function nextInt(rng: RngState, limit: number): number {
	let value = rng.state || 1;
	value ^= value << 13;
	value ^= value >>> 17;
	value ^= value << 5;
	rng.state = value >>> 0;
	return rng.state % limit;
}

export function shuffle<T>(items: T[], rng: RngState): T[] {
	const result = [...items];
	for (let index = result.length - 1; index > 0; index -= 1) {
		const swapIndex = nextInt(rng, index + 1);
		[result[index], result[swapIndex]] = [result[swapIndex], result[index]];
	}
	return result;
}
