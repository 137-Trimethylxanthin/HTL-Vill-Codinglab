import { describe, expect, it } from 'vitest';
import type { BlockNode } from '$lib/blocks/types';
import { SHOWCASE } from '$lib/missions';
import { previewBlock } from './preview';

const m11 = SHOWCASE[0]; // start (2,4) facing N, pad 4 fields ahead

const program: BlockNode[] = [
	{ id: 't', type: 'takeoff' },
	{ id: 'f', type: 'forward', n: 3 },
	{ id: 'r', type: 'turn_right' },
	{ id: 'l', type: 'land' }
];

describe('previewBlock', () => {
	it('shows where the drone starts and what one block does', () => {
		const p = previewBlock(program, m11, 'f')!;
		expect(p.before).toMatchObject({ x: 2, y: 4, flying: true });
		expect(p.frames.map((f) => [f.pose.x, f.pose.y])).toEqual([
			[2, 3],
			[2, 2],
			[2, 1]
		]);
		expect(p.fails).toBe(false);
	});

	it('shows a turn without moving', () => {
		const p = previewBlock(program, m11, 'r')!;
		expect(p.before).toMatchObject({ x: 2, y: 1, heading: 0 });
		expect(p.frames).toHaveLength(1);
		expect(p.frames[0].pose).toMatchObject({ x: 2, y: 1, heading: 90 });
	});

	it('shows the first round of a block inside a loop', () => {
		const loop: BlockNode[] = [
			{ id: 't', type: 'takeoff' },
			{ id: 'r', type: 'repeat', n: 3, children: [{ id: 'f', type: 'forward', n: 1 }] }
		];
		const p = previewBlock(loop, m11, 'f')!;
		expect(p.before).toMatchObject({ x: 2, y: 4 });
		expect(p.frames.map((f) => f.pose.y)).toEqual([3]);
	});

	it('marks a block that would crash', () => {
		const p = previewBlock([{ id: 'f', type: 'forward', n: 1 }], m11, 'f')!;
		expect(p.fails).toBe(true);
		expect(p.frames).toEqual([]);
	});

	it('is null for a block that is never reached', () => {
		const crash: BlockNode[] = [
			{ id: 'f', type: 'forward', n: 1 },
			{ id: 't', type: 'takeoff' }
		];
		expect(previewBlock(crash, m11, 't')).toBeNull();
	});
});
