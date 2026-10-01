import { describe, expect, it } from 'vitest';
import type { SessionRecord } from './types';
import { boardRows, leaderboard, logbook, missionsFlown } from './stats';

const rec = (
	id: string,
	stars: number,
	finishedAt: string,
	extra: Partial<SessionRecord> = {}
): SessionRecord => ({
	id,
	v: 1,
	event: 'TDOT',
	station: 's1',
	mode: 'showcase',
	startedAt: new Date(new Date(finishedAt).getTime() - 600_000).toISOString(),
	finishedAt,
	pilotName: `P${id}`,
	totalStars: stars,
	missions: [],
	endedBy: 'finale',
	...extra
});

const NOW = new Date('2026-10-10T15:00:00.000Z');

describe('leaderboard', () => {
	const records = [
		rec('a', 9, '2026-10-10T10:00:00.000Z'),
		rec('b', 12, '2026-10-10T11:00:00.000Z'),
		rec('c', 12, '2026-10-10T12:00:00.000Z', { startedAt: '2026-10-10T11:55:00.000Z' }),
		rec('d', 20, '2026-10-09T12:00:00.000Z'),
		rec('e', 21, '2026-10-10T12:00:00.000Z', { pilotName: null }),
		rec('f', 18, '2026-10-10T12:00:00.000Z', { event: 'OTHER' })
	];

	it('ranks today by stars, then by time, without unnamed entries', () => {
		const top = leaderboard(records, { period: 'today', now: NOW, event: 'TDOT' });
		expect(top.map((e) => e.id)).toEqual(['f', 'c', 'b', 'a']);
		expect(top[1].seconds).toBe(300);
	});

	it('filters by event and all time', () => {
		expect(
			leaderboard(records, { period: 'event', now: NOW, event: 'TDOT' }).map((e) => e.id)
		).toEqual(['d', 'c', 'b', 'a']);
		expect(
			leaderboard(records, { period: 'all', now: NOW, event: '' }, 2).map((e) => e.id)
		).toEqual(['d', 'f']);
	});

	it('numbers every entry and counts its solved missions', () => {
		const flown = rec('g', 5, '2026-10-10T13:00:00.000Z', {
			missions: [
				{ id: '1.1', stars: 3, runs: 1, blocks: 3, seconds: 40, skipped: false },
				{ id: '1.2', stars: 2, runs: 2, blocks: 5, seconds: 90, skipped: false },
				{ id: '1.3', stars: 0, runs: 0, blocks: 0, seconds: 0, skipped: true }
			]
		});
		const all = leaderboard([...records, flown], { period: 'today', now: NOW, event: 'TDOT' });
		expect(all.map((e) => [e.id, e.place])).toEqual([
			['f', 1],
			['c', 2],
			['b', 3],
			['a', 4],
			['g', 5]
		]);
		expect(all.at(-1)?.flown).toBe(2);
		expect(missionsFlown(all)).toBe(2);
	});
});

describe('boardRows', () => {
	const many = Array.from({ length: 15 }, (_, i) =>
		rec(`r${i}`, 30 - i, '2026-10-10T12:00:00.000Z', {
			missions: [{ id: '1.1', stars: 1, runs: 1, blocks: 3, seconds: 40, skipped: false }]
		})
	);
	const board = leaderboard(many, { period: 'today', now: NOW, event: 'TDOT' });

	it('adds the own row with its real place when it is not in the top 10', () => {
		const { top, own } = boardRows(board, 'r12');
		expect(top).toHaveLength(10);
		expect(own?.place).toBe(13);
	});

	it('shows no extra row when the visitor is in the top 10 or not on the list', () => {
		expect(boardRows(board, 'r3').own).toBeNull();
		expect(boardRows(board, 'nobody').own).toBeNull();
		expect(boardRows([], 'current')).toEqual({ top: [], own: null });
	});

	it('counts the missions of everyone in the period, not only the top 10', () => {
		expect(missionsFlown(board)).toBe(15);
	});
});

describe('logbook', () => {
	const records = [
		rec('a', 3, '2026-10-10T10:00:00.000Z', {
			missions: [
				{ id: '1.1', stars: 3, runs: 1, blocks: 3, seconds: 40, skipped: false },
				{ id: '1.2', stars: 0, runs: 0, blocks: 0, seconds: 0, skipped: true }
			]
		}),
		rec('b', 1, '2026-10-10T11:00:00.000Z', {
			endedBy: 'idle',
			missions: [{ id: '1.1', stars: 1, runs: 4, blocks: 6, seconds: 120, skipped: false }]
		}),
		rec('c', 0, '2025-10-11T11:00:00.000Z', { endedBy: 'idle', missions: [] })
	];

	it('counts visitors per day and year', () => {
		const log = logbook(records);
		expect(log.visitors).toBe(3);
		expect(log.finished).toBe(1);
		expect(log.perDay).toEqual([
			{ day: '2026-10-10', visitors: 2, finished: 1 },
			{ day: '2025-10-11', visitors: 1, finished: 0 }
		]);
		expect(log.perYear).toEqual([
			{ year: 2026, visitors: 2 },
			{ year: 2025, visitors: 1 }
		]);
	});

	it('summarises missions and where visitors stop', () => {
		const log = logbook(records);
		expect(log.perMission.find((m) => m.id === '1.1')).toEqual({
			id: '1.1',
			attempts: 2,
			solved: 2,
			avgStars: 2,
			avgSeconds: 80
		});
		expect(log.perMission.find((m) => m.id === '1.2')).toEqual({
			id: '1.2',
			attempts: 1,
			solved: 0,
			avgStars: 0,
			avgSeconds: 0
		});
		expect(log.dropOff).toEqual([
			{ mission: '1.1', count: 1 },
			{ mission: '–', count: 1 }
		]);
	});
});
