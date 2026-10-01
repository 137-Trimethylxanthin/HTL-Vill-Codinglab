import { describe, expect, it } from 'vitest';
import type { BlockNode } from '$lib/blocks/types';
import { compact, expand } from './compact';

const program: BlockNode[] = [
	{ id: 'a', type: 'takeoff' },
	{ id: 'r', type: 'repeat', n: 4, children: [{ id: 'f', type: 'forward', n: 2 }] },
	{ id: 'i', type: 'if_obstacle', children: [], else: [{ id: 't', type: 'turn_right' }] }
];

describe('compact', () => {
	it('round-trips a program without ids', () => {
		expect(compact(program)).toEqual([
			['takeoff'],
			['repeat', 4, [['forward', 2]]],
			['if_obstacle', null, [], [['turn_right']]]
		]);
		const back = expand(JSON.parse(JSON.stringify(compact(program))));
		expect(compact(back)).toEqual(compact(program));
	});

	it('drops anything malformed from the network', () => {
		expect(expand('nope')).toEqual([]);
		expect(expand([['rm -rf'], ['land'], 5, ['forward', 'x']])).toEqual([
			{ id: '0.1', type: 'land' },
			{ id: '0.3', type: 'forward' }
		]);
	});
});
