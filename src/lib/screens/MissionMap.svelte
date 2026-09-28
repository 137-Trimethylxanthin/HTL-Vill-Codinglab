<script lang="ts">
	import { Flag, Star } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from '$lib/i18n/de';
	import type { Session } from '$lib/session/session.svelte';
	import { cn } from '$lib/utils';

	let {
		session,
		onOpen,
		onFinish
	}: { session: Session; onOpen: (id: string) => void; onFinish: () => void } = $props();

	const levels = $derived(
		[1, 2, 3].map((level) => ({
			level,
			missions: session.missions.filter((m) => m.level === level)
		}))
	);
</script>

<main class="flex h-full flex-col gap-6 bg-sky p-6">
	<header class="flex flex-wrap items-center gap-4 rounded-3xl bg-card px-6 py-4 shadow-sm">
		<div class="min-w-0 grow">
			<p class="text-lg text-muted-foreground">{t.map.pilot}</p>
			<h1 class="truncate text-4xl font-bold">{session.pilotName}</h1>
		</div>
		<span class="flex items-center gap-2 font-display text-3xl font-bold">
			<Star class="size-9 fill-yellow-300 text-yellow-400" />{session.totalStars} / {session.maxStars}
		</span>
		<Button
			class="h-16 press rounded-2xl bg-htl px-8 text-2xl font-bold text-white"
			disabled={!session.canFinish}
			onclick={onFinish}><Flag class="size-7" />{t.map.finish}</Button
		>
	</header>
	<div class="grid min-h-0 grow grid-cols-3 gap-6 overflow-y-auto portrait:grid-cols-1">
		{#each levels as group (group.level)}
			<section class="flex flex-col gap-4 rounded-3xl bg-card/70 p-5">
				<h2 class="text-2xl font-bold">{t.map.levels[group.level - 1]}</h2>
				{#each group.missions as m (m.id)}
					{@const result = session.results[m.id]}
					<button
						class={cn(
							'flex min-h-20 press items-center gap-4 rounded-2xl bg-card p-4 text-left shadow-md',
							session.recommended === m.id && 'ring-4 ring-drone'
						)}
						onclick={() => onOpen(m.id)}
					>
						<span
							class={cn(
								'grid size-14 shrink-0 place-items-center rounded-full bg-drone font-display text-2xl font-bold text-drone-foreground',
								session.recommended === m.id && 'breathe'
							)}>{m.id}</span
						>
						<span class="min-w-0 grow truncate font-display text-2xl font-bold">{m.title}</span>
						<span class="flex shrink-0">
							{#each [1, 2, 3] as i (i)}
								<Star
									class={cn(
										'size-7',
										result && !result.skipped && i <= result.stars
											? 'fill-yellow-300 text-yellow-400'
											: 'text-muted-foreground/40'
									)}
								/>
							{/each}
						</span>
					</button>
				{/each}
			</section>
		{/each}
	</div>
</main>
