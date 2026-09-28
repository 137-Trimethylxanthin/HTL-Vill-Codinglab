import { beforeAll, describe, expect, it } from 'vitest';
import { loadPyodide } from 'pyodide';
import { countBlocks, toPython } from '$lib/blocks/generator';
import { createExecutor, type Executor } from '$lib/runtime/execute';
import { isGoalReached } from './goal';
import { SHOWCASE } from './index';

let executor: Executor;

beforeAll(async () => {
	executor = createExecutor(await loadPyodide());
});

describe('SHOWCASE', () => {
	it('has the seven missions in order', () => {
		expect(SHOWCASE.map((m) => m.id)).toEqual(['1.1', '1.2', '1.3', '2.1', '2.2', '3.1', '3.2']);
	});

	it('uses fog in 3.1 and editable Python in 3.2', () => {
		expect(SHOWCASE.find((m) => m.id === '3.1')?.fog).toBe(true);
		expect(SHOWCASE.find((m) => m.id === '3.2')?.editablePython).toBe(true);
	});
});

describe.each(SHOWCASE.map((m) => [m.id, m] as const))('mission %s', (_id, mission) => {
	it('is solved by its reference solution', () => {
		const result = executor.run(toPython(mission.solution).code, mission);
		expect(result.stop).toBeNull();
		expect(result.pyError).toBeNull();
		expect(isGoalReached(mission, result)).toBe(true);
	});

	it('has a solution within optimalBlocks', () => {
		expect(countBlocks(mission.solution)).toBeLessThanOrEqual(mission.stars.optimalBlocks);
	});

	it.skipIf(!mission.starter)('is not already solved by its starter program', () => {
		const result = executor.run(toPython(mission.starter ?? []).code, mission);
		expect(isGoalReached(mission, result)).toBe(false);
	});

	it('has short texts', () => {
		for (const text of [mission.goalText, ...mission.hints]) {
			for (const sentence of text.split(/[.!?]\s*/).filter(Boolean)) {
				expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(12);
			}
		}
	});
});
