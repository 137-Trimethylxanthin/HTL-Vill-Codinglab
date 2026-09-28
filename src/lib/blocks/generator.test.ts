import { describe, expect, it } from 'vitest';
import { countBlocks, PY_HEADER, toPython } from './generator';
import type { BlockNode } from './types';

const b = (id: string, type: BlockNode['type'], extra: Partial<BlockNode> = {}): BlockNode => ({
	id,
	type,
	...extra
});

describe('toPython', () => {
	it('emits only the header for an empty program', () => {
		expect(toPython([]).code).toBe(`${PY_HEADER}\n\n`);
	});

	it('emits one call per block with parameters', () => {
		const out = toPython([b('a', 'takeoff'), b('b', 'forward', { n: 4 }), b('c', 'land')]);
		expect(out.code).toBe(`${PY_HEADER}\n\ntakeoff()\nforward(4)\nland()\n`);
		expect(out.lineOf).toEqual({ a: 3, b: 4, c: 5 });
		expect(out.blockAt).toEqual({ 3: 'a', 4: 'b', 5: 'c' });
	});

	it('uses the registry default when n is missing', () => {
		expect(toPython([b('a', 'forward')]).code).toContain('forward(1)');
	});

	it('emits nested loops with indentation and loop variables', () => {
		const program = [
			b('r', 'repeat', {
				n: 4,
				children: [
					b('f', 'forward', { n: 2 }),
					b('r2', 'repeat', { n: 2, children: [b('t', 'turn_left')] })
				]
			})
		];
		const out = toPython(program);
		expect(out.code).toBe(
			`${PY_HEADER}\n\nfor i in range(4):\n    forward(2)\n    for j in range(2):\n        turn_left()\n`
		);
		expect(out.lineOf).toEqual({ r: 3, f: 4, r2: 5, t: 6 });
	});

	it('emits pass for an empty loop body', () => {
		expect(toPython([b('r', 'repeat', { n: 3, children: [] })]).code).toBe(
			`${PY_HEADER}\n\nfor i in range(3):\n    pass\n`
		);
	});
});

describe('countBlocks', () => {
	it('counts containers and their children', () => {
		expect(
			countBlocks([
				b('a', 'takeoff'),
				b('r', 'repeat', { children: [b('f', 'forward'), b('t', 'turn_left')] })
			])
		).toBe(4);
	});
});
