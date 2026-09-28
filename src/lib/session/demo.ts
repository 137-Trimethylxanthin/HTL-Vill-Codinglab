import { BLOCKS } from '$lib/blocks/registry';
import type { BlockNode } from '$lib/blocks/types';
import type { Mission } from '$lib/missions/schema';
import { World, type DroneEvent } from '$lib/sim/world';

function flatten(nodes: BlockNode[]): BlockNode[] {
	return nodes.flatMap((node) => {
		if (node.type === 'repeat') {
			return Array.from({ length: node.n ?? 2 }, () => flatten(node.children ?? [])).flat();
		}
		if (node.type === 'if_obstacle') throw new Error('The demo cannot replay sensor blocks.');
		return [node];
	});
}

/** Replays a mission's reference solution without Python, for the attract loop. */
export function demoEvents(mission: Mission): DroneEvent[] {
	const world = new World(mission);
	for (const node of flatten(mission.solution)) {
		const spec = BLOCKS[node.type];
		const arg = spec.param ? (node.n ?? spec.param.default) : undefined;
		if (!world.call(spec.call, 0, arg)) break;
	}
	return world.events;
}
