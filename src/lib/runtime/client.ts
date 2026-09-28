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

export class PythonRunner {
	private worker!: WorkerLike;
	private readyPromise!: Promise<void>;
	private nextId = 1;
	private pending = new Map<number, (result: RunResult) => void>();

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
		await this.readyPromise;
		const id = this.nextId++;
		return new Promise((resolve) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				this.worker.terminate();
				this.spawn();
				resolve(timeoutResult(mission));
			}, this.timeoutMs);
			this.pending.set(id, (result) => {
				clearTimeout(timer);
				resolve(result);
			});
			this.worker.postMessage({ id, code, mission, maxEvents: this.maxEvents });
		});
	}

	dispose() {
		this.worker.terminate();
		this.pending.clear();
	}

	private spawn() {
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
					const done = this.pending.get(data.id);
					this.pending.delete(data.id);
					done?.(data.result);
				}
			};
		});
		this.readyPromise.catch(() => {});
	}
}
