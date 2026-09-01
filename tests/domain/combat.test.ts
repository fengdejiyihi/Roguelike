import assert from "node:assert/strict";
import test from "node:test";
import {
	createRun,
	executeCommand,
	stateDigest,
} from "../../assets/scripts/domain/combat";
import type { Command, RunState } from "../../assets/scripts/domain/model";

function cardRun(card: string): RunState {
	const run = createRun("card-test");
	run.combat.hand = [`${card}#0`];
	run.combat.draw = [];
	run.combat.discard = [];
	run.combat.energy = 3;
	return run;
}
function play(run: RunState, card: string) {
	return executeCommand(run, {
		type: "playCard",
		cardInstanceId: `${card}#0`,
		targetId: "enemy:0",
	});
}
function cost(instance: string): number {
	return (
		{ strike: 1, guard: 1, insight: 0, toxin: 1, doubleCut: 1, execute: 2 }[
			instance.split("#")[0]
		] ?? 99
	);
}

test("six validation cards cover damage, block, draw, status, sequence, and conditional effects", () => {
	let result = play(cardRun("strike"), "strike");
	assert.equal(result.accepted, true);
	assert.equal(result.run.combat.enemy.hp, 24);
	result = play(cardRun("guard"), "guard");
	assert.equal(result.accepted, true);
	assert.equal(result.run.combat.player.block, 5);
	const draw = cardRun("insight");
	draw.combat.draw = ["strike#1", "guard#2"];
	result = play(draw, "insight");
	assert.equal(result.run.combat.hand.length, 2);
	const toxin = cardRun("toxin");
	result = play(toxin, "toxin");
	assert.equal(result.run.combat.enemy.statuses[0].stacks, 2);
	assert.equal(result.accepted, true);
	result = play(cardRun("doubleCut"), "doubleCut");
	assert.equal(result.accepted, true);
	assert.equal(result.run.combat.enemy.hp, 24);
	const doubleCutDamage = result.events.filter(
		(event) => event.type === "DamageDealt",
	);
	assert.equal(doubleCutDamage.length, 2);
	assert.equal(doubleCutDamage[0].detail, "enemy:0:3");
	assert.equal(doubleCutDamage[1].detail, "enemy:0:3");
	assert.ok(doubleCutDamage[0].sequence < doubleCutDamage[1].sequence);
	const execute = cardRun("execute");
	execute.combat.enemy.statuses.push({ id: "poison", stacks: 1 });
	result = play(execute, "execute");
	assert.equal(result.run.combat.enemy.hp, 20);
	const executeThen = result.events.filter(
		(event) => event.type === "DamageDealt",
	);
	assert.equal(executeThen.length, 1);
	assert.equal(executeThen[0].detail, "enemy:0:10");
	const executeElse = cardRun("execute");
	result = play(executeElse, "execute");
	assert.equal(result.accepted, true);
	assert.equal(result.run.combat.enemy.hp, 28);
	const executeElseEvents = result.events.filter(
		(event) => event.type === "DamageDealt",
	);
	assert.equal(executeElseEvents.length, 1);
	assert.equal(executeElseEvents[0].detail, "enemy:0:2");
	const turnEndPoison = cardRun("strike");
	turnEndPoison.combat.enemy.statuses.push({ id: "poison", stacks: 2 });
	const endTurn = executeCommand(turnEndPoison, { type: "endTurn" });
	assert.equal(endTurn.accepted, true);
	assert.equal(endTurn.run.combat.enemy.hp, 28);
	assert.ok(
		endTurn.events.some(
			(event) => event.type === "DamageDealt" && event.detail === "enemy:0:2",
		),
	);
});

test("same seed and commands preserve digest and ordered events", () => {
	let left = createRun("repeatable");
	let right = createRun("repeatable");
	const leftEvents: string[] = [];
	const rightEvents: string[] = [];
	const steps: Array<{
		expected: boolean;
		make: (run: RunState) => Command;
	}> = [
		{
			expected: true,
			make: (run) => ({
				type: "playCard",
				cardInstanceId: run.combat.hand[0],
				targetId: "enemy:0",
			}),
		},
		{
			expected: false,
			make: () => ({
				type: "playCard",
				cardInstanceId: "missing#0",
				targetId: "enemy:0",
			}),
		},
		{ expected: true, make: () => ({ type: "endTurn" }) },
		{
			expected: true,
			make: (run) => ({
				type: "playCard",
				cardInstanceId: run.combat.hand[0],
				targetId: "enemy:0",
			}),
		},
	];
	for (const [index, step] of steps.entries()) {
		const leftCommand = step.make(left);
		const rightCommand = step.make(right);
		const a = executeCommand(left, leftCommand);
		const b = executeCommand(right, rightCommand);
		assert.equal(a.accepted, step.expected, `left step ${index}`);
		assert.equal(b.accepted, step.expected, `right step ${index}`);
		if (!step.expected) {
			assert.equal(a.reason, "card-not-in-hand");
			assert.equal(b.reason, "card-not-in-hand");
		}
		left = a.run;
		right = b.run;
		leftEvents.push(JSON.stringify(a.events));
		rightEvents.push(JSON.stringify(b.events));
		assert.equal(leftEvents[index], rightEvents[index]);
	}
	assert.equal(stateDigest(left), stateDigest(right));
	assert.deepEqual(leftEvents, rightEvents);
});

