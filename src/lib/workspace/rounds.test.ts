import { describe, expect, it } from 'vitest';
import type { BlockNode } from '$lib/blocks/types';
import { loopSpans, nextRounds, type LoopSpan } from './rounds';

const spans: LoopSpan[] = [
	{ id: 'outer', first: 4, last: 7, times: 2 },
	{ id: 'inner', first: 5, last: 6, times: 2 }
];

/** Feeds (line, call) frames through nextRounds and returns the rounds after each one. */
function play(frames: [number, number][], loops = spans) {
	let rounds: Record<string, number> = {};
	let prev: { line: number; call?: number } | null = null;
	return frames.map(([line, call]) => {
		rounds = nextRounds(rounds, loops, prev, { line, call });
		prev = { line, call };
		return rounds;
	});
}

describe('nextRounds', () => {
	it('counts rounds of nested loops and restarts the inner one', () => {
		// takeoff, outer: [inner x2: move, turn], photo — twice.
		const seen = play([
			[3, 1],
			[5, 2],
			[6, 3],
			[5, 4],
			[6, 5],
			[7, 6],
			[5, 7],
			[6, 8],
			[5, 9],
			[6, 10],
			[7, 11],
			[8, 12]
		]);
		expect(seen[0]).toEqual({});
		expect(seen[1]).toEqual({ outer: 1, inner: 1 });
		expect(seen[3]).toEqual({ outer: 1, inner: 2 });
		expect(seen[5]).toEqual({ outer: 1 });
		expect(seen[6]).toEqual({ outer: 2, inner: 1 });
		expect(seen[8]).toEqual({ outer: 2, inner: 2 });
		expect(seen[11]).toEqual({});
	});

	it('counts a loop around a single command by its calls, not by its steps', () => {
		const loop: LoopSpan[] = [{ id: 'r', first: 4, last: 4, times: 2 }];
		// forward(2) inside "repeat 2": two calls with two move frames each.
		const seen = play(
			[
				[4, 1],
				[4, 1],
				[4, 2],
				[4, 2]
			],
			loop
		);
		expect(seen.map((r) => r.r)).toEqual([1, 1, 2, 2]);
	});

	it('hands a round on to the outer loop when the inner one is done', () => {
		// repeat 2 { repeat 3 { turn } }: both loops span the same single line.
		const nested: LoopSpan[] = [
			{ id: 'o', first: 5, last: 5, times: 2 },
			{ id: 'i', first: 5, last: 5, times: 3 }
		];
		const seen = play(
			[1, 2, 3, 4, 5, 6].map((call) => [5, call]),
			nested
		);
		expect(seen.map((r) => `${r.o}/${r.i}`)).toEqual(['1/1', '1/2', '1/3', '2/1', '2/2', '2/3']);
	});
});

describe('loopSpans', () => {
	it('spans each repeat from its first to its last body line', () => {
		const program: BlockNode[] = [
			{ id: 't', type: 'takeoff' },
			{
				id: 'outer',
				type: 'repeat',
				n: 2,
				children: [
					{ id: 'inner', type: 'repeat', n: 2, children: [{ id: 'f', type: 'forward', n: 1 }] },
					{ id: 'p', type: 'photo' }
				]
			},
			{ id: 'e', type: 'repeat', n: 3, children: [] }
		];
		const lineOf = { t: 3, outer: 4, inner: 5, f: 6, p: 7, e: 8 };
		expect(loopSpans(program, lineOf)).toEqual([
			{ id: 'outer', first: 5, last: 7, times: 2 },
			{ id: 'inner', first: 6, last: 6, times: 2 }
		]);
	});
});
