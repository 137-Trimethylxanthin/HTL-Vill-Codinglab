import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_BLOCKS } from '$lib/blocks/edit';
import { t } from '$lib/i18n/de';
import { SHOWCASE } from '$lib/missions';
import type { RunResult } from '$lib/sim/result';
import { World } from '$lib/sim/world';
import { MissionRun } from './mission-run.svelte';

const m11 = SHOWCASE[0];
const m21 = SHOWCASE.find((m) => m.id === '2.1')!;
const m32 = SHOWCASE.find((m) => m.id === '3.2')!;

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
	const forward = ctrl.add('forward')!;
	ctrl.add('land');
	ctrl.step(forward, 3);
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

	it('goes back to idle when stopped', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const running = ctrl.run();
		await vi.advanceTimersByTimeAsync(600);
		ctrl.stop();
		expect(ctrl.status).toBe('idle');
		await vi.advanceTimersByTimeAsync(10000);
		await running;
		expect(ctrl.status).toBe('idle');
		expect(ctrl.player.playing).toBe(false);
	});

	it('refuses edits and drops while running', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const running = ctrl.run();
		expect(ctrl.add('land')).toBeNull();
		expect(
			ctrl.canDrop({ kind: 'palette', type: 'land' }, { parent: null, slot: 'body', index: 0 })
		).toBe(false);
		expect(ctrl.program).toHaveLength(3);
		await vi.advanceTimersByTimeAsync(10000);
		await running;
	});

	it('inserts into a loop body and moves blocks', () => {
		const ctrl = new MissionRun(m21, solvedRunner());
		const loop = ctrl.add('repeat')!;
		const fwd = ctrl.insert('forward', { parent: loop, slot: 'body', index: 0 });
		expect(fwd).not.toBeNull();
		expect(ctrl.python.code).toContain('for i in range(2):\n    forward(1)');
		ctrl.move(fwd!, { parent: null, slot: 'body', index: 0 });
		expect(ctrl.program[0].id).toBe(fwd);
	});

	it('explains why a full program refuses more blocks', () => {
		const ctrl = new MissionRun(m11, solvedRunner());
		for (let i = 0; i < MAX_BLOCKS; i++) ctrl.add('forward');
		expect(ctrl.add('forward')).toBeNull();
		expect(ctrl.notice).toBe(t.workspace.full);
		ctrl.remove(ctrl.program[0].id);
		expect(ctrl.notice).toBeNull();
	});

	it('knows which drops are allowed', () => {
		const ctrl = new MissionRun(m21, solvedRunner());
		const loop = ctrl.add('repeat')!;
		expect(
			ctrl.canDrop({ kind: 'palette', type: 'land' }, { parent: loop, slot: 'body', index: 0 })
		).toBe(true);
		expect(
			ctrl.canDrop({ kind: 'palette', type: 'land' }, { parent: loop, slot: 'else', index: 0 })
		).toBe(false);
		expect(
			ctrl.canDrop({ kind: 'program', id: loop }, { parent: loop, slot: 'body', index: 0 })
		).toBe(false);
		expect(
			ctrl.canDrop({ kind: 'program', id: 'nope' }, { parent: null, slot: 'body', index: 0 })
		).toBe(false);
	});

	it('starts from the mission starter program and maps editable numbers', () => {
		const ctrl = new MissionRun(m32, solvedRunner());
		expect(ctrl.program.map((n) => n.type)[0]).toBe('takeoff');
		expect(ctrl.program).toHaveLength(9);
		const forwardLines = Object.keys(ctrl.numberTargets).map(Number);
		expect(forwardLines).toEqual([4, 7, 10]);
	});

	it('toggles the speed', () => {
		const ctrl = new MissionRun(m11, solvedRunner());
		ctrl.toggleSpeed();
		expect(ctrl.speed).toBe(2);
		ctrl.toggleSpeed();
		expect(ctrl.speed).toBe(1);
	});
});
