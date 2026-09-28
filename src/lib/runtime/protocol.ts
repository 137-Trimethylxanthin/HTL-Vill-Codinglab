import type { Mission } from '$lib/missions/schema';
import type { RunResult } from '$lib/sim/result';

export type WorkerRequest = { id: number; code: string; mission: Mission; maxEvents: number };

export type WorkerResponse =
	| { type: 'ready' }
	| { type: 'failed'; message: string }
	| { type: 'result'; id: number; result: RunResult };
