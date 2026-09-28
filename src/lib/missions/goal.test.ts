import { describe, expect, it } from 'vitest';
import { World } from '$lib/sim/world';
import type { RunResult } from '$lib/sim/result';
import { isGoalReached } from './goal';
import { parseMission, type Mission } from './schema';
import { calcStars } from './stars';

const make = (rows: string[], start: { x: number; y: number; dir: 'N' | 'E' | 'S' | 'W' }) =>
	parseMission({
		id: '9.9',
		level: 1,
		title: 'T',
		goalText: 'T',
		map: { rows, start },
		blocks: ['takeoff'],
		goal: { type: 'complete' },
		stars: { optimalBlocks: 1, maxRunsFor3: 1 },
		hints: ['h'],
		solution: [{ id: 's', type: 'takeoff' }]
	});

function run(m: Mission, commands: [string, number?][]): RunResult {
	const world = new World(m);
	commands.forEach(([name, arg], i) => world.call(name, i + 3, arg));
	return { events: world.events, final: world.snapshot(), stop: world.stop, pyError: null };
}

const padMap = make(['P', '.', '.'], { x: 0, y: 2, dir: 'N' });

describe('isGoalReached', () => {
	it('needs a landing on the pad when the map has one', () => {
		expect(isGoalReached(padMap, run(padMap, [['takeoff'], ['forward', 2], ['land']]))).toBe(true);
		expect(isGoalReached(padMap, run(padMap, [['takeoff'], ['forward', 2]]))).toBe(false);
		expect(isGoalReached(padMap, run(padMap, [['takeoff'], ['forward', 1], ['land']]))).toBe(false);
	});

	it('is false after a stop or a Python error', () => {
		const ok = run(padMap, [['takeoff'], ['forward', 2], ['land']]);
		expect(
			isGoalReached(padMap, { ...ok, stop: { reason: 'timeout', code: 'timeout', line: 0 } })
		).toBe(false);
		expect(
			isGoalReached(padMap, { ...ok, pyError: { type: 'NameError', line: 3, message: 'x' } })
		).toBe(false);
	});

	it('needs every ring', () => {
		const through = make(['P', 'C', '.'], { x: 0, y: 2, dir: 'N' });
		expect(isGoalReached(through, run(through, [['takeoff'], ['forward', 2], ['land']]))).toBe(
			true
		);
		const aside = make(['PC', '..'], { x: 0, y: 1, dir: 'N' });
		expect(isGoalReached(aside, run(aside, [['takeoff'], ['forward', 1], ['land']]))).toBe(false);
	});

	it('needs every parcel delivered; without a pad any landing spot is fine', () => {
		const m = make(['D', 'K', '.'], { x: 0, y: 2, dir: 'N' });
		const delivered = run(m, [
			['takeoff'],
			['forward', 1],
			['pick_up'],
			['forward', 1],
			['drop'],
			['land']
		]);
		expect(isGoalReached(m, delivered)).toBe(true);
		const kept = run(m, [['takeoff'], ['forward', 1], ['pick_up'], ['forward', 1], ['land']]);
		expect(isGoalReached(m, kept)).toBe(false);
	});

	it('needs every panel photographed', () => {
		const m = make(['S', '.'], { x: 0, y: 1, dir: 'N' });
		expect(isGoalReached(m, run(m, [['takeoff'], ['forward', 1], ['land']]))).toBe(false);
		expect(isGoalReached(m, run(m, [['takeoff'], ['forward', 1], ['photo'], ['land']]))).toBe(true);
	});

	it('accepts landing back on the start pad', () => {
		const m = make(['.', 'P'], { x: 0, y: 1, dir: 'N' });
		expect(isGoalReached(m, run(m, [['takeoff'], ['land']]))).toBe(true);
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
