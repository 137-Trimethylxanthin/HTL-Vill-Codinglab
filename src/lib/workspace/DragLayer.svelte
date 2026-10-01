<script lang="ts">
	import type { BlockType } from '$lib/blocks/types';
	import type { DragController } from '$lib/dnd/controller.svelte';
	import { cn } from '$lib/utils';
	import BlockTile from './BlockTile.svelte';

	let { drag, ghost }: { drag: DragController; ghost: { type: BlockType; n?: number } | null } =
		$props();
</script>

{#if drag.active && ghost}
	<div
		class="pointer-events-none fixed top-0 left-0 z-50"
		style:width="{drag.width}px"
		style:transform="translate({drag.x.current - drag.offsetX}px, {drag.y.current - drag.offsetY}px)
		rotate({drag.tilt.current}deg) scale({drag.scale.current})"
	>
		<div
			class={cn(
				'drop-shadow-xl transition-opacity',
				drag.rejected && 'shake',
				drag.hover?.kind === 'trash' && 'opacity-50'
			)}
		>
			<BlockTile type={ghost.type} n={ghost.n} />
		</div>
	</div>
{/if}
