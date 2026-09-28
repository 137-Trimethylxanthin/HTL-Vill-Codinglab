import type { DroneEvent, Stop, WorldSnapshot } from './world';

export interface PyError {
	type: string;
	line: number | null;
	message: string;
}

export interface RunResult {
	events: DroneEvent[];
	final: WorldSnapshot;
	stop: Stop | null;
	pyError: PyError | null;
}
