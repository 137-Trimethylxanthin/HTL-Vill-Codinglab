import { describe, expect, it } from 'vitest';
import { World } from '$lib/sim/world';
import type { RunResult } from '$lib/sim/result';
import { SHOWCASE } from './index';
import { isGoalReached } from './goal';
import { calcStars } from './stars';

const m11 = SHOWCASE[0];

function runCommands(commands: [string, number?][]): RunResult {
	const world = new World(m11);
	commands.forEach(([name, arg], i) => world.call(name, i + 3, arg));
	return { events: world.events, final: world.snapshot(), stop: world.stop, pyError: null };
}

describe('isGoalReached (landOn)', () => {
	it('is true when landed on the pad', () => {
		expect(isGoalReached(m11, runCommands([['takeoff'], ['forward', 4], ['land']]))).toBe(true);
	});

	it('is false when still flying above the pad', () => {
		expect(isGoalReached(m11, runCommands([['takeoff'], ['forward', 4]]))).toBe(false);
	});

	it('is false when landed elsewhere', () => {
		expect(isGoalReached(m11, runCommands([['takeoff'], ['forward', 2], ['land']]))).toBe(false);
	});

	it('is false after a stop or a Python error', () => {
		const ok = runCommands([['takeoff'], ['forward', 4], ['land']]);
		expect(
			isGoalReached(m11, { ...ok, stop: { reason: 'timeout', code: 'timeout', line: 0 } })
		).toBe(false);
		expect(
			isGoalReached(m11, { ...ok, pyError: { type: 'NameError', line: 3, message: 'x' } })
		).toBe(false);
	});
});

describe('calcStars', () => {
	const rules = { optimalBlocks: 3, maxRunsFor3: 3 };

	it('gives 0 when the goal was not reached', () => {
		expect(calcStars({ reached: false, blockCount: 3, runs: 1 }, rules)).toBe(0);
	});

	it('gives 3 for an optimal program in few runs', () => {
		expect(calcStars({ reached: true, blockCount: 3, runs: 3 }, rules)).toBe(3);
	});

	it('gives 2 for an optimal program with many runs or up to 2 extra blocks', () => {
		expect(calcStars({ reached: true, blockCount: 3, runs: 4 }, rules)).toBe(2);
		expect(calcStars({ reached: true, blockCount: 5, runs: 1 }, rules)).toBe(2);
	});

	it('gives 1 for longer programs', () => {
		expect(calcStars({ reached: true, blockCount: 6, runs: 1 }, rules)).toBe(1);
	});
});
