<script lang="ts">
	import { Star, Trophy } from '@lucide/svelte';
	import { backOut } from 'svelte/easing';
	import { fade, scale } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { LeaderboardEntry } from '$lib/history/stats';
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';

	let {
		entries,
		ownId,
		onClose
	}: { entries: LeaderboardEntry[]; ownId: string; onClose: () => void } = $props();
</script>

<div class="fixed inset-0 z-40 grid place-items-center bg-slate-900/60 p-6" transition:fade>
	<div
		class="flex max-h-full w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-3xl bg-card p-6 shadow-2xl"
		in:scale={{ start: 0.85, duration: 350, easing: backOut }}
	>
		<h2 class="flex items-center gap-3 text-4xl font-bold">
			<Trophy class="size-10 text-yellow-500" />{t.leaderboard.title}
		</h2>
		{#if entries.length === 0}
			<p class="text-xl">{t.leaderboard.empty}</p>
		{/if}
		<ol class="flex flex-col gap-2">
			{#each entries as e, i (e.id)}
				{@const mine = e.id === ownId}
				<li
					class={cn(
						'flex min-h-14 items-center gap-4 rounded-2xl px-4 text-xl',
						mine ? 'bg-drone text-drone-foreground' : 'bg-muted'
					)}
				>
					<span class="w-8 font-display text-2xl font-bold">{i + 1}</span>
					<span class="min-w-0 grow truncate font-bold"
						>{e.pilotName}{mine ? ` (${t.leaderboard.you})` : ''}</span
					>
					<span class="flex items-center gap-1 font-bold"
						><Star class="size-6 fill-yellow-300 text-yellow-400" />{e.totalStars}</span
					>
					<span class="w-24 text-right text-base opacity-80"
						>{t.leaderboard.minutes(e.seconds)}</span
					>
				</li>
			{/each}
		</ol>
		<Button class="h-16 press rounded-2xl text-xl" onclick={onClose}>{t.leaderboard.close}</Button>
	</div>
</div>
