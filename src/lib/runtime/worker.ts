import { loadPyodide } from 'pyodide';
import { createExecutor } from './execute';
import type { WorkerRequest, WorkerResponse } from './protocol';

const scope = self as unknown as {
	postMessage(msg: WorkerResponse): void;
	onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
	location: Location;
};

const executor = loadPyodide({ indexURL: new URL('/pyodide/', scope.location.href).href }).then(
	(py) => createExecutor(py)
);

executor.then(
	() => scope.postMessage({ type: 'ready' }),
	(err) => scope.postMessage({ type: 'failed', message: String(err) })
);

scope.onmessage = async (event) => {
	const { id, code, mission, maxEvents } = event.data;
	const ready = await executor;
	scope.postMessage({ type: 'result', id, result: ready.run(code, mission, maxEvents) });
};
