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

	const emit = (nodes: BlockNode[], depth: number) => {
		const indent = '    '.repeat(depth);
		for (const node of nodes) {
			const spec = BLOCKS[node.type];
			const n = node.n ?? spec.param?.default;
			if (spec.container) {
				const loopVar = LOOP_VARS[depth] ?? `i${depth}`;
				lines.push(`${indent}for ${loopVar} in range(${n}):`);
			} else {
				lines.push(`${indent}${spec.call}(${spec.param ? n : ''})`);
			}
			lineOf[node.id] = lines.length;
			blockAt[lines.length] = node.id;
			if (spec.container) {
				const body = node.children ?? [];
				if (body.length === 0) lines.push(`${indent}    pass`);
				else emit(body, depth + 1);
			}
		}
	};

	emit(program, 0);
	return { code: lines.join('\n') + '\n', lineOf, blockAt };
}

export function countBlocks(program: BlockNode[]): number {
	return program.reduce((sum, node) => sum + 1 + countBlocks(node.children ?? []), 0);
}
