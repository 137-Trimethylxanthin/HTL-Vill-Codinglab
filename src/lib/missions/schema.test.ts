import { describe, expect, it } from 'vitest';
import { SHOWCASE } from './index';
import { parseMission } from './schema';

const valid = {
	id: '9.9',
	level: 1,
	title: 'Test',
	goalText: 'Lande auf dem Landeplatz.',
	map: { rows: ['..P', '.B.', '...'], start: { x: 0, y: 2, dir: 'N' } },
	blocks: ['takeoff', 'forward', 'land'],
	goal: { type: 'complete' },
	stars: { optimalBlocks: 3, maxRunsFor3: 3 },
	hints: ['Heb zuerst ab.'],
	solution: [{ id: 's1', type: 'takeoff' }]
};

describe('parseMission', () => {
	it('accepts a valid mission and fills defaults', () => {
		const m = parseMission(valid);
		expect(m.id).toBe('9.9');
		expect(m.fog).toBe(false);
		expect(m.editablePython).toBe(false);
	});

	it('checks hint targets against hints, blocks and the map', () => {
		expect(parseMission({ ...valid, hintTargets: [{ cell: [2, 0] }] }).hintTargets).toEqual([
			{ cell: [2, 0] }
		]);
		expect(() => parseMission({ ...valid, hintTargets: [{ block: 'photo' }] })).toThrow(/Ziel/);
		expect(() => parseMission({ ...valid, hintTargets: [{ cell: [5, 5] }] })).toThrow(/Ziel/);
		expect(() => parseMission({ ...valid, hintTargets: [null, null] })).toThrow(/Ziel/);
	});

	it('rejects rows of different length', () => {
		expect(() => parseMission({ ...valid, map: { ...valid.map, rows: ['..P', '..'] } })).toThrow(
			/Zeilen/
		);
	});

	it('rejects unknown tile characters', () => {
		expect(() =>
			parseMission({ ...valid, map: { ...valid.map, rows: ['..X', '...', '...'] } })
		).toThrow(/Feld/);
	});

	it('rejects a start outside the map or on a building', () => {
		expect(() =>
			parseMission({ ...valid, map: { ...valid.map, start: { x: 5, y: 0, dir: 'N' } } })
		).toThrow(/Start/);
		expect(() =>
			parseMission({ ...valid, map: { ...valid.map, start: { x: 1, y: 1, dir: 'N' } } })
		).toThrow(/Start/);
	});

	it('allows starting on a landing pad', () => {
		expect(
			parseMission({ ...valid, map: { ...valid.map, start: { x: 2, y: 0, dir: 'N' } } }).map.start.x
		).toBe(2);
	});

	it('rejects solutions or starters that use blocks outside the palette', () => {
		expect(() => parseMission({ ...valid, solution: [{ id: 's1', type: 'photo' }] })).toThrow(
			/Lösung/
		);
		expect(() => parseMission({ ...valid, starter: [{ id: 's1', type: 'photo' }] })).toThrow(
			/Start/
		);
	});
});

describe('SHOWCASE', () => {
	it('starts with mission 1.1', () => {
		expect(SHOWCASE[0].id).toBe('1.1');
	});
});
