import type { BlockNode } from '$lib/blocks/types';

/** What a block does, without its id: two "Vorwärts 2" blocks are the same block. */
const signature = (nodes: BlockNode[]): string =>
	JSON.stringify(nodes, (key, value) => (key === 'id' ? undefined : value));

/**
 * "Blöcke zum Ordnen": the solution's top-level blocks in a new order. Bodies stay inside
 * their containers. Never the solution order itself, unless no other order exists.
 */
export function shuffleBlocks(
	solution: BlockNode[],
	random: () => number = Math.random
): BlockNode[] {
	const blocks = structuredClone(solution);
	for (let i = blocks.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[blocks[i], blocks[j]] = [blocks[j], blocks[i]];
	}
	// Shuffled back into place: shift by one, which differs unless all blocks are the same.
	if (signature(blocks) === signature(solution)) blocks.push(blocks.shift() as BlockNode);
	return blocks;
}

/** A repeatable random sequence (mulberry32), so the same press always gives the same order. */
export function seededRandom(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
