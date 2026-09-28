import type { RunResult } from '$lib/sim/result';
import type { Mission } from './schema';

const cellsWith = (rows: string[], ch: string): string[] =>
	rows.flatMap((row, y) => [...row].flatMap((c, x) => (c === ch ? [`${x},${y}`] : [])));

/** The goal is always: do everything the map asks for, then land (on a pad if there is one). */
export function isGoalReached(mission: Mission, result: RunResult): boolean {
	if (result.stop || result.pyError) return false;
	const { final } = result;
	const { rows } = mission.map;
	if (final.flying) return false;
	if (cellsWith(rows, 'P').length > 0 && rows[final.y]?.[final.x] !== 'P') return false;
	if (!cellsWith(rows, 'C').every((key) => final.visited.includes(key))) return false;
	if (final.delivered < cellsWith(rows, 'K').length) return false;
	if (final.photographed.length < cellsWith(rows, 'S').length) return false;
	return true;
}
