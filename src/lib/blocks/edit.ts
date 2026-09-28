import { countBlocks } from './generator';
import { BLOCKS } from './registry';
import type { BlockNode, BlockType } from './types';

export const MAX_BLOCKS = 30;

export function createBlock(type: BlockType): BlockNode {
	const spec = BLOCKS[type];
	const node: BlockNode = { id: crypto.randomUUID(), type };
	if (spec.param) node.n = spec.param.default;
	if (spec.container) node.children = [];
	return node;
}

export function appendBlock(program: BlockNode[], type: BlockType): BlockNode[] {
	if (countBlocks(program) >= MAX_BLOCKS) return program;
	return [...program, createBlock(type)];
}

export function removeBlock(program: BlockNode[], id: string): BlockNode[] {
	return program
		.filter((node) => node.id !== id)
		.map((node) => (node.children ? { ...node, children: removeBlock(node.children, id) } : node));
}

export function findBlock(program: BlockNode[], id: string): BlockNode | undefined {
	for (const node of program) {
		if (node.id === id) return node;
		const found = findBlock(node.children ?? [], id);
		if (found) return found;
	}
	return undefined;
}

export function setParam(program: BlockNode[], id: string, n: number): BlockNode[] {
	return program.map((node) => {
		if (node.id === id) {
			const range = BLOCKS[node.type].param;
			if (!range) return node;
			return { ...node, n: Math.min(range.max, Math.max(range.min, Math.round(n))) };
		}
		return node.children ? { ...node, children: setParam(node.children, id, n) } : node;
	});
}
