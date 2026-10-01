import { describe, expect, it } from 'vitest';
import { parseMission } from '$lib/missions/schema';
import { World } from './world';

const mission = (rows: string[], start = { x: 0, y: rows.length - 1, dir: 'N' as const }) =>
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

describe('World', () => {
	it('takes off, moves step by step and lands', () => {
		const w = new World(mission(['P', '.', '.']));
		expect(w.call('takeoff', 1)).toBe(true);
		expect(w.call('forward', 2, 2)).toBe(true);
		expect(w.call('land', 3)).toBe(true);
		expect(w.events).toEqual([
			{ kind: 'takeoff', line: 1, call: 1 },
			{ kind: 'move', line: 2, x: 0, y: 1, call: 2 },
			{ kind: 'move', line: 2, x: 0, y: 0, call: 2 },
			{ kind: 'land', line: 3, call: 3 }
		]);
		expect(w.snapshot()).toMatchObject({ x: 0, y: 0, flying: false });
		expect(w.stop).toBeNull();
	});

	it('remembers every visited cell, including the start', () => {
		const w = new World(mission(['.', 'C', '.']));
		w.call('takeoff', 1);
		w.call('forward', 2, 2);
		expect(w.snapshot().visited).toEqual(['0,2', '0,1', '0,0']);
	});

	it('turns left and right', () => {
		const w = new World(mission(['.']));
		w.call('turn_left', 1);
		expect(w.snapshot().dir).toBe('W');
		w.call('turn_right', 2);
		w.call('turn_right', 3);
		expect(w.snapshot().dir).toBe('E');
	});

	it('refuses to move before takeoff', () => {
		const w = new World(mission(['.', '.']));
		expect(w.call('forward', 4, 1)).toBe(false);
		expect(w.stop).toEqual({ reason: 'error', code: 'notFlying', line: 4 });
	});

	it('crashes into buildings and stops', () => {
		const w = new World(mission(['.', 'B', '.']));
		w.call('takeoff', 1);
		expect(w.call('forward', 2, 2)).toBe(false);
		expect(w.events.at(-1)).toEqual({
			kind: 'crash',
			line: 2,
			x: 0,
			y: 1,
			into: 'building',
			call: 2
		});
		expect(w.stop).toEqual({ reason: 'crash', code: 'building', line: 2 });
		expect(w.snapshot()).toMatchObject({ x: 0, y: 2 });
	});

	it('crashes at the map edge', () => {
		const w = new World(mission(['.']));
		w.call('takeoff', 1);
		expect(w.call('forward', 2, 1)).toBe(false);
		expect(w.stop?.code).toBe('edge');
	});

	it('rejects bad numbers', () => {
		for (const bad of [0, -1, 1.5, '2', 100]) {
			const w = new World(mission(['.', '.']));
			w.call('takeoff', 1);
			expect(w.call('forward', 2, bad)).toBe(false);
			expect(w.stop?.code).toBe('badNumber');
		}
	});

	it('picks up a parcel and drops it on a drop zone', () => {
		const w = new World(mission(['D', 'K', '.']));
		w.call('takeoff', 1);
		w.call('forward', 2, 1);
		expect(w.call('pick_up', 3)).toBe(true);
		expect(w.snapshot()).toMatchObject({ carrying: true, rows: ['D', '.', '.'] });
		w.call('forward', 4, 1);
		expect(w.call('drop', 5)).toBe(true);
		expect(w.snapshot()).toMatchObject({ carrying: false, delivered: 1 });
	});

	it('photographs panels once each', () => {
		const w = new World(mission(['S', '.']));
		w.call('takeoff', 1);
		w.call('photo', 2);
		w.call('forward', 3, 1);
		w.call('photo', 4);
		w.call('photo', 5);
		expect(
			w.events.filter((e) => e.kind === 'photo').map((e) => (e as { hit: boolean }).hit)
		).toEqual([false, true, true]);
		expect(w.snapshot().photographed).toEqual(['0,0']);
	});

	it('senses buildings and the map edge ahead without moving', () => {
		const w = new World(mission(['.', 'B', '.']));
		expect(w.sense('obstacle_ahead', 3)).toBe(true);
		w.call('turn_right', 4);
		expect(w.sense('obstacle_ahead', 5)).toBe(true);
		expect(w.events.filter((e) => e.kind === 'sense')).toEqual([
			{ kind: 'sense', line: 3, ahead: true, call: 1 },
			{ kind: 'sense', line: 5, ahead: true, call: 3 }
		]);
		expect(w.snapshot()).toMatchObject({ x: 0, y: 2 });
	});

	it('senses free space', () => {
		const w = new World(mission(['.', '.']));
		expect(w.sense('obstacle_ahead', 1)).toBe(false);
	});

	it('returns undefined from sense at the event limit or for unknown sensors', () => {
		const limited = new World(mission(['.']), 1);
		limited.call('turn_left', 1);
		expect(limited.sense('obstacle_ahead', 2)).toBeUndefined();
		expect(limited.stop?.code).toBe('tooManySteps');
		const unknown = new World(mission(['.']));
		expect(unknown.sense('radar', 1)).toBeUndefined();
		expect(unknown.stop?.code).toBe('unknownCommand');
	});

	it('stops when the event limit is reached', () => {
		const w = new World(mission(['.']), 5);
		let ok = true;
		let calls = 0;
		while (ok && calls < 100) {
			ok = w.call('turn_left', 1);
			calls++;
		}
		expect(w.events).toHaveLength(5);
		expect(w.stop).toEqual({ reason: 'limit', code: 'tooManySteps', line: 1 });
	});

	it('ignores every call after a stop', () => {
		const w = new World(mission(['.']));
		w.call('land', 1);
		expect(w.call('takeoff', 2)).toBe(false);
		expect(w.sense('obstacle_ahead', 3)).toBeUndefined();
		expect(w.events).toHaveLength(0);
	});

	it('rejects unknown commands', () => {
		const w = new World(mission(['.']));
		expect(w.call('explode', 1)).toBe(false);
		expect(w.stop?.code).toBe('unknownCommand');
	});
});
