<script lang="ts">
	import { Minus, Plus, X } from '@lucide/svelte';
	import { BLOCKS } from '$lib/blocks/registry';
	import type { BlockType } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';
	import { blockColor } from './colors';
	import { BLOCK_ICONS } from './icons';

	let {
		type,
		n,
		active = false,
		clamp = false,
		round,
		failed = false,
		onStep,
		onRemove
	}: {
		type: BlockType;
		n?: number;
		active?: boolean;
		/** Header of an open repeat/if clamp: the arm continues below, the tab moves inside it. */
		clamp?: boolean;
		/** Current round of a running repeat loop. */
		round?: number;
		/** The run stopped at this block. */
		failed?: boolean;
		onStep?: (delta: number) => void;
		onRemove?: () => void;
	} = $props();

	const spec = $derived(BLOCKS[type]);
	const Icon = $derived(BLOCK_ICONS[type]);
	const tabX = $derived(clamp ? 'calc(var(--arm) + var(--notch-x))' : undefined);
	// Buttons inside a tile must not start a drag.
	const keep = (e: PointerEvent) => e.stopPropagation();
</script>

<!-- The wrapper carries the colour and the shadow; the tile itself is masked for the notch. -->
<div class="relative drop-shadow-md" style:--blk={blockColor(type)} style:--tab-x={tabX}>
	<div
		class={cn(
			'puzzle flex min-h-14 items-center gap-3 rounded-2xl bg-(--blk) px-3 pt-2 pb-1 text-lg font-semibold text-white transition-transform duration-200',
			clamp && 'rounded-bl-none',
			active && 'scale-[1.03] ring-4 ring-white ring-inset',
			failed && 'shake ring-4 ring-destructive ring-inset'
		)}
	>
		<span class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/20">
			<Icon class="size-6" />
		</span>
		<span class="min-w-0 grow truncate">{t.blocks[type]}</span>
		{#if spec.param && n !== undefined}
			{#if onStep}
				<div class="flex shrink-0 items-center gap-1">
					<button
						class="grid size-14 shrink-0 press place-items-center rounded-xl bg-white/20 disabled:opacity-40"
						aria-label={t.workspace.less}
						onpointerdown={keep}
						onclick={() => onStep(-1)}
						disabled={n <= spec.param.min}><Minus class="size-5" /></button
					>
					<span class="w-8 text-center text-2xl tabular-nums">{n}</span>
					<button
						class="grid size-14 shrink-0 press place-items-center rounded-xl bg-white/20 disabled:opacity-40"
						aria-label={t.workspace.more}
						onpointerdown={keep}
						onclick={() => onStep(1)}
						disabled={n >= spec.param.max}><Plus class="size-5" /></button
					>
				</div>
			{:else if round !== undefined}
				<!-- Re-created each round, so the squish plays every time the loop starts over. -->
				{#key round}
					<span class="land rounded-lg bg-white px-2 text-2xl text-(--blk) tabular-nums"
						>{round}/{n}</span
					>
				{/key}
			{:else}
				<span class="rounded-lg bg-white/20 px-2 text-2xl tabular-nums">{n}</span>
			{/if}
		{/if}
		{#if onRemove}
			<button
				class="grid size-14 shrink-0 press place-items-center rounded-xl text-white/80"
				aria-label={t.workspace.remove}
				onpointerdown={keep}
				onclick={onRemove}><X class="size-5" /></button
			>
		{/if}
	</div>
	<span class="puzzle-tab"></span>
</div>
