import type { BlockNode } from '$lib/blocks/types';
import type { Mission } from '$lib/missions/schema';
import { World } from '$lib/sim/world';
import { buildTimeline, startPose, type Frame, type Pose } from '$lib/stage/timeline';

export interface Preview {
	/** Where the drone is right before the block. */
	before: Pose;
	/** What the block makes the drone do (empty: nothing visible). */
	frames: Frame[];
	/** The drone would crash or stop with an error during this block. */
	fails: boolean;
}

const MAX_EVENTS = 300;

/**
 * Runs the block program directly on the drone world (no Python) up to the block `id` and
 * returns what that block does. Inside a loop it shows the first round. Null if the block
 * is never reached (e.g. after a crash, or in a branch that is not taken).
 */
export function previewBlock(program: BlockNode[], mission: Mission, id: string): Preview | null {
	const world = new World(mission, MAX_EVENTS);
	// Event range of the target block, set by exec once it has run.
	const hit: { range?: [number, number] } = {};

	// Returns false once the target was run or the world stopped.
	const exec = (nodes: BlockNode[]): boolean => {
		for (const node of nodes) {
			if (world.stop) return false;
			const target = node.id === id;
			const from = world.events.length;
			if (!run(node) && !target) return false;
			if (target) {
				hit.range = [from, world.events.length];
				return false;
			}
			if (hit.range) return false;
		}
		return true;
	};

	const run = (node: BlockNode): boolean => {
		switch (node.type) {
			case 'forward':
				return world.call('forward', 0, node.n ?? 1);
			case 'repeat':
				for (let i = 0; i < (node.n ?? 2); i++) if (!exec(node.children ?? [])) return false;
				return true;
			case 'if_obstacle': {
				const ahead = world.sense('obstacle_ahead', 0);
				if (ahead === undefined) return false;
				return exec((ahead ? node.children : node.else) ?? []);
			}
			default:
				return world.call(node.type, 0);
		}
	};

	exec(program);
	if (!hit.range) return null;
	const [from, to] = hit.range;
	const frames = buildTimeline(mission.map.start, world.events);
	return {
		before: frames[from - 1]?.pose ?? startPose(mission.map.start),
		frames: frames.slice(from, to),
		fails: world.stop !== null
	};
}
