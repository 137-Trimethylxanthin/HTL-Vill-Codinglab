<script lang="ts">
	import { BLOCKS } from '$lib/blocks/registry';
	import type { BlockType } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import BlockTile from './BlockTile.svelte';

	let {
		blocks,
		disabled = false,
		onAdd
	}: { blocks: BlockType[]; disabled?: boolean; onAdd: (type: BlockType) => void } = $props();
</script>

<section class="flex flex-col gap-3">
	<h2 class="text-sm font-bold tracking-wide text-muted-foreground uppercase">
		{t.workspace.palette}
	</h2>
	{#each blocks as type (type)}
		<button
			class="text-left transition-transform active:scale-95 disabled:opacity-50"
			{disabled}
			onclick={() => onAdd(type)}
		>
			<BlockTile {type} n={BLOCKS[type].param?.default} />
		</button>
	{/each}
</section>
