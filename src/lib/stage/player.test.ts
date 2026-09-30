import { describe, expect, it, vi } from 'vitest';
import type { Frame } from './timeline';
import { Player } from './player.svelte';

describe('Player', () => {
	it('uses instant springs when motion is reduced', () => {
		expect(new Player(true).x.stiffness).toBe(1);
		expect(new Player(false).x.stiffness).toBeLessThan(1);
	});

	it('remembers where a parcel was dropped until the stage is reset', async () => {
		vi.useFakeTimers();
		const player = new Player(true);
		const start = { x: 0, y: 0, heading: 0, flying: true, carrying: true };
		player.reset(start, ['D.']);
		const drop: Frame = { kind: 'drop', line: 3, ms: 10, pose: { ...start, carrying: false } };
		const done = player.play([drop]);
		await vi.runAllTimersAsync();
		expect(await done).toBe(true);
		expect(player.delivered).toEqual(['0,0']);
		player.reset(start, ['D.']);
		expect(player.delivered).toEqual([]);
		vi.useRealTimers();
	});
});
