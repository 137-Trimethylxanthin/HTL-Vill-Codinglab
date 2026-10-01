import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '$lib/history/types';
import { clock, expectedSeconds, paceOf } from './pace';

const rec = (missions: [string, number, number][]): SessionRecord => ({
	id: crypto.randomUUID(),
	v: 1,
	event: '',
	station: 's',
	mode: 'showcase',
	startedAt: '2026-10-01T08:00:00Z',
	finishedAt: '2026-10-01T08:10:00Z',
	pilotName: null,
	totalStars: 0,
	missions: missions.map(([id, stars, seconds]) => ({
		id,
		stars,
		seconds,
		runs: 1,
		blocks: 3,
		skipped: stars === 0
	})),
	endedBy: 'finale'
});

describe('expectedSeconds', () => {
	it('uses a default by level until enough runs are solved', () => {
		expect(expectedSeconds('1.2', [])).toBe(120);
		expect(expectedSeconds('3.1', [rec([['3.1', 3, 50]])])).toBe(240);
	});

	it('takes the median of solved runs and ignores skipped ones', () => {
		const records = [
			rec([['2.1', 3, 60]]),
			rec([['2.1', 2, 100]]),
			rec([['2.1', 1, 300]]),
			rec([['2.1', 0, 5]]),
			rec([['1.1', 3, 10]])
		];
		expect(expectedSeconds('2.1', records)).toBe(100);
		records.push(rec([['2.1', 3, 140]]));
		expect(expectedSeconds('2.1', records)).toBe(120);
	});
});

describe('paceOf', () => {
	it('goes green, yellow, red as time runs over', () => {
		expect(paceOf(100, 120)).toBe('green');
		expect(paceOf(150, 120)).toBe('yellow');
		expect(paceOf(181, 120)).toBe('red');
	});
});

it('formats minutes and seconds', () => {
	expect(clock(245_000)).toBe('4:05');
	expect(clock(-5)).toBe('0:00');
});
