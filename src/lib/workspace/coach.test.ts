import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoachState } from './coach.svelte';

const HINTS = ['eins', 'zwei', 'drei'];

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('CoachState', () => {
	it('shows the first hint after 20 s without progress', () => {
		const coach = new CoachState(HINTS);
		vi.advanceTimersByTime(19999);
		expect(coach.hint).toBeNull();
		vi.advanceTimersByTime(1);
		expect(coach.hint).toBe('eins');
	});

	it('gets more concrete each time and stays on the last hint', () => {
		const coach = new CoachState(HINTS);
		vi.advanceTimersByTime(20000 * 4);
		expect(coach.hint).toBe('drei');
	});

	it('shows no idle hint while paused (drone flying)', () => {
		const coach = new CoachState(HINTS);
		vi.advanceTimersByTime(15000);
		coach.pause();
		vi.advanceTimersByTime(60000);
		expect(coach.hint).toBeNull();
		coach.activity();
		vi.advanceTimersByTime(20000);
		expect(coach.hint).toBe('eins');
	});

	it('restarts the idle timer on activity', () => {
		const coach = new CoachState(HINTS);
		vi.advanceTimersByTime(15000);
		coach.activity();
		vi.advanceTimersByTime(15000);
		expect(coach.hint).toBeNull();
	});

	it('shows a hint after two failed runs', () => {
		const coach = new CoachState(HINTS);
		coach.failed();
		expect(coach.hint).toBeNull();
		coach.failed();
		expect(coach.hint).toBe('eins');
	});

	it('shows the next hint on request and hides on dismiss', () => {
		const coach = new CoachState(HINTS);
		coach.request();
		expect(coach.hint).toBe('eins');
		coach.dismiss();
		expect(coach.hint).toBeNull();
	});

	it('goes quiet after success', () => {
		const coach = new CoachState(HINTS);
		coach.succeeded();
		coach.failed();
		coach.failed();
		vi.advanceTimersByTime(60000);
		expect(coach.hint).toBeNull();
	});
});
