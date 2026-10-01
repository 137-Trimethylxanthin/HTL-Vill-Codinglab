import { describe, expect, it } from 'vitest';
import { SHOWCASE } from '$lib/missions';
import type { MissionResult } from '$lib/session/types';
import { decodeVisit, encodeVisit, encodeVisitPlain, onMaps, visitOf, type Visit } from './codec';

const result = (
	id: string,
	stars: 0 | 1 | 2 | 3,
	path: string[],
	skipped = false
): MissionResult => ({
	id,
	stars,
	runs: 1,
	blocks: 3,
	seconds: 30,
	skipped,
	path
});

// A long snake over a 5×5 map: more than any real flight visits.
const snake = Array.from({ length: 25 }, (_, i) => {
	const y = Math.floor(i / 5);
	return `${y % 2 ? 4 - (i % 5) : i % 5},${y}`;
});

const fullVisit: Visit = {
	flights: SHOWCASE.map((m) => ({ id: m.id, stars: 3, path: snake })),
	link: 'https://www.example.org/schule'
};

describe('visitOf', () => {
	it('keeps solved missions with a path and nothing personal', () => {
		const visit = visitOf([
			result('1.1', 3, ['0,4', '0,3']),
			result('1.2', 0, ['0,4']),
			result('1.3', 2, ['1,1'], true),
			result('2.1', 2, [])
		]);
		expect(visit).toEqual({ flights: [{ id: '1.1', stars: 3, path: ['0,4', '0,3'] }], link: null });
	});
});

describe('encode / decode', () => {
	it('round-trips compressed', async () => {
		const code = await encodeVisit(fullVisit);
		expect(code[0]).toBe('z');
		expect(await decodeVisit('#' + code)).toEqual({
			...fullVisit,
			link: 'https://www.example.org/schule'
		});
	});

	it('round-trips plain (no compression available)', async () => {
		const visit: Visit = { flights: [{ id: '2.2', stars: 1, path: ['7,2', '6,2'] }], link: null };
		const code = encodeVisitPlain(visit);
		expect(code[0]).toBe('p');
		expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(await decodeVisit(code)).toEqual(visit);
	});

	it('keeps a visit with all 7 missions short enough for a QR code', async () => {
		expect((await encodeVisit(fullVisit)).length).toBeLessThan(400);
		expect(encodeVisitPlain(fullVisit).length).toBeLessThan(800);
	});

	it('turns garbage into null', async () => {
		const plain = (text: string) => 'p' + Buffer.from(text).toString('base64url');
		for (const bad of [
			'',
			'#',
			'x',
			'pnot base64!',
			'zAAAA',
			'q' + encodeVisitPlain(fullVisit).slice(1),
			plain('{"a":1}'),
			plain('[[]]'),
			plain('[[["1.1",4,"0403"]]]'),
			plain('[[["<b>",3,"0403"]]]'),
			plain('[[["1.1",3,"040"]]]'),
			plain('[[["1.1",3,"04-3"]]]'),
			plain('not json'),
			'p' + 'A'.repeat(5000)
		]) {
			expect(await decodeVisit(bad), bad.slice(0, 40)).toBeNull();
		}
	});

	it('drops links that are not web addresses', async () => {
		const code = encodeVisitPlain({ ...fullVisit, link: 'javascript:alert(1)' });
		expect((await decodeVisit(code))?.link).toBeNull();
	});
});

describe('onMaps', () => {
	it('drops unknown missions and paths outside the map', () => {
		const matched = onMaps(
			[
				{ id: '1.1', stars: 3, path: ['0,4', '0,3'] },
				{ id: '9.9', stars: 3, path: ['0,0'] },
				{ id: '1.2', stars: 2, path: ['0,4', '9,9'] }
			],
			SHOWCASE
		);
		expect(matched.map((m) => m.mission.id)).toEqual(['1.1']);
	});
});
