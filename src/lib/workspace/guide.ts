import type { BlockNode, BlockType } from '$lib/blocks/types';

export type GuideStep =
	| { kind: 'add'; type: BlockType }
	| { kind: 'step'; id: string; delta: 1 | -1 }
	| { kind: 'start' };

/**
 * The next thing the guide hand shows on the way to `solution` (a flat list of blocks):
 * add the next block, set its number, then press Start. Null as soon as the program goes
 * its own way: then the child is exploring and the hand stays out of it.
 */
export function nextGuideStep(program: BlockNode[], solution: BlockNode[]): GuideStep | null {
	if (solution.some((node) => node.children || node.else)) return null;
	if (program.length > solution.length) return null;
	for (let i = 0; i < solution.length; i++) {
		const want = solution[i];
		const have = program[i];
		if (!have) return { kind: 'add', type: want.type };
		if (have.type !== want.type) return null;
		if (want.n !== undefined && have.n !== undefined && have.n !== want.n) {
			return { kind: 'step', id: have.id, delta: have.n < want.n ? 1 : -1 };
		}
	}
	return { kind: 'start' };
}
