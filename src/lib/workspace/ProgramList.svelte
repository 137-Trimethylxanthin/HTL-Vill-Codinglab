<script lang="ts">
	import { flip } from 'svelte/animate';
	import { backOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';
	import type { DropTarget, Slot } from '$lib/blocks/edit';
	import type { BlockNode } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';
	import BlockTile from './BlockTile.svelte';

	type Item = { key: string; node: BlockNode | null };

	let {
		program,
		activeId,
		locked = false,
		draggingId = null,
		hover = null,
		landedId = null,
		onRemove,
		onStep,
		onGrab
	}: {
		program: BlockNode[];
		activeId: string | null;
		locked?: boolean;
		draggingId?: string | null;
		hover?: DropTarget | null;
		landedId?: string | null;
		onRemove: (id: string) => void;
		onStep: (id: string, delta: number) => void;
		onGrab: (id: string, e: PointerEvent) => void;
	} = $props();

	/** Items of one list: without the dragged block, with a placeholder where it would land. */
	function itemsFor(nodes: BlockNode[], parent: string | null, slot: Slot): Item[] {
		const items: Item[] = nodes
			.filter((node) => node.id !== draggingId)
			.map((node) => ({ key: node.id, node }));
		if (hover && hover.parent === parent && hover.slot === slot) {
			items.splice(Math.min(hover.index, items.length), 0, { key: 'placeholder', node: null });
		}
		return items;
	}
</script>

{#snippet list(nodes: BlockNode[], parent: string | null, slot: Slot)}
	{@const items = itemsFor(nodes, parent, slot)}
	<ol
		data-drop-slot={slot}
		data-drop-parent={parent ?? ''}
		class={cn(
			'flex flex-col gap-2',
			parent !== null && 'min-h-16 rounded-2xl py-1',
			parent !== null && items.length === 0 && 'border-2 border-dashed border-htl/30'
		)}
	>
		{#each items as item (item.key)}
			<li
				data-block-id={item.node?.id}
				animate:flip={{ duration: 300, easing: backOut }}
				in:scale={{ start: 0.7, duration: 280, easing: backOut }}
				out:scale={{ start: 0.7, duration: 160 }}
			>
				{#if item.node}
					{@const node = item.node}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class={cn('touch-none', !locked && 'cursor-grab', node.id === landedId && 'land')}
						onpointerdown={(e) => {
							if (!locked) onGrab(node.id, e);
						}}
					>
						<BlockTile
							type={node.type}
							n={node.n}
							active={node.id === activeId}
							onStep={locked ? undefined : (delta) => onStep(node.id, delta)}
							onRemove={locked ? undefined : () => onRemove(node.id)}
						/>
					</div>
					{#if node.children}
						<div class="mt-2 ml-5 border-l-4 border-htl/30 pl-3">
							{@render list(node.children, node.id, 'body')}
						</div>
					{/if}
					{#if node.else}
						<p class="mt-1 ml-5 text-sm font-bold text-muted-foreground uppercase">
							{t.workspace.else}
						</p>
						<div class="ml-5 border-l-4 border-htl/30 pl-3">
							{@render list(node.else, node.id, 'else')}
						</div>
					{/if}
				{:else}
					<div
						class="breathe h-14 rounded-2xl border-2 border-dashed border-drone bg-drone/15"
					></div>
				{/if}
			</li>
		{/each}
		{#if parent !== null && items.length === 0}
			<li class="grid h-12 place-items-center text-sm text-muted-foreground">
				{t.workspace.dropHere}
			</li>
		{/if}
	</ol>
{/snippet}

<section class="flex min-h-0 flex-col gap-3">
	<h2 class="text-sm font-bold tracking-wide text-muted-foreground uppercase">
		{t.workspace.program}
	</h2>
	<div class="min-h-0 grow overflow-y-auto px-1 pb-2">
		{@render list(program, null, 'body')}
		{#if program.length === 0 && !hover}
			<p class="rounded-2xl border-2 border-dashed p-6 text-center text-lg text-muted-foreground">
				{t.workspace.emptyProgram}
			</p>
		{/if}
	</div>
</section>
