import { describe, expect, it } from 'vitest';
import { DEFAULT_PUBLIC_CONFIG } from '$lib/config/station.svelte';
import { toRecord } from './record';

describe('toRecord', () => {
	it('turns a session summary into a record', () => {
		const record = toRecord(
			{
				pilotName: 'Lea',
				startedAt: Date.UTC(2026, 9, 10, 10, 0, 0),
				finishedAt: Date.UTC(2026, 9, 10, 10, 12, 0),
				endedBy: 'finale',
				totalStars: 3,
				results: [
					{ id: '1.1', stars: 3, runs: 2, blocks: 3, seconds: 55, skipped: false, path: ['2,4'] }
				]
			},
			{ ...DEFAULT_PUBLIC_CONFIG, stationId: 'st-1', eventCode: 'TDOT' },
			'rec-1'
		);
		expect(record).toEqual({
			id: 'rec-1',
			v: 1,
			event: 'TDOT',
			station: 'st-1',
			mode: 'showcase',
			startedAt: '2026-10-10T10:00:00.000Z',
			finishedAt: '2026-10-10T10:12:00.000Z',
			pilotName: 'Lea',
			totalStars: 3,
			missions: [
				{ id: '1.1', stars: 3, runs: 2, blocks: 3, seconds: 55, skipped: false, path: ['2,4'] }
			],
			endedBy: 'finale'
		});
	});

	it('generates an id', () => {
		const summary = {
			pilotName: '',
			startedAt: 0,
			finishedAt: 1000,
			endedBy: 'idle' as const,
			totalStars: 0,
			results: []
		};
		expect(toRecord(summary, DEFAULT_PUBLIC_CONFIG).id).toHaveLength(36);
		expect(toRecord(summary, DEFAULT_PUBLIC_CONFIG).pilotName).toBeNull();
	});

	it('keeps the flight path only for solved missions', () => {
		const record = toRecord(
			{
				pilotName: '',
				startedAt: 0,
				finishedAt: 1000,
				endedBy: 'quit',
				totalStars: 0,
				results: [
					{ id: '1.1', stars: 0, runs: 2, blocks: 3, seconds: 5, skipped: false, path: ['2,4'] },
					{ id: '1.2', stars: 0, runs: 0, blocks: 0, seconds: 5, skipped: true, path: ['1,4'] }
				]
			},
			DEFAULT_PUBLIC_CONFIG
		);
		expect(record.missions.map((m) => m.path)).toEqual([undefined, undefined]);
	});
});
