import type { BlockType } from './types';

export interface BlockSpec {
	/** Python function name (containers: informational only). */
	call: string;
	param?: { min: number; max: number; default: number };
	container?: boolean;
}

export const BLOCKS: Record<BlockType, BlockSpec> = {
	takeoff: { call: 'takeoff' },
	land: { call: 'land' },
	forward: { call: 'forward', param: { min: 1, max: 9, default: 1 } },
	turn_left: { call: 'turn_left' },
	turn_right: { call: 'turn_right' },
	pick_up: { call: 'pick_up' },
	drop: { call: 'drop' },
	photo: { call: 'photo' },
	repeat: { call: 'range', param: { min: 2, max: 9, default: 2 }, container: true }
};
