<script lang="ts">
	import { Minus, Plus, X } from '@lucide/svelte';
	import { BLOCKS } from '$lib/blocks/registry';
	import type { BlockType } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';
	import { BLOCK_ICONS } from './icons';

	let {
		type,
		n,
		active = false,
		onStep,
		onRemove
	}: {
		type: BlockType;
		n?: number;
		active?: boolean;
		onStep?: (delta: number) => void;
		onRemove?: () => void;
	} = $props();

	const spec = $derived(BLOCKS[type]);
	const Icon = $derived(BLOCK_ICONS[type]);
	// Buttons inside a tile must not start a drag.
	const keep = (e: PointerEvent) => e.stopPropagation();
</script>

<div
	class={cn(
		'flex min-h-14 items-center gap-3 rounded-2xl bg-card px-3 py-1.5 text-lg font-semibold shadow-md ring-2 ring-transparent transition-[box-shadow,transform] duration-200',
		active && 'scale-[1.03] shadow-lg ring-drone'
	)}
>
	<span
		class={cn(
			'grid size-10 shrink-0 place-items-center rounded-xl',
			spec.container ? 'bg-htl text-white' : 'bg-drone text-drone-foreground'
		)}
	>
		<Icon class="size-6" />
	</span>
	<span class="min-w-0 grow truncate">{t.blocks[type]}</span>
	{#if spec.param && n !== undefined}
		{#if onStep}
			<div class="flex shrink-0 items-center gap-1">
				<button
					class="grid size-14 shrink-0 press place-items-center rounded-xl bg-muted disabled:opacity-40"
					aria-label={t.workspace.less}
					onpointerdown={keep}
					onclick={() => onStep(-1)}
					disabled={n <= spec.param.min}><Minus class="size-5" /></button
				>
				<span class="w-8 text-center text-2xl tabular-nums">{n}</span>
				<button
					class="grid size-14 shrink-0 press place-items-center rounded-xl bg-muted disabled:opacity-40"
					aria-label={t.workspace.more}
					onpointerdown={keep}
					onclick={() => onStep(1)}
					disabled={n >= spec.param.max}><Plus class="size-5" /></button
				>
			</div>
		{:else}
			<span class="text-2xl text-muted-foreground tabular-nums">{n}</span>
		{/if}
	{/if}
	{#if onRemove}
		<button
			class="grid size-14 shrink-0 press place-items-center rounded-xl text-muted-foreground"
			aria-label={t.workspace.remove}
			onpointerdown={keep}
			onclick={onRemove}><X class="size-5" /></button
		>
	{/if}
</div>
