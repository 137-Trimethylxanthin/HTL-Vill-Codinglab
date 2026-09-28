import type { RunResult } from '$lib/sim/result';
import type { Mission } from './schema';

export function isGoalReached(mission: Mission, result: RunResult): boolean {
	if (result.stop || result.pyError) return false;
	const { final } = result;
	switch (mission.goal.type) {
		case 'landOn':
			return !final.flying && mission.map.rows[final.y]?.[final.x] === 'P';
	}
}
