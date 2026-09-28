<script lang="ts">
	import type { BlockNode } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import BlockTile from './BlockTile.svelte';

	let {
		program,
		activeId,
		locked = false,
		onRemove,
		onStep
	}: {
		program: BlockNode[];
		activeId: string | null;
		locked?: boolean;
		onRemove: (id: string) => void;
		onStep: (id: string, delta: number) => void;
	} = $props();
</script>

{#snippet list(nodes: BlockNode[])}
	{#each nodes as node (node.id)}
		<li class="flex flex-col gap-2">
			<BlockTile
				type={node.type}
				n={node.n}
				active={node.id === activeId}
				onStep={locked ? undefined : (delta) => onStep(node.id, delta)}
				onRemove={locked ? undefined : () => onRemove(node.id)}
			/>
			{#if node.children}
				<ul class="ml-8 flex flex-col gap-2 border-l-4 border-drone/40 pl-3">
					{@render list(node.children)}
				</ul>
			{/if}
		</li>
	{/each}
{/snippet}

<section class="flex min-h-0 flex-col gap-3">
	<h2 class="text-sm font-bold tracking-wide text-muted-foreground uppercase">
		{t.workspace.program}
	</h2>
	{#if program.length === 0}
		<p class="rounded-2xl border-2 border-dashed p-6 text-center text-lg text-muted-foreground">
			{t.workspace.emptyProgram}
		</p>
	{:else}
		<ol class="flex min-h-0 flex-col gap-2 overflow-y-auto pb-2">
			{@render list(program)}
		</ol>
	{/if}
</section>
