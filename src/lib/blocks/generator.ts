import { BLOCKS } from './registry';
import type { BlockNode } from './types';

export const PY_HEADER = 'from drone import *';

export interface PythonOutput {
	code: string;
	/** Block id → 1-based Python line. */
	lineOf: Record<string, number>;
	/** 1-based Python line → block id. */
	blockAt: Record<number, string>;
}

const LOOP_VARS = ['i', 'j', 'k'];

export function toPython(program: BlockNode[]): PythonOutput {
	const lines = [PY_HEADER, ''];
	const lineOf: Record<string, number> = {};
	const blockAt: Record<number, string> = {};

	const body = (nodes: BlockNode[], depth: number) => {
		if (nodes.length === 0) lines.push(`${'    '.repeat(depth)}pass`);
		else emit(nodes, depth);
	};

	const emit = (nodes: BlockNode[], depth: number) => {
		const indent = '    '.repeat(depth);
		for (const node of nodes) {
			const spec = BLOCKS[node.type];
			const n = node.n ?? spec.param?.default;
			if (node.type === 'repeat') {
				lines.push(`${indent}for ${LOOP_VARS[depth] ?? `i${depth}`} in range(${n}):`);
			} else if (node.type === 'if_obstacle') {
				lines.push(`${indent}if obstacle_ahead():`);
			} else {
				lines.push(`${indent}${spec.call}(${spec.param ? n : ''})`);
			}
			lineOf[node.id] = lines.length;
			blockAt[lines.length] = node.id;
			if (spec.container) {
				body(node.children ?? [], depth + 1);
				if (spec.hasElse && (node.else?.length ?? 0) > 0) {
					lines.push(`${indent}else:`);
					emit(node.else ?? [], depth + 1);
				}
			}
		}
	};

	emit(program, 0);
	return { code: lines.join('\n') + '\n', lineOf, blockAt };
}

export function countBlocks(program: BlockNode[]): number {
	return program.reduce(
		(sum, node) => sum + 1 + countBlocks(node.children ?? []) + countBlocks(node.else ?? []),
		0
	);
}

/** Python line → id of the block whose number appears on that line (for editing numbers in Python). */
export function numberLines(program: BlockNode[], output: PythonOutput): Record<number, string> {
	const result: Record<number, string> = {};
	const visit = (nodes: BlockNode[]) => {
		for (const node of nodes) {
			if (BLOCKS[node.type].param) result[output.lineOf[node.id]] = node.id;
			visit(node.children ?? []);
			visit(node.else ?? []);
		}
	};
	visit(program);
	return result;
}
