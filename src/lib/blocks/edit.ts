import { countBlocks } from './generator';
import { BLOCKS } from './registry';
import type { BlockNode, BlockType } from './types';

export const MAX_BLOCKS = 30;
/** Deepest allowed block depth (top level = 0), e.g. a block inside an `if` inside a `repeat`. */
export const MAX_DEPTH = 2;

export type Slot = 'body' | 'else';

export interface DropTarget {
	/** Container block id, or null for the top level. */
	parent: string | null;
	slot: Slot;
	/** Position in the target list, counted without the block being moved. */
	index: number;
}

export function createBlock(type: BlockType): BlockNode {
	const spec = BLOCKS[type];
	const node: BlockNode = { id: crypto.randomUUID(), type };
	if (spec.param) node.n = spec.param.default;
	if (spec.container) node.children = [];
	if (spec.hasElse) node.else = [];
	return node;
}

export function appendBlock(program: BlockNode[], type: BlockType): BlockNode[] {
	if (countBlocks(program) >= MAX_BLOCKS) return program;
	return [...program, createBlock(type)];
}

function withLists(node: BlockNode, fn: (list: BlockNode[]) => BlockNode[]): BlockNode {
	if (!node.children && !node.else) return node;
	const next = { ...node };
	if (node.children) next.children = fn(node.children);
	if (node.else) next.else = fn(node.else);
	return next;
}

export function findBlock(program: BlockNode[], id: string): BlockNode | undefined {
	for (const node of program) {
		if (node.id === id) return node;
		const found = findBlock(node.children ?? [], id) ?? findBlock(node.else ?? [], id);
		if (found) return found;
	}
	return undefined;
}

/** Every block type used in the program, nested ones included. */
export function blockTypes(program: BlockNode[]): BlockType[] {
	return program.flatMap((node) => [
		node.type,
		...blockTypes(node.children ?? []),
		...blockTypes(node.else ?? [])
	]);
}

export function removeBlock(program: BlockNode[], id: string): BlockNode[] {
	return program
		.filter((node) => node.id !== id)
		.map((node) => withLists(node, (list) => removeBlock(list, id)));
}

export function setParam(program: BlockNode[], id: string, n: number): BlockNode[] {
	return program.map((node) => {
		if (node.id === id) {
			const range = BLOCKS[node.type].param;
			if (!range) return node;
			return { ...node, n: Math.min(range.max, Math.max(range.min, Math.round(n))) };
		}
		return withLists(node, (list) => setParam(list, id, n));
	});
}

function depthOf(program: BlockNode[], id: string, depth = 0): number | null {
	for (const node of program) {
		if (node.id === id) return depth;
		for (const list of [node.children, node.else]) {
			if (!list) continue;
			const found = depthOf(list, id, depth + 1);
			if (found !== null) return found;
		}
	}
	return null;
}

/** How many levels a block needs below itself (leaf 0, container ≥ 1). */
function height(node: BlockNode): number {
	if (!BLOCKS[node.type].container) return 0;
	return 1 + Math.max(0, ...[...(node.children ?? []), ...(node.else ?? [])].map(height));
}

export function canInsert(program: BlockNode[], node: BlockNode, target: DropTarget): boolean {
	let depth = 0;
	if (target.parent === null) {
		if (target.slot !== 'body') return false;
	} else {
		const parent = findBlock(program, target.parent);
		if (!parent) return false;
		const spec = BLOCKS[parent.type];
		if (!spec.container) return false;
		if (target.slot === 'else' && !spec.hasElse) return false;
		const parentDepth = depthOf(program, target.parent);
		if (parentDepth === null) return false;
		depth = parentDepth + 1;
	}
	return depth + height(node) <= MAX_DEPTH;
}

function insertAt(list: BlockNode[], node: BlockNode, index: number): BlockNode[] {
	const i = Math.min(Math.max(0, index), list.length);
	return [...list.slice(0, i), node, ...list.slice(i)];
}

function placeInto(program: BlockNode[], node: BlockNode, target: DropTarget): BlockNode[] {
	if (target.parent === null) return insertAt(program, node, target.index);
	return program.map((n) => {
		if (n.id === target.parent) {
			return target.slot === 'else'
				? { ...n, else: insertAt(n.else ?? [], node, target.index) }
				: { ...n, children: insertAt(n.children ?? [], node, target.index) };
		}
		return withLists(n, (list) => placeInto(list, node, target));
	});
}

/** Inserts a new block. Returns the same array when the insert is not allowed. */
export function insertBlock(
	program: BlockNode[],
	node: BlockNode,
	target: DropTarget
): BlockNode[] {
	if (countBlocks(program) + countBlocks([node]) > MAX_BLOCKS) return program;
	if (!canInsert(program, node, target)) return program;
	return placeInto(program, node, target);
}

/** Moves an existing block. Returns the same array when the move is not allowed. */
export function moveBlock(program: BlockNode[], id: string, target: DropTarget): BlockNode[] {
	const node = findBlock(program, id);
	if (!node) return program;
	const rest = removeBlock(program, id);
	if (!canInsert(rest, node, target)) return program;
	return placeInto(rest, node, target);
}
