import { describe, expect, it } from 'vitest';
import type { BlockNode } from '$lib/blocks/types';
import { SHOWCASE } from '$lib/missions';
import { seededRandom, shuffleBlocks } from './order';
import { ORDERED_MAX_STARS, Session } from './session.svelte';
import type { MissionResult } from './types';

const solution: BlockNode[] = [
	{ id: 's1', type: 'takeoff' },
	{
		id: 's2',
		type: 'repeat',
		n: 4,
		children: [
			{ id: 's3', type: 'forward', n: 2 },
			{ id: 's4', type: 'turn_right' }
		]
	},
	{ id: 's5', type: 'land' }
];

const types = (blocks: BlockNode[]) => blocks.map((b) => b.type);

describe('shuffleBlocks', () => {
	it('shuffles the top level and keeps bodies inside their containers', () => {
		// random 0 swaps each block with the first: takeoff, repeat, land -> repeat, land, takeoff
		const shuffled = shuffleBlocks(solution, () => 0);
		expect(types(shuffled)).toEqual(['repeat', 'land', 'takeoff']);
		expect(shuffled[0].children).toEqual(solution[1].children);
		expect(types(solution)).toEqual(['takeoff', 'repeat', 'land']);
	});

	it('never hands back the solution order', () => {
		// random just below 1 swaps nothing: the order is shifted by one instead
		expect(types(shuffleBlocks(solution, () => 0.999))).toEqual(['repeat', 'land', 'takeoff']);
		for (let seed = 0; seed < 50; seed++) {
			expect(types(shuffleBlocks(solution, seededRandom(seed)))).not.toEqual(types(solution));
		}
	});

	it('treats equal blocks as equal, whatever their ids', () => {
		const twins: BlockNode[] = [
			{ id: 'a', type: 'forward', n: 1 },
			{ id: 'b', type: 'forward', n: 1 },
			{ id: 'c', type: 'land' }
		];
		// swapping only the two forwards would look unchanged
		const shuffled = shuffleBlocks(twins, seededRandom(1));
		expect(types(shuffled)).not.toEqual(types(twins));
		const same: BlockNode[] = [
			{ id: 'a', type: 'forward' },
			{ id: 'b', type: 'forward' }
		];
		expect(types(shuffleBlocks(same, () => 0))).toEqual(['forward', 'forward']);
	});

	it('gives the same order for the same seed', () => {
		const a = shuffleBlocks(SHOWCASE.at(-1)!.solution, seededRandom(7));
		const b = shuffleBlocks(SHOWCASE.at(-1)!.solution, seededRandom(7));
		expect(a).toEqual(b);
	});
});

const result = (id: string, stars: 0 | 1 | 2 | 3): MissionResult => ({
	id,
	stars,
	runs: 1,
	blocks: 3,
	seconds: 30,
	skipped: false,
	path: ['0,0']
});

function inMission(id: string) {
	const s = new Session(SHOWCASE, () => 1000);
	s.begin();
	s.setPilot('Anna');
	s.open(id);
	return s;
}

describe('Session.order', () => {
	it('counts a solve after ordering, but for at most two stars', () => {
		const s = inMission('1.1');
		s.toggleHelp();
		s.order();
		expect(s.help).toBe(false);
		expect(s.isOrdered('1.1')).toBe(true);
		expect(s.revealTick).toBe(1);
		s.complete(result('1.1', 3));
		expect(s.results['1.1']).toMatchObject({ stars: ORDERED_MAX_STARS, skipped: false });
		expect(s.lastResult?.stars).toBe(ORDERED_MAX_STARS);
		expect(s.isSolved('1.1')).toBe(true);
		s.reset('quit');
		expect(s.ordered).toEqual([]);
	});

	it('keeps fewer stars as they are and a better earlier result', () => {
		const s = inMission('1.1');
		s.record(result('1.1', 3));
		s.order();
		s.record(result('1.1', 1));
		expect(s.results['1.1'].stars).toBe(3);
		const t = inMission('1.2');
		t.order();
		t.record(result('1.2', 1));
		expect(t.results['1.2'].stars).toBe(1);
	});

	it('does nothing once the solution was shown', () => {
		const s = inMission('1.1');
		s.reveal();
		s.order();
		expect(s.isOrdered('1.1')).toBe(false);
		expect(s.revealTick).toBe(1);
		s.complete(result('1.1', 3));
		expect(s.lastResult).toMatchObject({ stars: 0, skipped: true });
	});
});
