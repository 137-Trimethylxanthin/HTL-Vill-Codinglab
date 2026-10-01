<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import { backOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';
	import type { DropTarget, Slot } from '$lib/blocks/edit';
	import type { BlockNode, BlockType } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';
	import BlockTile from './BlockTile.svelte';
	import { blockColor } from './colors';

	type Item = { key: string; node: BlockNode | null };

	// Svelte animations run via the Web Animations API, so reduced motion is handled here, not in CSS.
	const ms = (value: number) => (prefersReducedMotion.current ? 0 : value);

	/**
	 * Like svelte/animate flip, but translate only: flip also scales, and when the gap moves
	 * every frame (auto-scroll) restarted scale animations compound to absurd sizes.
	 */
	function slide(_node: Element, { from, to }: { from: DOMRect; to: DOMRect }) {
		const dx = from.left - to.left;
		const dy = from.top - to.top;
		if (dx === 0 && dy === 0) return { duration: 0 };
		return {
			duration: ms(300),
			easing: backOut,
			css: (_t: number, u: number) => `transform: translate(${u * dx}px, ${u * dy}px);`
		};
	}

	let {
		program,
		activeId,
		locked = false,
		draggingId = null,
		hover = null,
		landedId = null,
		gapHeight = null,
		gapType = null,
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
		/** Height of the block being moved; new blocks get the default tile height. */
		gapHeight?: number | null;
		/** Type of the block being dragged: the drop gap takes its colour. */
		gapType?: BlockType | null;
		onRemove: (id: string) => void;
		onStep: (id: string, delta: number) => void;
		onGrab: (id: string, e: PointerEvent) => void;
	} = $props();

	// Long programs scroll: keep the block that is running right now in view.
	let scroller = $state<HTMLElement>();
	$effect(() => {
		if (!activeId || !scroller) return;
		const row = scroller.querySelector<HTMLElement>(`[data-block-id="${activeId}"]`);
		const tile = (row?.firstElementChild as HTMLElement | null) ?? row;
		tile?.scrollIntoView({
			block: 'nearest',
			behavior: prefersReducedMotion.current ? 'auto' : 'smooth'
		});
	});

	const gapColor = $derived(gapType ? blockColor(gapType) : 'var(--drone)');

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
		class={cn('flex flex-col', parent !== null && 'min-h-16 py-1')}
	>
		{#each items as item (item.key)}
			<li
				data-block-id={item.node?.id}
				animate:slide
				in:scale={{ start: 0.7, duration: item.node ? 0 : ms(280), easing: backOut }}
				out:scale={{ start: 0.7, duration: item.node && item.node.id !== draggingId ? ms(160) : 0 }}
			>
				{#if item.node}
					{@const node = item.node}
					{@const open = node.children !== undefined}
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
							clamp={open}
							onStep={locked ? undefined : (delta) => onStep(node.id, delta)}
							onRemove={locked ? undefined : () => onRemove(node.id)}
						/>
					</div>
					{#if open}
						<!-- The C-shaped clamp: an arm down the left, a "sonst" bar, a foot with a tab. -->
						<div class="drop-shadow-md" style:--blk={blockColor(node.type)}>
							{@render arm(node.children ?? [], node.id, 'body')}
							{#if node.else}
								<div
									class="relative flex h-9 items-center rounded-r-xl bg-(--blk) pl-4 text-sm font-bold text-white uppercase"
									style:--tab-x="calc(var(--arm) + var(--notch-x))"
								>
									{t.workspace.else}
									<span class="puzzle-tab"></span>
								</div>
								{@render arm(node.else, node.id, 'else')}
							{/if}
							<div class="relative h-4 w-36 rounded-tr-lg rounded-b-xl bg-(--blk)">
								<span class="puzzle-tab"></span>
							</div>
						</div>
					{/if}
				{:else}
					<div
						data-drop-gap
						class="breathe h-[4.25rem] rounded-2xl border-2 border-dashed"
						style:height={gapHeight ? `${gapHeight}px` : undefined}
						style:border-color={gapColor}
						style:background-color="color-mix(in oklch, {gapColor} 18%, transparent)"
					></div>
				{/if}
			</li>
		{/each}
		{#if parent !== null && items.length === 0}
			<li
				class="mx-1 grid h-12 place-items-center rounded-xl border-2 border-dashed border-(--blk)/40 text-sm text-muted-foreground"
			>
				{t.workspace.dropHere}
			</li>
		{/if}
	</ol>
{/snippet}

{#snippet arm(nodes: BlockNode[], parent: string, slot: Slot)}
	<div class="flex">
		<div class="w-(--arm) shrink-0 bg-(--blk)"></div>
		<div class="min-w-0 grow">
			{@render list(nodes, parent, slot)}
		</div>
	</div>
{/snippet}

<section class="flex min-h-0 flex-1 flex-col gap-3">
	<h2 class="text-sm font-bold tracking-wide text-muted-foreground uppercase">
		{t.workspace.program}
	</h2>
	<!-- relative: the offset chain used to measure drop targets ends here. -->
	<div
		data-drop-scroll
		bind:this={scroller}
		class="relative min-h-0 grow overflow-y-auto px-1 pb-2"
	>
		{@render list(program, null, 'body')}
		{#if program.length === 0 && !hover}
			<p class="rounded-2xl border-2 border-dashed p-6 text-center text-lg text-muted-foreground">
				{t.workspace.emptyProgram}
			</p>
		{/if}
	</div>
</section>
