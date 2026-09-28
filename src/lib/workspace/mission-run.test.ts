import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '$lib/i18n/de';
import { SHOWCASE } from '$lib/missions';
import type { RunResult } from '$lib/sim/result';
import { World } from '$lib/sim/world';
import { MissionRun } from './mission-run.svelte';

const m11 = SHOWCASE[0];

/** Fake runner that answers like the real one, using the world directly. */
function solvedRunner() {
	return {
		run: async (): Promise<RunResult> => {
			const w = new World(m11);
			w.call('takeoff', 3);
			w.call('forward', 4, 4);
			w.call('land', 5);
			return { events: w.events, final: w.snapshot(), stop: null, pyError: null };
		}
	};
}

function build(ctrl: MissionRun) {
	ctrl.add('takeoff');
	ctrl.add('forward');
	ctrl.add('land');
	const forward = ctrl.program[1];
	ctrl.step(forward.id, 3);
}

afterEach(() => {
	vi.useRealTimers();
});

describe('MissionRun', () => {
	it('reaches success with stars after the animation', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const running = ctrl.run();
		expect(ctrl.status).toBe('running');
		await vi.advanceTimersByTimeAsync(10000);
		await running;
		expect(ctrl.status).toBe('success');
		expect(ctrl.stars).toBe(3);
	});

	it('never stays locked when the runner fails', async () => {
		const ctrl = new MissionRun(m11, { run: () => Promise.reject(new Error('worker dead')) });
		build(ctrl);
		await ctrl.run();
		expect(ctrl.status).toBe('fail');
		expect(ctrl.message).toBe(t.app.loadFailed);
	});

	it('goes back to idle when the animation is cancelled', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const running = ctrl.run();
		await vi.advanceTimersByTimeAsync(600);
		ctrl.resetStage();
		await vi.advanceTimersByTimeAsync(10000);
		await running;
		expect(ctrl.status).toBe('idle');
	});

	it('ignores edits while running', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const running = ctrl.run();
		ctrl.add('land');
		expect(ctrl.program).toHaveLength(3);
		await vi.advanceTimersByTimeAsync(10000);
		await running;
	});
});
