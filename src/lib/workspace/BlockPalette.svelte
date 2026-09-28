<script lang="ts">
	import { BLOCKS } from '$lib/blocks/registry';
	import type { BlockType } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import BlockTile from './BlockTile.svelte';

	let {
		blocks,
		disabled = false,
		onGrab,
		onAdd
	}: {
		blocks: BlockType[];
		disabled?: boolean;
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
			class="press touch-none text-left disabled:opacity-50 portrait:w-48 portrait:shrink-0"
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
		</button>
	{/each}
	<p class="mt-2 text-center text-sm text-muted-foreground portrait:hidden">
		{t.workspace.trashHint}
	</p>
</section>
