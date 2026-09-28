import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IdleTimer } from './idle.svelte';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('IdleTimer', () => {
	it('warns after the idle time and counts down', () => {
		const timeout = vi.fn();
		const idle = new IdleTimer(timeout, 90_000, 10_000);
		idle.start();
		vi.advanceTimersByTime(89_999);
		expect(idle.warning).toBe(false);
		vi.advanceTimersByTime(1);
		expect(idle.warning).toBe(true);
		expect(idle.remaining).toBe(10);
		vi.advanceTimersByTime(3000);
		expect(idle.remaining).toBe(7);
		expect(timeout).not.toHaveBeenCalled();
	});

	it('times out after the countdown, once', () => {
		const timeout = vi.fn();
		const idle = new IdleTimer(timeout, 90_000, 10_000);
		idle.start();
		vi.advanceTimersByTime(100_000);
		expect(timeout).toHaveBeenCalledTimes(1);
		expect(idle.warning).toBe(false);
		vi.advanceTimersByTime(500_000);
		expect(timeout).toHaveBeenCalledTimes(1);
	});

	it('activity cancels the warning and restarts the idle time', () => {
		const timeout = vi.fn();
		const idle = new IdleTimer(timeout, 90_000, 10_000);
		idle.start();
		vi.advanceTimersByTime(95_000);
		idle.activity();
		expect(idle.warning).toBe(false);
		vi.advanceTimersByTime(89_000);
		expect(idle.warning).toBe(false);
		expect(timeout).not.toHaveBeenCalled();
	});

	it('does nothing when stopped or not started', () => {
		const timeout = vi.fn();
		const idle = new IdleTimer(timeout, 1000, 1000);
		idle.activity();
		vi.advanceTimersByTime(5000);
		idle.start();
		idle.stop();
		vi.advanceTimersByTime(5000);
		expect(timeout).not.toHaveBeenCalled();
	});
	it('uses a new idle time from the next restart', () => {
		const timeout = vi.fn();
		const idle = new IdleTimer(timeout, 90_000, 10_000);
		idle.start();
		idle.setIdleMs(30_000);
		vi.advanceTimersByTime(30_000);
		expect(idle.warning).toBe(true);
	});
});
