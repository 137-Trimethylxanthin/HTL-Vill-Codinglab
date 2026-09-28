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
</script>

<div
	class={cn(
		'flex min-h-14 items-center gap-3 rounded-2xl bg-card px-4 py-2 text-lg font-semibold shadow-md ring-2 ring-transparent transition-all duration-200',
		active && 'scale-[1.03] shadow-lg ring-drone'
	)}
>
	<span class="grid size-10 shrink-0 place-items-center rounded-xl bg-drone text-drone-foreground">
		<Icon class="size-6" />
	</span>
	<span class="grow">{t.blocks[type]}</span>
	{#if spec.param && n !== undefined}
		{#if onStep}
			<div class="flex items-center gap-1">
				<button
					class="grid size-11 place-items-center rounded-xl bg-muted active:scale-90"
					aria-label={t.workspace.less}
					onclick={() => onStep(-1)}
					disabled={n <= spec.param.min}><Minus class="size-5" /></button
				>
				<span class="w-8 text-center text-2xl tabular-nums">{n}</span>
				<button
					class="grid size-11 place-items-center rounded-xl bg-muted active:scale-90"
					aria-label={t.workspace.more}
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
			class="grid size-11 place-items-center rounded-xl text-muted-foreground active:scale-90"
			aria-label={t.workspace.remove}
			onclick={onRemove}><X class="size-5" /></button
		>
	{/if}
</div>
