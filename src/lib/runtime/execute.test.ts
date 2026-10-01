import { beforeAll, describe, expect, it } from 'vitest';
import { loadPyodide } from 'pyodide';
import { SHOWCASE } from '$lib/missions';
import { createExecutor, type Executor } from './execute';

const m11 = SHOWCASE[0];
const HEADER = 'from drone import *\n\n';
let executor: Executor;

beforeAll(async () => {
	executor = createExecutor(await loadPyodide());
});

describe('executor', () => {
	it('runs a program and reports events with Python line numbers', () => {
		const result = executor.run(`${HEADER}takeoff()\nforward(4)\nland()\n`, m11);
		expect(result.stop).toBeNull();
		expect(result.pyError).toBeNull();
		expect(result.events.map((e) => [e.kind, e.line])).toEqual([
			['takeoff', 3],
			['move', 4],
			['move', 4],
			['move', 4],
			['move', 4],
			['land', 5]
		]);
		expect(result.final).toMatchObject({ x: 2, y: 0, flying: false });
	});

	it('stops the program when the drone crashes', () => {
		const result = executor.run(`${HEADER}takeoff()\nforward(9)\nland()\n`, m11);
		expect(result.stop).toEqual({ reason: 'crash', code: 'edge', line: 4 });
		expect(result.events.some((e) => e.kind === 'land')).toBe(false);
	});

	it('cannot be caught by try/except', () => {
		const code = `${HEADER}try:\n    forward(1)\nexcept Exception:\n    pass\nland()\n`;
		const result = executor.run(code, m11);
		expect(result.stop?.code).toBe('notFlying');
		expect(result.events).toHaveLength(0);
	});

	it('stops endless loops through the event limit', () => {
		const result = executor.run(`${HEADER}while True:\n    turn_left()\n`, m11, 50);
		expect(result.stop).toEqual({ reason: 'limit', code: 'tooManySteps', line: 4 });
		expect(result.events).toHaveLength(50);
	});

	it('maps Python exceptions to a friendly error with line number', () => {
		const result = executor.run(`${HEADER}takeoff()\nforward(1/0)\n`, m11);
		expect(result.stop).toBeNull();
		expect(result.pyError).toEqual({
			type: 'ZeroDivisionError',
			line: 4,
			message: 'Durch 0 teilen geht nicht.'
		});
	});

	it('reports syntax errors', () => {
		const result = executor.run(`${HEADER}for i in range(2)\n    takeoff()\n`, m11);
		expect(result.pyError?.type).toBe('SyntaxError');
		expect(result.pyError?.line).toBe(3);
	});

	it('does not leak state between runs', () => {
		executor.run(`${HEADER}takeoff()\nx = 5\n`, m11);
		const second = executor.run(`${HEADER}print(x)\n`, m11);
		expect(second.pyError?.type).toBe('NameError');
		const third = executor.run(`${HEADER}takeoff()\n`, m11);
		expect(third.stop).toBeNull();
	});
	it('lets Python ask the sensor', () => {
		const code = `${HEADER}takeoff()\nif obstacle_ahead():\n    turn_right()\nelse:\n    forward(1)\n`;
		const result = executor.run(code, m11);
		expect(result.events.map((e) => e.kind)).toEqual(['takeoff', 'sense', 'move']);
		expect(result.events[1]).toEqual({ kind: 'sense', line: 4, ahead: false, call: 2 });
	});

	it('stops a sensor loop at the event limit', () => {
		const code = `${HEADER}while True:\n    if obstacle_ahead():\n        turn_right()\n`;
		const result = executor.run(code, m11, 40);
		expect(result.stop?.code).toBe('tooManySteps');
		expect(result.events).toHaveLength(40);
	});
});
