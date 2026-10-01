import { describe, expect, it } from 'vitest';
import type { MissionStat, SessionRecord } from '$lib/history/types';
import { SHOWCASE } from '$lib/missions';
import { exampleFlights, pickFlights, solvedToday } from './wall';

const stat = (id: string, stars: number, path?: string[], skipped = false): MissionStat => ({
	id,
	stars,
	runs: 1,
	blocks: 3,
	seconds: 30,
	skipped,
	...(path ? { path } : {})
});

const rec = (
	id: string,
	finishedAt: string,
	missions: MissionStat[],
	pilotName: string | null = `P${id}`
): SessionRecord => ({
	id,
	v: 1,
	event: 'TDOT',
	station: 's1',
	mode: 'showcase',
	startedAt: finishedAt,
	finishedAt,
	pilotName,
	totalStars: missions.reduce((s, m) => s + m.stars, 0),
	missions,
	endedBy: 'finale'
});

const NOW = new Date('2026-10-10T15:00:00.000Z');
const P = ['0,4', '0,3'];

describe('solvedToday', () => {
	it('counts solved missions of today only', () => {
		const records = [
			rec('a', '2026-10-10T10:00:00.000Z', [
				stat('1.1', 3),
				stat('1.2', 0),
				stat('1.3', 2, undefined, true)
			]),
			rec('b', '2026-10-10T11:00:00.000Z', [stat('1.1', 1), stat('2.1', 2)], null),
			rec('c', '2026-10-09T11:00:00.000Z', [stat('1.1', 3)])
		];
		expect(solvedToday(records, NOW)).toBe(3);
		expect(solvedToday([], NOW)).toBe(0);
	});
});

describe('pickFlights', () => {
	const records = [
		rec('old', '2026-10-09T12:00:00.000Z', [stat('1.1', 3, P)]),
		rec('a', '2026-10-10T10:00:00.000Z', [stat('1.1', 3, P), stat('1.2', 2, P)]),
		rec('b', '2026-10-10T12:00:00.000Z', [
			stat('1.1', 1, P),
			stat('1.2', 0, P),
			stat('1.3', 3, P, true),
			stat('2.1', 2),
			stat('2.2', 2, ['1,1'])
		])
	];

	it('takes today’s solved flights with a path, newest first', () => {
		const flights = pickFlights(records, NOW, new Set());
		expect(flights.map((f) => f.key)).toEqual(['b:1.1', 'a:1.2', 'a:1.1']);
		expect(flights[0]).toMatchObject({ missionId: '1.1', stars: 1, path: P });
	});

	it('names only pilots the leaderboard shows', () => {
		const flights = pickFlights(records, NOW, new Set(['a']));
		expect(flights.map((f) => f.pilotName)).toEqual([null, 'Pa', 'Pa']);
	});

	it('stops at the limit', () => {
		expect(pickFlights(records, NOW, new Set(), 2)).toHaveLength(2);
	});
});

describe('exampleFlights', () => {
	it('turns the replayable reference solutions into paths on their maps', () => {
		const flights = exampleFlights(SHOWCASE);
		expect(flights.length).toBeGreaterThan(0);
		for (const f of flights) {
			const m = SHOWCASE.find((x) => x.id === f.missionId)!;
			expect(f.path[0]).toBe(`${m.map.start.x},${m.map.start.y}`);
			expect(f.path.length).toBeGreaterThan(1);
			expect(f.pilotName).toBeNull();
		}
	});
});
