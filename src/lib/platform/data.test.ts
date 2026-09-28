import { describe, expect, it } from 'vitest';
import { SHOWCASE } from '$lib/missions';
import { Session } from '$lib/session/session.svelte';
import { certificateData, isValidEmail, missionsFor } from './data';

describe('isValidEmail', () => {
	it('accepts normal addresses', () => {
		expect(isValidEmail('lea@example.org')).toBe(true);
		expect(isValidEmail('lea.maier+lab@schule.ac.at')).toBe(true);
	});

	it('refuses broken ones', () => {
		for (const bad of [
			'',
			'lea',
			'lea@',
			'@example.org',
			'lea@localhost',
			'le a@example.org',
			'lea@example.o'
		]) {
			expect(isValidEmail(bad), bad).toBe(false);
		}
	});
});

describe('missionsFor', () => {
	it('keeps all missions when nothing is selected', () => {
		expect(missionsFor(SHOWCASE, null)).toHaveLength(7);
		expect(missionsFor(SHOWCASE, [])).toHaveLength(7);
	});

	it('keeps only the enabled ones, in order', () => {
		expect(missionsFor(SHOWCASE, ['2.1', '1.1']).map((m) => m.id)).toEqual(['1.1', '2.1']);
	});

	it('falls back to all when the selection matches nothing', () => {
		expect(missionsFor(SHOWCASE, ['9.9'])).toHaveLength(7);
	});
});

describe('certificateData', () => {
	it('summarises the solved missions and the last flight', () => {
		const s = new Session(SHOWCASE);
		s.begin();
		s.setPilot('Lea');
		s.open('2.1');
		s.complete({
			id: '2.1',
			stars: 3,
			runs: 1,
			blocks: 5,
			seconds: 40,
			skipped: false,
			path: ['1,3', '1,2']
		});
		s.backToMap();
		s.open('1.2');
		s.skip();
		const data = certificateData(s, 'https://www.htl-villach.at', new Date(2026, 9, 10));
		expect(data).toMatchObject({
			pilotName: 'Lea',
			totalStars: 3,
			maxStars: 21,
			missions: [{ id: '2.1', title: 'Runde drehen', stars: 3 }],
			date: '10.10.2026',
			qrUrl: 'https://www.htl-villach.at'
		});
		expect(data.map?.path).toEqual(['1,3', '1,2']);
		expect(data.map?.rows[0]).toBe('.....');
	});
});
