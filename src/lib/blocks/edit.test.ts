import { describe, expect, it } from 'vitest';
import { appendBlock, createBlock, findBlock, MAX_BLOCKS, removeBlock, setParam } from './edit';
import type { BlockNode } from './types';

describe('createBlock', () => {
	it('gives parameter blocks their default and containers an empty body', () => {
		expect(createBlock('forward')).toMatchObject({ type: 'forward', n: 1 });
		expect(createBlock('repeat')).toMatchObject({ type: 'repeat', n: 2, children: [] });
		expect(createBlock('land').n).toBeUndefined();
	});

	it('creates unique ids', () => {
		expect(createBlock('land').id).not.toBe(createBlock('land').id);
	});
});

describe('appendBlock', () => {
	it('appends without mutating', () => {
		const before: BlockNode[] = [];
		const after = appendBlock(before, 'takeoff');
		expect(before).toHaveLength(0);
		expect(after.map((n) => n.type)).toEqual(['takeoff']);
	});

	it(`refuses to grow past ${MAX_BLOCKS} blocks`, () => {
		let program: BlockNode[] = [];
		for (let i = 0; i < MAX_BLOCKS + 5; i++) program = appendBlock(program, 'forward');
		expect(program).toHaveLength(MAX_BLOCKS);
	});
});

describe('removeBlock', () => {
	it('removes top-level and nested blocks', () => {
		const program: BlockNode[] = [
			{ id: 'a', type: 'takeoff' },
			{ id: 'r', type: 'repeat', n: 2, children: [{ id: 'f', type: 'forward', n: 1 }] }
		];
		expect(removeBlock(program, 'a').map((n) => n.id)).toEqual(['r']);
		expect(removeBlock(program, 'f')[1].children).toEqual([]);
	});
});

describe('findBlock', () => {
	it('finds nested blocks and returns undefined for unknown ids', () => {
		const program: BlockNode[] = [
			{ id: 'r', type: 'repeat', n: 2, children: [{ id: 'f', type: 'forward', n: 3 }] }
		];
		expect(findBlock(program, 'f')?.n).toBe(3);
		expect(findBlock(program, 'nope')).toBeUndefined();
	});
});

describe('setParam', () => {
	const program: BlockNode[] = [{ id: 'f', type: 'forward', n: 1 }];

	it('sets a value inside the range', () => {
		expect(setParam(program, 'f', 5)[0].n).toBe(5);
	});

	it('clamps to the registry range', () => {
		expect(setParam(program, 'f', 0)[0].n).toBe(1);
		expect(setParam(program, 'f', 99)[0].n).toBe(9);
	});

	it('ignores blocks without a parameter', () => {
		const p: BlockNode[] = [{ id: 'l', type: 'land' }];
		expect(setParam(p, 'l', 3)[0].n).toBeUndefined();
	});
});
