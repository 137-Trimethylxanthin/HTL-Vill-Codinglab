import type { Mission } from './schema';

export type Stars = 0 | 1 | 2 | 3;

export function calcStars(
	input: { reached: boolean; blockCount: number; runs: number },
	rules: Mission['stars']
): Stars {
	if (!input.reached) return 0;
	if (input.blockCount <= rules.optimalBlocks && input.runs <= rules.maxRunsFor3) return 3;
	if (input.blockCount <= rules.optimalBlocks + 2) return 2;
	return 1;
}
