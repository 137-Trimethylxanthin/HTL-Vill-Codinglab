import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHOWCASE } from '$lib/missions';
import { PythonRunner, type WorkerLike } from './client';
import type { WorkerRequest, WorkerResponse } from './protocol';

class FakeWorker implements WorkerLike {
	onmessage: ((e: { data: WorkerResponse }) => void) | null = null;
	onerror: ((e: unknown) => void) | null = null;
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

	it('rejects ready when the worker script itself errors', async () => {
		const worker = new FakeWorker();
		const runner = new PythonRunner(() => worker);
		worker.onerror?.(new Error('module failed'));
		await expect(runner.ready()).rejects.toThrow();
	});

	it('rejects ready when the worker never answers', async () => {
		vi.useFakeTimers();
		const runner = new PythonRunner(() => new FakeWorker(), 2000, 500, 30000);
		const ready = expect(runner.ready()).rejects.toThrow();
		await vi.advanceTimersByTimeAsync(30000);
		await ready;
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
	it('a timeout ends every run on the hung worker and spares the fresh one', async () => {
		vi.useFakeTimers();
		const workers: FakeWorker[] = [];
		const runner = new PythonRunner(() => {
			const w = new FakeWorker();
			workers.push(w);
			return w;
		}, 2000);
		workers[0].emit({ type: 'ready' });
		const first = runner.run('a', m11);
		await vi.advanceTimersByTimeAsync(500);
		const second = runner.run('b', m11);
		await vi.advanceTimersByTimeAsync(1500);
		expect((await first).stop?.code).toBe('timeout');
		expect((await second).stop?.code).toBe('timeout');
		// The second run's own timer must not kill the replacement worker.
		await vi.advanceTimersByTimeAsync(5000);
		expect(workers).toHaveLength(2);
		expect(workers[1].terminated).toBe(false);
	});

	it('retries a worker that failed to start', async () => {
		const workers: FakeWorker[] = [];
		const runner = new PythonRunner(() => {
			const w = new FakeWorker();
			workers.push(w);
			return w;
		});
		workers[0].emit({ type: 'failed', message: 'boom' });
		await expect(runner.ready()).rejects.toThrow('boom');
		const pending = runner.run('code', m11);
		await vi.waitFor(() => expect(workers).toHaveLength(2));
		workers[1].emit({ type: 'ready' });
		await vi.waitFor(() => expect(workers[1].sent).toHaveLength(1));
		const result = { events: [], final: {} as never, stop: null, pyError: null };
		workers[1].emit({ type: 'result', id: workers[1].sent[0].id, result });
		await expect(pending).resolves.toBe(result);
	});

	it('runs waiting on a failed start share one retry', async () => {
		const workers: FakeWorker[] = [];
		const runner = new PythonRunner(() => {
			const w = new FakeWorker();
			workers.push(w);
			return w;
		});
		const a = runner.run('a', m11);
		const b = runner.run('b', m11);
		workers[0].emit({ type: 'failed', message: 'boom' });
		await vi.waitFor(() => expect(workers).toHaveLength(2));
		workers[1].emit({ type: 'ready' });
		await vi.waitFor(() => expect(workers[1].sent).toHaveLength(2));
		expect(workers).toHaveLength(2);
		expect(workers[0].terminated).toBe(true);
		const result = { events: [], final: {} as never, stop: null, pyError: null };
		for (const msg of workers[1].sent) workers[1].emit({ type: 'result', id: msg.id, result });
		await expect(Promise.all([a, b])).resolves.toEqual([result, result]);
	});

	it('does not respawn after dispose, even with a run in flight', async () => {
		vi.useFakeTimers();
		const workers: FakeWorker[] = [];
		const runner = new PythonRunner(() => {
			const w = new FakeWorker();
			workers.push(w);
			return w;
		}, 2000);
		workers[0].emit({ type: 'ready' });
		void runner.run('while True: pass', m11);
		await vi.advanceTimersByTimeAsync(10);
		runner.dispose();
		await vi.advanceTimersByTimeAsync(5000);
		expect(workers).toHaveLength(1);
		expect(workers[0].terminated).toBe(true);
	});
});
