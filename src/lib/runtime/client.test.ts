import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHOWCASE } from '$lib/missions';
import { PythonRunner, type WorkerLike } from './client';
import type { WorkerRequest, WorkerResponse } from './protocol';

class FakeWorker implements WorkerLike {
	onmessage: ((e: { data: WorkerResponse }) => void) | null = null;
	sent: WorkerRequest[] = [];
	terminated = false;
	postMessage(msg: WorkerRequest) {
		this.sent.push(msg);
	}
	terminate() {
		this.terminated = true;
	}
	emit(data: WorkerResponse) {
		this.onmessage?.({ data });
	}
}

const m11 = SHOWCASE[0];

afterEach(() => {
	vi.useRealTimers();
});

describe('PythonRunner', () => {
	it('resolves ready when the worker reports ready', async () => {
		const worker = new FakeWorker();
		const runner = new PythonRunner(() => worker);
		worker.emit({ type: 'ready' });
		await expect(runner.ready()).resolves.toBeUndefined();
	});

	it('rejects ready when the worker reports failure', async () => {
		const worker = new FakeWorker();
		const runner = new PythonRunner(() => worker);
		worker.emit({ type: 'failed', message: 'boom' });
		await expect(runner.ready()).rejects.toThrow('boom');
	});

	it('returns the result for the matching request id', async () => {
		const worker = new FakeWorker();
		const runner = new PythonRunner(() => worker);
		worker.emit({ type: 'ready' });
		const pending = runner.run('code', m11);
		await vi.waitFor(() => expect(worker.sent).toHaveLength(1));
		const result = { events: [], final: {} as never, stop: null, pyError: null };
		worker.emit({ type: 'result', id: worker.sent[0].id, result });
		await expect(pending).resolves.toBe(result);
	});

	it('terminates and respawns the worker on timeout', async () => {
		vi.useFakeTimers();
		const workers: FakeWorker[] = [];
		const runner = new PythonRunner(() => {
			const w = new FakeWorker();
			workers.push(w);
			return w;
		}, 2000);
		workers[0].emit({ type: 'ready' });
		const pending = runner.run('while True: pass', m11);
		await vi.advanceTimersByTimeAsync(2000);
		const result = await pending;
		expect(result.stop).toEqual({ reason: 'timeout', code: 'timeout', line: 0 });
		expect(result.final).toMatchObject({ x: 2, y: 4 });
		expect(workers[0].terminated).toBe(true);
		expect(workers).toHaveLength(2);
	});
});
