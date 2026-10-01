import type { BlockType } from './types';

/** Blocks of one category share a colour, so kids can tell kinds of commands apart at a glance. */
export type BlockCategory = 'flight' | 'move' | 'turn' | 'cargo' | 'camera' | 'loop' | 'condition';

export interface BlockSpec {
	category: BlockCategory;
	/** Python function name (containers: informational only). */
	call: string;
	param?: { min: number; max: number; default: number };
	container?: boolean;
	/** Container with a second "sonst" branch. */
	hasElse?: boolean;
}

export const BLOCKS: Record<BlockType, BlockSpec> = {
	takeoff: { category: 'flight', call: 'takeoff' },
	land: { category: 'flight', call: 'land' },
	forward: { category: 'move', call: 'forward', param: { min: 1, max: 9, default: 1 } },
	turn_left: { category: 'turn', call: 'turn_left' },
	turn_right: { category: 'turn', call: 'turn_right' },
	pick_up: { category: 'cargo', call: 'pick_up' },
	drop: { category: 'cargo', call: 'drop' },
	photo: { category: 'camera', call: 'photo' },
	repeat: {
		category: 'loop',
		call: 'range',
		param: { min: 2, max: 9, default: 2 },
		container: true
	},
	if_obstacle: { category: 'condition', call: 'obstacle_ahead', container: true, hasElse: true }
};
