import { describe, expect, it } from 'vitest';
import { SHOWCASE } from './index';
import { parseMission } from './schema';

const valid = {
	id: '9.9',
	level: 1,
	title: 'Test',
	goalText: 'Lande auf dem Landeplatz.',
	map: { rows: ['..P', '...', '...'], start: { x: 0, y: 2, dir: 'N' } },
	blocks: ['takeoff', 'forward', 'land'],
	goal: { type: 'landOn' },
	stars: { optimalBlocks: 3, maxRunsFor3: 3 },
	hints: ['Heb zuerst ab.'],
	solution: [{ id: 's1', type: 'takeoff' }]
};

describe('parseMission', () => {
	it('accepts a valid mission', () => {
		expect(parseMission(valid).id).toBe('9.9');
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

	it('rejects a start outside the map or not on ground', () => {
		expect(() =>
			parseMission({ ...valid, map: { ...valid.map, start: { x: 5, y: 0, dir: 'N' } } })
		).toThrow(/Start/);
		expect(() =>
			parseMission({ ...valid, map: { ...valid.map, start: { x: 2, y: 0, dir: 'N' } } })
		).toThrow(/Start/);
	});

	it('rejects a solution that uses blocks outside the palette', () => {
		expect(() => parseMission({ ...valid, solution: [{ id: 's1', type: 'photo' }] })).toThrow(
			/Lösung/
		);
	});
});

describe('SHOWCASE', () => {
	it('contains mission 1.1 first', () => {
		expect(SHOWCASE[0].id).toBe('1.1');
	});
});
