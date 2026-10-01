<script lang="ts">
	import { BLOCKS } from '$lib/blocks/registry';
	import type { BlockType } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';
	import BlockTile from './BlockTile.svelte';

	let {
		blocks,
		disabled = false,
		scrollable = false,
		pointAt = null,
		fresh = [],
		onGrab,
		onAdd
	}: {
		blocks: BlockType[];
		disabled?: boolean;
		/**
		 * The palette overflows: let a finger pan along it (vertical in landscape, horizontal in
		 * portrait). Moving across that axis still drags a block out; the browser cancels the
		 * pointer when it takes over for scrolling, which ends the drag cleanly.
		 */
		scrollable?: boolean;
		/** The coach's hint is about this block: it wiggles. */
		pointAt?: BlockType | null;
		/** Blocks this mission introduces: they wear a "Neu!" badge. */
		fresh?: BlockType[];
		onGrab: (type: BlockType, e: PointerEvent) => void;
		onAdd: (type: BlockType) => void;
	} = $props();
</script>

<section class="flex flex-col gap-3 portrait:flex-row portrait:items-stretch">
	<h2 class="text-sm font-bold tracking-wide text-muted-foreground uppercase portrait:hidden">
		{t.workspace.palette}
	</h2>
	{#each blocks as type (type)}
		<button
			data-palette={type}
			class={cn(
				'relative press text-left disabled:opacity-50 portrait:w-48 portrait:shrink-0',
				scrollable ? 'touch-pan-y portrait:touch-pan-x' : 'touch-none',
				pointAt === type && 'wiggle'
			)}
			{disabled}
			onpointerdown={(e) => onGrab(type, e)}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					onAdd(type);
				}
			}}
		>
			<BlockTile {type} n={BLOCKS[type].param?.default} />
			{#if fresh.includes(type)}
				<span
					class="star-pop absolute -top-2 -right-1 rounded-full bg-yellow-300 px-2 py-0.5 text-sm font-bold text-slate-900 shadow"
					>{t.workspace.fresh}</span
				>
			{/if}
		</button>
	{/each}
	<p class="mt-2 text-center text-sm text-muted-foreground portrait:hidden">
		{t.workspace.trashHint}
	</p>
</section>
