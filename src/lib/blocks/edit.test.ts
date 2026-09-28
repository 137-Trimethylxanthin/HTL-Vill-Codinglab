import { describe, expect, it } from 'vitest';
import {
	appendBlock,
	canInsert,
	createBlock,
	findBlock,
	insertBlock,
	MAX_BLOCKS,
	moveBlock,
	removeBlock,
	setParam
} from './edit';
import type { BlockNode } from './types';

const tree = (): BlockNode[] => [
	{ id: 'a', type: 'takeoff' },
	{ id: 'r', type: 'repeat', n: 2, children: [{ id: 'f', type: 'forward', n: 1 }] },
	{ id: 'i', type: 'if_obstacle', children: [], else: [{ id: 'e', type: 'forward', n: 2 }] }
];
const leaf = (id = 'x'): BlockNode => ({ id, type: 'land' });
const ids = (nodes: BlockNode[] | undefined) => (nodes ?? []).map((n) => n.id);

describe('createBlock', () => {
	it('gives parameter blocks their default and containers empty bodies', () => {
		expect(createBlock('forward')).toMatchObject({ type: 'forward', n: 1 });
		expect(createBlock('repeat')).toMatchObject({ type: 'repeat', n: 2, children: [] });
		expect(createBlock('if_obstacle')).toMatchObject({ children: [], else: [] });
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

	it(`refuses to grow past ${MAX_BLOCKS} blocks and returns the same array`, () => {
		let program: BlockNode[] = [];
		for (let i = 0; i < MAX_BLOCKS; i++) program = appendBlock(program, 'forward');
		expect(appendBlock(program, 'forward')).toBe(program);
	});
});

describe('find / remove / setParam', () => {
	it('find nested blocks in bodies and else branches', () => {
		expect(findBlock(tree(), 'f')?.n).toBe(1);
		expect(findBlock(tree(), 'e')?.n).toBe(2);
		expect(findBlock(tree(), 'nope')).toBeUndefined();
	});

	it('removes blocks everywhere', () => {
		expect(ids(removeBlock(tree(), 'a'))).toEqual(['r', 'i']);
		expect(removeBlock(tree(), 'f')[1].children).toEqual([]);
		expect(removeBlock(tree(), 'e')[2].else).toEqual([]);
	});

	it('clamps parameters, also inside else', () => {
		expect(setParam(tree(), 'e', 99)[2].else?.[0].n).toBe(9);
		expect(setParam(tree(), 'f', 0)[1].children?.[0].n).toBe(1);
		expect(setParam(tree(), 'a', 3)[0].n).toBeUndefined();
	});
});

describe('insertBlock', () => {
	it('inserts at the top level', () => {
		expect(ids(insertBlock(tree(), leaf(), { parent: null, slot: 'body', index: 1 }))).toEqual([
			'a',
			'x',
			'r',
			'i'
		]);
	});

	it('inserts into a loop body and an else branch', () => {
		const inBody = insertBlock(tree(), leaf(), { parent: 'r', slot: 'body', index: 0 });
		expect(ids(inBody[1].children)).toEqual(['x', 'f']);
		const inElse = insertBlock(tree(), leaf(), { parent: 'i', slot: 'else', index: 5 });
		expect(ids(inElse[2].else)).toEqual(['e', 'x']);
	});

	it('clamps the index', () => {
		expect(ids(insertBlock(tree(), leaf(), { parent: null, slot: 'body', index: 99 })).at(-1)).toBe(
			'x'
		);
	});

	it('refuses an else slot on a loop and unknown parents', () => {
		const program = tree();
		expect(insertBlock(program, leaf(), { parent: 'r', slot: 'else', index: 0 })).toBe(program);
		expect(insertBlock(program, leaf(), { parent: 'nope', slot: 'body', index: 0 })).toBe(program);
		expect(insertBlock(program, leaf(), { parent: 'a', slot: 'body', index: 0 })).toBe(program);
	});

	it('allows two nesting levels but not three', () => {
		const nested: BlockNode[] = [
			{
				id: 'r',
				type: 'repeat',
				n: 2,
				children: [{ id: 'r2', type: 'repeat', n: 2, children: [] }]
			}
		];
		expect(canInsert(nested, leaf(), { parent: 'r2', slot: 'body', index: 0 })).toBe(true);
		expect(canInsert(nested, createBlock('repeat'), { parent: 'r2', slot: 'body', index: 0 })).toBe(
			false
		);
		expect(
			canInsert(tree(), createBlock('if_obstacle'), { parent: 'r', slot: 'body', index: 0 })
		).toBe(true);
		const deepIf: BlockNode = {
			id: 'd',
			type: 'repeat',
			n: 2,
			children: [{ id: 'd2', type: 'if_obstacle', children: [], else: [] }]
		};
		expect(canInsert(tree(), deepIf, { parent: 'r', slot: 'body', index: 0 })).toBe(false);
	});

	it(`refuses to exceed ${MAX_BLOCKS} blocks`, () => {
		let program: BlockNode[] = [];
		for (let i = 0; i < MAX_BLOCKS; i++) program = appendBlock(program, 'forward');
		expect(insertBlock(program, leaf(), { parent: null, slot: 'body', index: 0 })).toBe(program);
	});
});

describe('moveBlock', () => {
	it('reorders within a list (index counts without the moved block)', () => {
		expect(ids(moveBlock(tree(), 'a', { parent: null, slot: 'body', index: 2 }))).toEqual([
			'r',
			'i',
			'a'
		]);
	});

	it('moves a block out of a body to the top level', () => {
		const moved = moveBlock(tree(), 'f', { parent: null, slot: 'body', index: 0 });
		expect(ids(moved)).toEqual(['f', 'a', 'r', 'i']);
		expect(moved[2].children).toEqual([]);
	});

	it('moves a block from an else branch into a loop body', () => {
		const moved = moveBlock(tree(), 'e', { parent: 'r', slot: 'body', index: 1 });
		expect(ids(moved[1].children)).toEqual(['f', 'e']);
		expect(moved[2].else).toEqual([]);
	});

	it('refuses to move a container into itself', () => {
		const program = tree();
		expect(moveBlock(program, 'r', { parent: 'r', slot: 'body', index: 0 })).toBe(program);
	});

	it('refuses unknown blocks', () => {
		const program = tree();
		expect(moveBlock(program, 'nope', { parent: null, slot: 'body', index: 0 })).toBe(program);
	});
});
