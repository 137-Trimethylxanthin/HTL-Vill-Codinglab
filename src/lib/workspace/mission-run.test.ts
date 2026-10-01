import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_BLOCKS } from '$lib/blocks/edit';
import { t } from '$lib/i18n/de';
import { SHOWCASE } from '$lib/missions';
import type { RunResult } from '$lib/sim/result';
import { World } from '$lib/sim/world';
import { blameFor, MissionRun, STOP_GUARD_MS } from './mission-run.svelte';

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

	it('an old run waking up late cannot take over a newer run', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const first = ctrl.run();
		await vi.advanceTimersByTimeAsync(700);
		ctrl.stop();
		// Past the double-tap guard, but the first run is still asleep inside its current frame.
		vi.setSystemTime(Date.now() + STOP_GUARD_MS);
		const second = ctrl.run();
		// The first run's player sleep ends now; it must leave the second run alone.
		await vi.advanceTimersByTimeAsync(300);
		expect(ctrl.status).toBe('running');
		expect(ctrl.add('photo')).toBeNull();
		await vi.advanceTimersByTimeAsync(10000);
		await Promise.all([first, second]);
		expect(ctrl.status).toBe('success');
		expect(ctrl.stars).toBeGreaterThan(0);
	});

	it('ignores a start right after stop (double tap)', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const running = ctrl.run();
		await vi.advanceTimersByTimeAsync(700);
		ctrl.stop();
		await vi.advanceTimersByTimeAsync(100);
		await ctrl.run();
		expect(ctrl.status).toBe('idle');
		await vi.advanceTimersByTimeAsync(10000);
		await running;
		expect(ctrl.status).toBe('idle');
	});

	it('the speed button changes a flight that is already running', async () => {
		vi.useFakeTimers();
		const slow = new MissionRun(m11, solvedRunner());
		const fast = new MissionRun(m11, solvedRunner());
		build(slow);
		build(fast);
		const a = slow.run();
		const b = fast.run();
		await vi.advanceTimersByTimeAsync(10);
		fast.toggleSpeed();
		let t1 = 0;
		let t2 = 0;
		for (let ms = 0; ms < 20000 && (!t1 || !t2); ms += 50) {
			await vi.advanceTimersByTimeAsync(50);
			if (!t1 && slow.status === 'success') t1 = ms;
			if (!t2 && fast.status === 'success') t2 = ms;
		}
		await Promise.all([a, b]);
		expect(t2).toBeLessThan(t1 * 0.75);
	});

	it('names the block where the drone stopped, counted top to bottom', () => {
		const program = [
			{ id: 'a', type: 'takeoff' as const },
			{
				id: 'r',
				type: 'repeat' as const,
				n: 2,
				children: [{ id: 'f', type: 'forward' as const, n: 4 }]
			}
		];
		expect(blameFor(program, 'f')).toBe(' Das war Block 3: „Vorwärts 4“.');
		expect(blameFor(program, 'a')).toBe(' Das war Block 1: „Abheben“.');
		expect(blameFor(program, null)).toBe('');
	});

	it('praises a success that fixes a failed run', async () => {
		vi.useFakeTimers();
		let solve = false;
		const runner = {
			run: async (): Promise<RunResult> => {
				const w = new World(m11);
				w.call('takeoff', 3);
				w.call('forward', 4, solve ? 4 : 1);
				w.call('land', 5);
				return { events: w.events, final: w.snapshot(), stop: null, pyError: null };
			}
		};
		const ctrl = new MissionRun(m11, runner);
		build(ctrl);
		let running = ctrl.run();
		await vi.advanceTimersByTimeAsync(10000);
		await running;
		expect(ctrl.status).toBe('fail');
		expect(ctrl.fails).toBe(1);
		solve = true;
		running = ctrl.run();
		await vi.advanceTimersByTimeAsync(10000);
		await running;
		expect(ctrl.status).toBe('success');
		expect(ctrl.fixed).toBe(true);
		expect(ctrl.fails).toBe(0);
	});

	it('steps through the flight one move per tap and keeps the line lit', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const tap = async () => {
			const step = ctrl.advance();
			await vi.advanceTimersByTimeAsync(2000);
			await step;
		};
		await tap();
		expect(ctrl.stepping).toBe(true);
		expect(ctrl.status).toBe('running');
		expect(ctrl.player.line).toBe(3); // takeoff()
		expect(ctrl.add('photo')).toBeNull();
		await tap();
		expect(ctrl.player.line).toBe(4); // first step of forward(4)
		expect(ctrl.player.y.target).toBe(3);
		// takeoff, 4 moves, land = 6 frames: 4 more taps finish the flight.
		for (let i = 0; i < 4; i++) await tap();
		expect(ctrl.status).toBe('success');
		expect(ctrl.stepping).toBe(false);
		expect(ctrl.runs).toBe(1);
	});

	it('plays the rest of a stepped flight on Start', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const first = ctrl.advance();
		await vi.advanceTimersByTimeAsync(2000);
		await first;
		const rest = ctrl.run();
		await vi.advanceTimersByTimeAsync(10000);
		await rest;
		expect(ctrl.status).toBe('success');
		expect(ctrl.runs).toBe(1);
	});

	it('ignores a stop right after start (double tap)', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const running = ctrl.run();
		await vi.advanceTimersByTimeAsync(100);
		ctrl.stop();
		expect(ctrl.status).toBe('running');
		await vi.advanceTimersByTimeAsync(500);
		ctrl.stop();
		expect(ctrl.status).toBe('idle');
		await vi.advanceTimersByTimeAsync(10000);
		await running;
	});
	it('reports its result after success', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const running = ctrl.run();
		await vi.advanceTimersByTimeAsync(10000);
		await running;
		const result = ctrl.result();
		expect(result).toMatchObject({ id: '1.1', stars: 3, runs: 1, blocks: 3, skipped: false });
		expect(result.seconds).toBeGreaterThanOrEqual(0);
		expect(result.path.at(-1)).toBe('2,0');
	});

	it('dispose stops playback even right after start', async () => {
		vi.useFakeTimers();
		const ctrl = new MissionRun(m11, solvedRunner());
		build(ctrl);
		const running = ctrl.run();
		await vi.advanceTimersByTimeAsync(50);
		ctrl.dispose();
		expect(ctrl.player.playing).toBe(false);
		await vi.advanceTimersByTimeAsync(10000);
		await running;
		expect(ctrl.status).toBe('idle');
	});
});
