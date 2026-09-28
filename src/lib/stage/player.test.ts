import { describe, expect, it } from 'vitest';
import { Player } from './player.svelte';

describe('Player', () => {
	it('uses instant springs when motion is reduced', () => {
		expect(new Player(true).x.stiffness).toBe(1);
		expect(new Player(false).x.stiffness).toBeLessThan(1);
	});
});
