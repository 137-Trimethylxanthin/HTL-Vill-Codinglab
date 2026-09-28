<script lang="ts">
	import { ChevronRight, Map as MapIcon, Star } from '@lucide/svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from '$lib/i18n/de';
	import type { MissionResult } from '$lib/session/types';
	import { cn } from '$lib/utils';
	import Confetti from '$lib/workspace/Confetti.svelte';

	let {
		result,
		promo,
		hasNext,
		onNext,
		onMap
	}: {
		result: MissionResult;
		promo: string | null;
		hasNext: boolean;
		onNext: () => void;
		onMap: () => void;
	} = $props();

	const praise = $derived(
		result.stars === 3
			? t.complete.perfect
			: result.stars === 2
				? t.complete.great
				: t.complete.done
	);
</script>

<main
	class="relative flex h-full flex-col items-center justify-center gap-8 overflow-hidden bg-sky p-8 text-center"
>
	<h1 class="text-7xl font-bold">{praise}</h1>
	<div class="flex gap-4">
		{#each [1, 2, 3] as i (i)}
			<span class="star-pop" style:animation-delay="{i * 200}ms">
				<Star
					class={cn(
						'size-24',
						i <= result.stars ? 'fill-yellow-300 text-yellow-400' : 'text-muted-foreground/30'
					)}
				/>
			</span>
		{/each}
	</div>
	{#if promo}
		<div class="max-w-2xl rounded-3xl bg-htl px-8 py-6 text-2xl font-bold text-white shadow-xl">
			<p class="mb-2 text-lg uppercase opacity-80">{t.complete.promoTitle}</p>
			{promo}
		</div>
	{/if}
	<div class="flex flex-wrap justify-center gap-4">
		<Button variant="secondary" class="h-16 press rounded-2xl px-8 text-xl" onclick={onMap}
			><MapIcon class="size-6" />{t.complete.map}</Button
		>
		{#if hasNext}
			<Button
				class="h-16 press rounded-2xl bg-drone px-10 text-2xl font-bold text-drone-foreground"
				onclick={onNext}>{t.complete.next}<ChevronRight class="size-7" /></Button
			>
		{/if}
	</div>
	{#if !prefersReducedMotion.current}
		<Confetti />
	{/if}
</main>
