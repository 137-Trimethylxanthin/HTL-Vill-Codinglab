import { describe, expect, it } from 'vitest';
import { SHOWCASE } from '$lib/missions';
import { HELP_GUARD_MS, Session } from './session.svelte';
import type { MissionResult } from './types';

const result = (
	id: string,
	stars: 0 | 1 | 2 | 3,
	extra: Partial<MissionResult> = {}
): MissionResult => ({
	id,
	stars,
	runs: 1,
	blocks: 3,
	seconds: 30,
	skipped: false,
	path: ['0,0'],
	...extra
});

function atMap() {
	let time = 1000;
	const s = new Session(SHOWCASE, () => time);
	s.begin();
	s.setPilot('Anna');
	return { s, advance: (ms: number) => (time += ms) };
}

describe('Session', () => {
	it('starts every new duo with the first kid tapping', () => {
		let time = 1000;
		const s = new Session(SHOWCASE, () => time);
		s.begin();
		s.setPilot('Solo');
		s.open('1.1');
		s.reset('quit');
		s.begin();
		s.setPilot('Duo', true);
		s.open('1.1');
		expect(s.driver).toBe(1);
		time += 1;
	});

	it('lets two kids take turns at tapping, one mission each', () => {
		let time = 1000;
		const s = new Session(SHOWCASE, () => time);
		s.begin();
		s.setPilot('Anna', true);
		expect(s.driver).toBe(2);
		s.open('1.1');
		expect(s.driver).toBe(1);
		s.backToMap();
		s.open('1.2');
		expect(s.driver).toBe(2);
		s.backToMap();
		s.open('1.2');
		expect(s.driver).toBe(2); // reopening the same mission keeps the roles
		time += 1;
		const alone = atMap().s;
		alone.open('1.1');
		expect(alone.driver).toBeNull();
	});

	it('walks attract → pilot → map → mission → complete', () => {
		const { s } = atMap();
		expect(s.screen).toBe('map');
		expect(s.pilotName).toBe('Anna');
		s.open('1.1');
		expect(s.screen).toBe('mission');
		expect(s.current?.id).toBe('1.1');
		s.complete(result('1.1', 3));
		expect(s.screen).toBe('complete');
		expect(s.lastResult?.stars).toBe(3);
	});

	it('continues with the next unsolved mission', () => {
		const { s } = atMap();
		s.open('1.1');
		s.complete(result('1.1', 2));
		s.continue();
		expect(s.screen).toBe('mission');
		expect(s.currentId).toBe('1.2');
	});

	it('recommends the first unsolved mission and wraps around', () => {
		const { s } = atMap();
		expect(s.recommended).toBe('1.1');
		s.open('3.2');
		s.complete(result('3.2', 1));
		expect(s.nextAfter('3.2')).toBe('1.1');
		expect(s.recommended).toBe('1.1');
	});

	it('returns to the map when everything is solved', () => {
		const { s } = atMap();
		for (const m of SHOWCASE) {
			s.open(m.id);
			s.complete(result(m.id, 3));
			if (m !== SHOWCASE.at(-1)) s.backToMap();
		}
		expect(s.nextAfter(null)).toBeNull();
		s.continue();
		expect(s.screen).toBe('map');
		expect(s.totalStars).toBe(21);
		expect(s.maxStars).toBe(21);
	});

	it('keeps the best result', () => {
		const { s } = atMap();
		s.open('1.1');
		s.complete(result('1.1', 3));
		s.backToMap();
		s.open('1.1');
		s.complete(result('1.1', 1));
		expect(s.results['1.1'].stars).toBe(3);
		expect(s.lastResult?.stars).toBe(1);
	});

	it('marks skipped missions without overwriting a solved one', () => {
		const { s } = atMap();
		s.open('1.2');
		s.skip();
		expect(s.screen).toBe('map');
		expect(s.results['1.2']).toMatchObject({ skipped: true, stars: 0 });
		expect(s.isSolved('1.2')).toBe(false);
		s.open('1.1');
		s.complete(result('1.1', 2));
		s.backToMap();
		s.open('1.1');
		s.skip();
		expect(s.results['1.1'].stars).toBe(2);
	});

	it('allows the finale only after one solved mission', () => {
		const { s } = atMap();
		expect(s.canFinish).toBe(false);
		s.finish();
		expect(s.screen).toBe('map');
		s.open('1.1');
		s.complete(result('1.1', 1));
		s.backToMap();
		s.finish();
		expect(s.screen).toBe('finale');
	});

	it('knows the last mission of each level', () => {
		const { s } = atMap();
		expect(s.isLastOfLevel('1.3')).toBe(true);
		expect(s.isLastOfLevel('1.2')).toBe(false);
		expect(s.isLastOfLevel('3.2')).toBe(true);
	});

	it('ignores out-of-order transitions', () => {
		const s = new Session(SHOWCASE);
		s.setPilot('X');
		s.open('1.1');
		s.complete(result('1.1', 3));
		s.finish();
		expect(s.screen).toBe('attract');
		s.begin();
		s.begin();
		expect(s.screen).toBe('pilot');
		s.setPilot('Anna');
		s.setPilot('Bert');
		expect(s.pilotName).toBe('Anna');
		s.open('nope');
		expect(s.screen).toBe('map');
	});

	it('resets to attract and returns a summary', () => {
		const { s, advance } = atMap();
		s.open('1.1');
		s.complete(result('1.1', 3));
		advance(60_000);
		const summary = s.reset('finale');
		expect(summary).toMatchObject({
			pilotName: 'Anna',
			startedAt: 1000,
			finishedAt: 61_000,
			endedBy: 'finale',
			totalStars: 3
		});
		expect(summary?.results).toHaveLength(1);
		expect(s.screen).toBe('attract');
		expect(s.pilotName).toBe('');
		expect(s.results).toEqual({});
	});

	it('returns no summary when nobody started', () => {
		expect(new Session(SHOWCASE).reset('idle')).toBeNull();
	});

	it('records a solved mission without leaving it', () => {
		const { s } = atMap();
		s.open('1.1');
		s.record(result('1.1', 2));
		expect(s.screen).toBe('mission');
		expect(s.isSolved('1.1')).toBe(true);
		s.backToMap();
		expect(s.results['1.1'].stars).toBe(2);
		s.open('1.1');
		s.skip();
		expect(s.results['1.1'].stars).toBe(2);
	});

	it('counts a timeout on the finale as finished, elsewhere as idle', () => {
		const { s } = atMap();
		s.open('1.1');
		s.complete(result('1.1', 1));
		s.backToMap();
		s.finish();
		expect(s.timeout()?.endedBy).toBe('finale');
		const other = atMap().s;
		expect(other.timeout()?.endedBy).toBe('idle');
	});

	it('exposes when the visit started', () => {
		const { s } = atMap();
		expect(s.startedAtMs).toBe(1000);
		s.reset('quit');
		expect(s.startedAtMs).toBe(0);
	});

	it('toggles help, but a double tap is one tap', () => {
		const { s, advance } = atMap();
		s.toggleHelp();
		s.toggleHelp();
		expect(s.help).toBe(true);
		advance(HELP_GUARD_MS);
		s.toggleHelp();
		expect(s.help).toBe(false);
	});

	it('clears help when the mission is solved, by a supervisor or on reset', () => {
		const { s, advance } = atMap();
		s.open('1.1');
		s.toggleHelp();
		s.record(result('1.1', 2));
		expect(s.help).toBe(false);
		advance(HELP_GUARD_MS);
		s.toggleHelp();
		s.clearHelp();
		expect(s.help).toBe(false);
		advance(HELP_GUARD_MS);
		s.toggleHelp();
		s.reset('idle');
		expect(s.help).toBe(false);
	});

	it('clears help when the visitor leaves the mission', () => {
		const { s, advance } = atMap();
		s.open('1.1');
		s.toggleHelp();
		s.backToMap();
		expect(s.help).toBe(false);
		s.open('1.1');
		advance(HELP_GUARD_MS);
		s.toggleHelp();
		s.skip();
		expect(s.help).toBe(false);
	});

	it('remembers when the current mission was opened', () => {
		const { s, advance } = atMap();
		advance(5000);
		s.open('1.1');
		expect(s.openedAt).toBe(6000);
		s.complete(result('1.1', 3));
		advance(1000);
		s.continue();
		expect(s.openedAt).toBe(7000);
		s.reset('quit');
		expect(s.openedAt).toBe(0);
	});

	it('never gives stars for a revealed solution', () => {
		const { s } = atMap();
		s.open('1.1');
		s.toggleHelp();
		s.reveal();
		expect(s.help).toBe(false);
		expect(s.isRevealed('1.1')).toBe(true);
		s.reveal();
		expect(s.revealTick).toBe(2);
		expect(s.revealed).toEqual(['1.1']);
		s.complete(result('1.1', 3));
		expect(s.results['1.1']).toMatchObject({ stars: 0, skipped: true });
		expect(s.lastResult).toMatchObject({ stars: 0, skipped: true });
		expect(s.isSolved('1.1')).toBe(false);
		expect(s.totalStars).toBe(0);
		s.reset('quit');
		expect(s.revealed).toEqual([]);
		expect(s.revealTick).toBe(0);
	});

	it('keeps a result earned before the solution was revealed', () => {
		const { s } = atMap();
		s.open('1.1');
		s.record(result('1.1', 2));
		s.reveal();
		s.record(result('1.1', 3));
		expect(s.results['1.1']).toMatchObject({ stars: 2, skipped: false });
	});

	it('lets a supervisor jump to any mission', () => {
		const { s } = atMap();
		s.open('1.1');
		s.goTo('3.1');
		expect(s.screen).toBe('mission');
		expect(s.currentId).toBe('3.1');
		s.complete(result('3.1', 1));
		s.goTo('2.1');
		expect(s.currentId).toBe('2.1');
		s.goTo('nope');
		expect(s.screen).toBe('map');
		const idle = new Session(SHOWCASE);
		idle.goTo('1.1');
		expect(idle.screen).toBe('attract');
	});
});
