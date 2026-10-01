<script lang="ts">
	import { Star, Trophy } from '@lucide/svelte';
	import { onDestroy, onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import type { SessionRecord } from '$lib/history/types';
	import { leaderboard } from '$lib/history/stats';
	import { t } from '$lib/i18n/de';
	import type { Mission } from '$lib/missions/schema';
	import type { Platform } from '$lib/platform/types';
	import FlightReplay from '$lib/replay/FlightReplay.svelte';
	import { cn } from '$lib/utils';
	import { exampleFlights, pickFlights, solvedToday } from './wall';

	let {
		platform,
		missions,
		event,
		onAdmin
	}: { platform: Platform; missions: Mission[]; event: string; onAdmin: () => void } = $props();

	const REFRESH_MS = 20_000;
	const CYCLE_MS = 8_000;
	const TOP = 10;

	let records = $state<SessionRecord[]>([]);
	let now = $state(new Date());
	let index = $state(0);

	const board = $derived(leaderboard(records, { period: 'today', now, event }).slice(0, TOP));
	const count = $derived(solvedToday(records, now));
	// Names appear only where the leaderboard shows them anyway.
	const live = $derived(pickFlights(records, now, new Set(board.map((e) => e.id))));
	const examples = $derived(exampleFlights(missions));
	const flights = $derived(live.length > 0 ? live : examples);
	const flight = $derived(flights.length > 0 ? flights[index % flights.length] : null);
	const mission = $derived(flight ? missions.find((m) => m.id === flight.missionId) : undefined);

	async function refresh() {
		records = await platform.listRecords().catch(() => records);
		now = new Date();
	}

	let refreshTimer: ReturnType<typeof setInterval> | undefined;
	let cycleTimer: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		void refresh();
		refreshTimer = setInterval(refresh, REFRESH_MS);
		cycleTimer = setInterval(() => (index += 1), CYCLE_MS);
	});

	onDestroy(() => {
		clearInterval(refreshTimer);
		clearInterval(cycleTimer);
	});

	// Operator entrance like on the attract screen: hold the title for 3 s.
	let holdTimer: ReturnType<typeof setTimeout> | undefined;
	function holdStart() {
		clearTimeout(holdTimer);
		holdTimer = setTimeout(onAdmin, 3000);
	}
	function holdEnd() {
		clearTimeout(holdTimer);
	}
</script>

<main
	class="grid h-full grid-cols-[1.4fr_1fr] grid-rows-[auto_minmax(0,1fr)] gap-6 bg-sky p-8 portrait:grid-cols-1 portrait:grid-rows-[auto_minmax(0,1fr)_auto]"
>
	<header class="col-span-full flex flex-wrap items-end gap-6 portrait:col-span-1">
		<div class="min-w-0 grow">
			<h1
				class="w-fit text-6xl font-bold portrait:text-5xl"
				onpointerdown={holdStart}
				onpointerup={holdEnd}
				onpointerleave={holdEnd}
				onpointercancel={holdEnd}
			>
				{t.wall.title}
			</h1>
			<p class="mt-2 text-2xl text-muted-foreground">{t.wall.subtitle}</p>
		</div>
		<div class="rounded-3xl bg-card px-8 py-4 text-center shadow-md">
			<p class="font-display text-6xl font-bold text-drone" data-testid="wall-count">{count}</p>
			<p class="text-xl">{t.wall.today}</p>
		</div>
	</header>

	<section class="flex min-h-0 flex-col gap-4 rounded-3xl bg-card p-6 shadow-lg">
		<h2 class="text-3xl font-bold">{live.length > 0 ? t.wall.flight : t.wall.example}</h2>
		{#if flight && mission}
			{#key flight.key + index}
				<div
					class="flex min-h-0 grow flex-col gap-3"
					in:fade={{ duration: prefersReducedMotion.current ? 0 : 300 }}
				>
					<div class="flex flex-wrap items-center gap-4">
						<span
							class="grid size-14 shrink-0 place-items-center rounded-full bg-drone font-display text-2xl font-bold text-drone-foreground"
							>{mission.id}</span
						>
						<span class="min-w-0 grow truncate font-display text-3xl font-bold"
							>{mission.title}</span
						>
						<span class="flex shrink-0">
							{#each [1, 2, 3] as i (i)}
								<Star
									class={cn(
										'size-9',
										i <= flight.stars
											? 'fill-yellow-300 text-yellow-400'
											: 'text-muted-foreground/40'
									)}
								/>
							{/each}
						</span>
					</div>
					<div class="min-h-0 grow">
						<FlightReplay {mission} path={flight.path} ms={CYCLE_MS - 2000} />
					</div>
					{#if flight.pilotName}
						<p class="text-center text-2xl font-bold">{t.wall.by(flight.pilotName)}</p>
					{/if}
				</div>
			{/key}
		{/if}
	</section>

	<section class="flex min-h-0 flex-col gap-3 overflow-hidden rounded-3xl bg-card/80 p-6">
		<h2 class="flex items-center gap-3 text-3xl font-bold">
			<Trophy class="size-9 text-yellow-500" />{t.leaderboard.title}
		</h2>
		{#if board.length === 0}
			<p class="text-xl">{t.wall.empty}</p>
		{/if}
		<ol class="flex flex-col gap-2">
			{#each board as e, i (e.id)}
				<li class="flex min-h-12 items-center gap-4 rounded-2xl bg-muted px-4 text-xl">
					<span class="w-8 font-display text-2xl font-bold">{i + 1}</span>
					<span class="min-w-0 grow truncate font-bold">{e.pilotName}</span>
					<span class="flex items-center gap-1 font-bold"
						><Star class="size-6 fill-yellow-300 text-yellow-400" />{e.totalStars}</span
					>
				</li>
			{/each}
		</ol>
	</section>
</main>
