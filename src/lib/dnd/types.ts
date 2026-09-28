import type { DropTarget } from '$lib/blocks/edit';
import type { BlockType } from '$lib/blocks/types';

export type DragSource = { kind: 'palette'; type: BlockType } | { kind: 'program'; id: string };

export type HitResult = { kind: 'slot'; target: DropTarget } | { kind: 'trash' } | null;

export type DropOp =
	| { kind: 'tap'; source: DragSource }
	| { kind: 'insert'; type: BlockType; target: DropTarget }
	| { kind: 'move'; id: string; target: DropTarget }
	| { kind: 'remove'; id: string }
	| { kind: 'cancel' };
