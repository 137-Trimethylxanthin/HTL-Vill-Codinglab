import { describe, expect, it } from 'vitest';
import { countBlocks, numberLines, PY_HEADER, toPython } from './generator';
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

	it('emits if/else with the sensor', () => {
		const program = [
			b('r', 'repeat', {
				n: 9,
				children: [
					b('i', 'if_obstacle', {
						children: [b('t', 'turn_right')],
						else: [b('f', 'forward', { n: 1 })]
					})
				]
			})
		];
		const out = toPython(program);
		expect(out.code).toBe(
			`${PY_HEADER}\n\nfor i in range(9):\n    if obstacle_ahead():\n        turn_right()\n    else:\n        forward(1)\n`
		);
		expect(out.lineOf).toEqual({ r: 3, i: 4, t: 5, f: 7 });
	});

	it('omits an empty else and fills an empty if with pass', () => {
		expect(toPython([b('i', 'if_obstacle', { children: [], else: [] })]).code).toBe(
			`${PY_HEADER}\n\nif obstacle_ahead():\n    pass\n`
		);
	});
});

describe('countBlocks', () => {
	it('counts containers, bodies and else branches', () => {
		expect(
			countBlocks([
				b('a', 'takeoff'),
				b('r', 'repeat', { children: [b('f', 'forward'), b('t', 'turn_left')] }),
				b('i', 'if_obstacle', { children: [b('x', 'land')], else: [b('y', 'land')] })
			])
		).toBe(7);
	});
});

describe('numberLines', () => {
	it('maps Python lines to blocks that carry a number', () => {
		const program = [
			b('a', 'takeoff'),
			b('f', 'forward', { n: 2 }),
			b('r', 'repeat', { n: 3, children: [b('t', 'turn_left'), b('g', 'forward', { n: 1 })] })
		];
		expect(numberLines(program, toPython(program))).toEqual({ 4: 'f', 5: 'r', 7: 'g' });
	});
});
