import { BLOCKS } from '$lib/blocks/registry';
import type { BlockType } from '$lib/blocks/types';

/** CSS colour of a block type (one per category, defined in layout.css). */
export const blockColor = (type: BlockType) => `var(--blk-${BLOCKS[type].category})`;
