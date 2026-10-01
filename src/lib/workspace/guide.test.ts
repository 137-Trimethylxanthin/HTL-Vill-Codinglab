import { describe, expect, it } from 'vitest';
import type { BlockNode } from '$lib/blocks/types';
import { nextGuideStep } from './guide';

const solution: BlockNode[] = [
	{ id: 's1', type: 'takeoff' },
	{ id: 's2', type: 'forward', n: 4 },
	{ id: 's3', type: 'land' }
];

describe('nextGuideStep', () => {
	it('adds the blocks one by one and sets each number before going on', () => {
		expect(nextGuideStep([], solution)).toEqual({ kind: 'add', type: 'takeoff' });
		const one: BlockNode[] = [{ id: 'a', type: 'takeoff' }];
		expect(nextGuideStep(one, solution)).toEqual({ kind: 'add', type: 'forward' });
		const two: BlockNode[] = [...one, { id: 'b', type: 'forward', n: 1 }];
		expect(nextGuideStep(two, solution)).toEqual({ kind: 'step', id: 'b', delta: 1 });
		const set: BlockNode[] = [...one, { id: 'b', type: 'forward', n: 4 }];
		expect(nextGuideStep(set, solution)).toEqual({ kind: 'add', type: 'land' });
		expect(nextGuideStep([...set, { id: 'c', type: 'land' }], solution)).toEqual({
			kind: 'start'
		});
	});

	it('points at minus when the number is too big', () => {
		const program: BlockNode[] = [
			{ id: 'a', type: 'takeoff' },
			{ id: 'b', type: 'forward', n: 6 }
		];
		expect(nextGuideStep(program, solution)).toEqual({ kind: 'step', id: 'b', delta: -1 });
	});

	it('steps back when the child goes its own way', () => {
		expect(nextGuideStep([{ id: 'a', type: 'land' }], solution)).toBeNull();
		const long: BlockNode[] = [...solution.map((n) => ({ ...n })), { id: 'x', type: 'land' }];
		expect(nextGuideStep(long, solution)).toBeNull();
	});

	it('does not guide solutions with loops', () => {
		const loop: BlockNode[] = [{ id: 'r', type: 'repeat', n: 2, children: [] }];
		expect(nextGuideStep([], loop)).toBeNull();
	});
});
