import type { Mission } from '$lib/missions/schema';
import type { RunResult } from '$lib/sim/result';
import { World } from '$lib/sim/world';
import type { WorkerRequest, WorkerResponse } from './protocol';

export interface WorkerLike {
	postMessage(msg: WorkerRequest): void;
	terminate(): void;
	onmessage: ((e: { data: WorkerResponse }) => void) | null;
	onerror: ((e: unknown) => void) | null;
}

export type WorkerFactory = () => WorkerLike;

export const defaultWorkerFactory: WorkerFactory = () =>
	new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;

export function timeoutResult(mission: Mission): RunResult {
	return {
		events: [],
		final: new World(mission).snapshot(),
		stop: { reason: 'timeout', code: 'timeout', line: 0 },
		pyError: null
	};
}

interface Pending {
	worker: WorkerLike;
	timer: ReturnType<typeof setTimeout>;
	mission: Mission;
	resolve: (result: RunResult) => void;
}

export class PythonRunner {
	private worker!: WorkerLike;
	private readyPromise!: Promise<void>;
	private nextId = 1;
	private pending = new Map<number, Pending>();
	private disposed = false;

	constructor(
		private readonly factory: WorkerFactory = defaultWorkerFactory,
		private readonly timeoutMs = 2000,
		private readonly maxEvents = 500,
		private readonly readyTimeoutMs = 30000
	) {
		this.spawn();
	}

	ready(): Promise<void> {
		return this.readyPromise;
	}

	async run(code: string, mission: Mission): Promise<RunResult> {
		const ready = this.readyPromise;
		try {
			await ready;
		} catch {
			// A worker that failed to start (or restart) gets one more chance instead of breaking Python
			// for good. Runs waiting together share that one retry.
			if (this.readyPromise === ready) {
				this.worker.terminate();
				this.spawn();
			}
			await this.readyPromise;
		}
		const id = this.nextId++;
		const worker = this.worker;
		return new Promise((resolve) => {
			const timer = setTimeout(() => this.restart(worker), this.timeoutMs);
			this.pending.set(id, { worker, timer, mission, resolve });
			worker.postMessage({ id, code, mission, maxEvents: this.maxEvents });
		});
	}

	dispose() {
		this.disposed = true;
		for (const p of this.pending.values()) clearTimeout(p.timer);
		this.pending.clear();
		this.worker.terminate();
	}

	/** A hung worker: end every run still waiting on it, then start a fresh one (only once per worker). */
	private restart(worker: WorkerLike) {
		for (const [id, p] of this.pending) {
			if (p.worker !== worker) continue;
			clearTimeout(p.timer);
			this.pending.delete(id);
			p.resolve(timeoutResult(p.mission));
		}
		if (worker !== this.worker) return;
		worker.terminate();
		this.spawn();
	}

	private spawn() {
		if (this.disposed) return;
		const worker = this.factory();
		this.worker = worker;
		this.readyPromise = new Promise((resolve, reject) => {
			const timer = setTimeout(
				() => reject(new Error('Python worker did not start in time')),
				this.readyTimeoutMs
			);
			const settle = (error?: Error) => {
				clearTimeout(timer);
				if (error) reject(error);
				else resolve();
			};
			worker.onerror = (e) => settle(new Error(`Python worker failed: ${String(e)}`));
			worker.onmessage = ({ data }) => {
				if (data.type === 'ready') settle();
				else if (data.type === 'failed') settle(new Error(data.message));
				else {
					const p = this.pending.get(data.id);
					if (!p) return;
					clearTimeout(p.timer);
					this.pending.delete(data.id);
					p.resolve(data.result);
				}
			};
		});
		this.readyPromise.catch(() => {});
	}
}
