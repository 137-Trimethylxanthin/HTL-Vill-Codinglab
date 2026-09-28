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
});
