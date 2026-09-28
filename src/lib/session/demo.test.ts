import { describe, expect, it } from 'vitest';
import { SHOWCASE } from '$lib/missions';
import { demoEvents } from './demo';

const byId = (id: string) => SHOWCASE.find((m) => m.id === id)!;

describe('demoEvents', () => {
	it('replays a looped solution without Python', () => {
		const events = demoEvents(byId('2.1'));
		expect(events[0].kind).toBe('takeoff');
		expect(events.at(-1)?.kind).toBe('land');
		expect(events.filter((e) => e.kind === 'move')).toHaveLength(8);
	});

	it('refuses missions with sensor blocks', () => {
		expect(() => demoEvents(byId('3.1'))).toThrow();
	});
});