test("rejected command rolls back state and all RNG streams", () => {
	const run = createRun("atomic");
	const before = stateDigest(run);
	const result = executeCommand(run, {
		type: "playCard",
		cardInstanceId: "missing#0",
		targetId: "enemy:0",
	});
	assert.equal(result.accepted, false);
	assert.equal(stateDigest(result.run), before);
	assert.deepEqual(result.events, [
		{
			sequence: 0,
			resolutionId: "combat:atomic:1",
			triggerChainId: "combat:atomic:1:0",
			type: "ResolutionRejected",
			detail: "card-not-in-hand",
		},
	]);
});

test("unknown and inactive commands reject atomically with one deterministic event", () => {
	const unknown = createRun("unknown");
	const before = stateDigest(unknown);
	const unknownResult = executeCommand(unknown, {
		type: "surprise",
	} as unknown as never);
	assert.equal(stateDigest(unknownResult.run), before);
	assert.deepEqual(unknownResult.events, [
		{
			sequence: 0,
			resolutionId: "combat:unknown:1",
			triggerChainId: "combat:unknown:1:0",
			type: "ResolutionRejected",
			detail: "unknown-command",
		},
	]);
	unknown.combat.phase = "Victory";
	const inactive = executeCommand(unknown, { type: "endTurn" });
	assert.equal(inactive.events[0].detail, "combat-not-active");
	assert.equal(stateDigest(inactive.run), stateDigest(unknown));
});

test("combat consumes no map, reward, or event RNG stream", () => {
	const run = cardRun("strike");
	const before = JSON.parse(JSON.stringify(run.rngStreams));
	const result = play(run, "strike");
	assert.deepEqual(result.run.rngStreams.mapRng, before.mapRng);
	assert.deepEqual(result.run.rngStreams.rewardRng, before.rewardRng);
	assert.deepEqual(result.run.rngStreams.eventRng, before.eventRng);
});

test("cyclic triggers reject and roll back the whole command", () => {
	const run = cardRun("strike");
	run.combat.player.statuses.push({ id: "spike", stacks: 1 });
	const before = stateDigest(run);
	const result = play(run, "strike");
	assert.equal(result.accepted, false);
	assert.equal(result.reason, "trigger-cycle");
	assert.equal(stateDigest(result.run), before);
	assert.equal(result.events[0].type, "ResolutionRejected");
});

test("trigger invocations count toward the 1024 resolution limit", () => {
	const run = cardRun("guard");
	for (let index = 0; index < 513; index += 1)
		run.combat.player.statuses.push({ id: "poison", stacks: 1 });
	const result = executeCommand(run, { type: "endTurn" });
	assert.equal(result.reason, "resolution-step-limit");
	assert.equal(result.events.length, 1);
});

test("one thousand headless combats terminate without crash or infinite loop", () => {
	for (let index = 0; index < 1000; index += 1) {
		let run = createRun(`sim-${index}`);
		for (
			let action = 0;
			action < 80 && run.combat.phase === "AwaitPlayerAction";
			action += 1
		) {
			const card = run.combat.hand.find(
				(instance) => cost(instance) <= run.combat.energy,
			);
			const result = card
				? executeCommand(run, {
						type: "playCard",
						cardInstanceId: card,
						targetId: "enemy:0",
					})
				: executeCommand(run, { type: "endTurn" });
			assert.equal(result.accepted, true);
			assert.ok(result.run.combat.energy >= 0);
			run = result.run;
		}
		assert.notEqual(run.combat.phase, "AwaitPlayerAction");
		const before = stateDigest(run);
		const inactive = executeCommand(run, { type: "endTurn" });
		assert.equal(inactive.accepted, false);
		assert.equal(stateDigest(inactive.run), before);
	}
});
