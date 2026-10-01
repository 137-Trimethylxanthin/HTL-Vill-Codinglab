import type { BlockNode } from '$lib/blocks/types';

/** The body lines of one `repeat` block in the generated Python. */
export interface LoopSpan {
	id: string;
	first: number;
	last: number;
	/** How often the loop repeats. */
	times: number;
}

/** All non-empty repeat loops, outer before inner. */
export function loopSpans(program: BlockNode[], lineOf: Record<string, number>): LoopSpan[] {
	const lines = (nodes: BlockNode[]): number[] =>
		nodes.flatMap((n) => [lineOf[n.id], ...lines(n.children ?? []), ...lines(n.else ?? [])]);
	return program.flatMap((node) => {
		const inner = [
			...loopSpans(node.children ?? [], lineOf),
			...loopSpans(node.else ?? [], lineOf)
		];
		if (node.type !== 'repeat' || !node.children?.length) return inner;
		const body = lines(node.children);
		const span = {
			id: node.id,
			first: Math.min(...body),
			last: Math.max(...body),
			times: node.n ?? 2
		};
		return [span, ...inner];
	});
}

type At = { line: number; call?: number };

/**
 * Which round each running loop is in, after the drone moved on to `cur`. A new command that
 * jumps back (or repeats the same line) starts the next round of the innermost loop around
 * both lines; entering a loop from outside starts it at round 1.
 */
export function nextRounds(
	rounds: Record<string, number>,
	spans: LoopSpan[],
	prev: At | null,
	cur: At
): Record<string, number> {
	if (prev && cur.call !== undefined && cur.call === prev.call) return rounds;
	const inside = (s: LoopSpan, line: number) => line >= s.first && line <= s.last;
	const back = prev !== null && cur.line <= prev.line;
	const next: Record<string, number> = {};
	for (const s of spans) {
		if (!inside(s, cur.line)) continue;
		next[s.id] = !prev || !inside(s, prev.line) ? 1 : (rounds[s.id] ?? 1);
	}
	if (!back) return next;
	// Loops around both lines, innermost first (spans list outer loops before inner ones).
	const around = spans.filter((s) => prev && inside(s, prev.line) && inside(s, cur.line)).reverse();
	// The innermost loop that still has rounds left takes the new round; finished inner loops
	// start over (a loop whose body is just another loop jumps back to the same line).
	for (const s of around) {
		if (next[s.id] < s.times) {
			next[s.id]++;
			break;
		}
		next[s.id] = 1;
	}
	return next;
}
