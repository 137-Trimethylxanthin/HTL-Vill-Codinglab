import { BLOCK_TYPES, type BlockNode, type BlockType } from '$lib/blocks/types';

/** A block as sent to the master: [type, n?, body?, else?] — small enough for the 8 KB status. */
export type Compact = [BlockType, (number | null)?, Compact[]?, Compact[]?];

export function compact(program: BlockNode[]): Compact[] {
	return program.map((n) => {
		const c: Compact = [n.type];
		if (n.n !== undefined || n.children || n.else) c.push(n.n ?? null);
		if (n.children || n.else) c.push(compact(n.children ?? []));
		if (n.else) c.push(compact(n.else));
		return c;
	});
}

/** Back to blocks for the mini-view; anything malformed (it came over the network) is dropped. */
export function expand(value: unknown, depth = 0): BlockNode[] {
	if (!Array.isArray(value) || depth > 3) return [];
	return value.flatMap((item, i): BlockNode[] => {
		if (!Array.isArray(item) || !BLOCK_TYPES.includes(item[0])) return [];
		const node: BlockNode = { id: `${depth}.${i}`, type: item[0] };
		if (typeof item[1] === 'number') node.n = item[1];
		if (item[2] !== undefined) node.children = expand(item[2], depth + 1);
		if (item[3] !== undefined) node.else = expand(item[3], depth + 1);
		return [node];
	});
}
