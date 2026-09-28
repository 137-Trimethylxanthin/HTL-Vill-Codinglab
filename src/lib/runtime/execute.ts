import droneSource from './drone.py?raw';
import type { Mission } from '$lib/missions/schema';
import type { PyError, RunResult } from '$lib/sim/result';
import { World } from '$lib/sim/world';
import { friendlyPyError } from './errors';

export interface PyodideLike {
	registerJsModule(name: string, module: object): void;
	runPython(code: string, options?: { globals?: unknown; filename?: string }): unknown;
	/** Typed as a plain PyProxy by Pyodide; at runtime it is a dict with get/set. */
	globals: object;
}

type PyGlobals = { get(name: string): unknown; set(name: string, value: unknown): void };

export interface Executor {
	run(code: string, mission: Mission, maxEvents?: number): RunResult;
}

export const MISSION_FILENAME = '<mission>';

export function createExecutor(py: PyodideLike): Executor {
	let world: World | null = null;
	const globals = py.globals as PyGlobals;

	py.registerJsModule('_drone_js', {
		call: (name: string, line: number, arg?: unknown) =>
			world ? world.call(name, line, arg) : false
	});
	globals.set('_drone_src', droneSource);
	py.runPython(
		[
			'import sys, types',
			'_m = types.ModuleType("drone")',
			'exec(_drone_src, _m.__dict__)',
			'sys.modules["drone"] = _m',
			'del _m, _drone_src'
		].join('\n')
	);

	return {
		run(code, mission, maxEvents = 500) {
			const current = new World(mission, maxEvents);
			world = current;
			let pyError: PyError | null = null;
			const scope = (globals.get('dict') as () => { destroy?: () => void })();
			try {
				py.runPython(code, { globals: scope, filename: MISSION_FILENAME });
			} catch (e) {
				if (!current.stop) pyError = friendlyPyError(e);
			} finally {
				scope.destroy?.();
				world = null;
			}
			return { events: current.events, final: current.snapshot(), stop: current.stop, pyError };
		}
	};
}
