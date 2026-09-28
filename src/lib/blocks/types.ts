export const BLOCK_TYPES = [
	'takeoff',
	'land',
	'forward',
	'turn_left',
	'turn_right',
	'pick_up',
	'drop',
	'photo',
	'repeat',
	'if_obstacle'
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface BlockNode {
	id: string;
	type: BlockType;
	/** Parameter value for blocks that take a number (steps, repetitions). */
	n?: number;
	/** Body of container blocks (`repeat`, `if_obstacle`). */
	children?: BlockNode[];
	/** "sonst" branch of `if_obstacle`. */
	else?: BlockNode[];
}
