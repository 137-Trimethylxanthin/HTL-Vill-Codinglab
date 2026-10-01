<script lang="ts">
	import { ExternalLink, RotateCcw, Star } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { HTL_URL } from '$lib/config/defaults';
	import { t } from '$lib/i18n/de';
	import { SHOWCASE } from '$lib/missions';
	import { decodeVisit, onMaps, type Visit } from '$lib/replay/codec';
	import FlightReplay from '$lib/replay/FlightReplay.svelte';
	import { cn } from '$lib/utils';

	const BIBER_URL = 'https://wettbewerb.biber.ocg.at/';

	let visit = $state<Visit | null>(null);
	let loaded = $state(false);
	/** Bumped by the replay button: redraws every flight. */
	let round = $state(0);

	const flights = $derived(visit ? onMaps(visit.flights, SHOWCASE) : []);
	const stars = $derived(flights.reduce((sum, f) => sum + f.flight.stars, 0));
	const school = $derived(visit?.link ?? HTL_URL);

	async function load() {
		visit = await decodeVisit(location.hash);
		loaded = true;
	}

	onMount(() => {
		void load();
		window.addEventListener('hashchange', load);
		return () => window.removeEventListener('hashchange', load);
	});
</script>

<svelte:head><title>{t.replay.title}</title></svelte:head>

<main class="h-full overflow-y-auto bg-sky">
	<div class="mx-auto flex max-w-3xl flex-col gap-6 p-4 pb-12 select-text sm:p-8">
		<header class="flex flex-col gap-2 rounded-3xl bg-card p-6 text-center shadow-md">
			<h1 class="text-4xl font-bold sm:text-5xl">{t.replay.title}</h1>
			{#if flights.length > 0}
				<p class="text-xl text-muted-foreground">{t.replay.subtitle}</p>
				<p class="flex items-center justify-center gap-2 font-display text-3xl font-bold">
					<Star class="size-9 fill-yellow-300 text-yellow-400" />{stars}
				</p>
			{/if}
		</header>

		{#if !loaded}
			<p class="text-center text-xl">{t.replay.loading}</p>
		{:else if flights.length === 0}
			<p class="rounded-3xl bg-card p-6 text-center text-xl shadow-md" data-testid="replay-missing">
				{t.replay.missing}
			</p>
		{:else}
			{#each flights as { mission, flight } (mission.id)}
				<section class="flex flex-col gap-3 rounded-3xl bg-card p-5 shadow-md">
					<div class="flex items-center gap-3">
						<span
							class="grid size-12 shrink-0 place-items-center rounded-full bg-drone font-display text-xl font-bold text-drone-foreground"
							>{mission.id}</span
						>
						<h2 class="min-w-0 grow truncate text-2xl font-bold">{mission.title}</h2>
						<span class="flex shrink-0">
							{#each [1, 2, 3] as i (i)}
								<Star
									class={cn(
										'size-7',
										i <= flight.stars
											? 'fill-yellow-300 text-yellow-400'
											: 'text-muted-foreground/40'
									)}
								/>
							{/each}
						</span>
					</div>
					<div class="aspect-[4/3] max-h-80 w-full">
						{#key round}
							<FlightReplay {mission} path={flight.path} ms={4000} />
						{/key}
					</div>
				</section>
			{/each}
			<button
				class="mx-auto flex h-14 press items-center gap-2 rounded-2xl bg-drone px-6 text-xl font-bold text-drone-foreground"
				onclick={() => (round += 1)}><RotateCcw class="size-6" />{t.replay.replay}</button
			>
		{/if}

		<section class="flex flex-col gap-3 rounded-3xl bg-card p-6 shadow-md">
			<h2 class="text-3xl font-bold">{t.replay.home}</h2>
			<a
				class="flex min-h-14 items-center gap-3 rounded-2xl bg-muted px-4 text-xl font-bold underline-offset-4 hover:underline"
				href={BIBER_URL}
				rel="noopener noreferrer"
				target="_blank"><ExternalLink class="size-6 shrink-0" />{t.replay.biber}</a
			>
			<!-- eslint-disable svelte/no-navigation-without-resolve -- external school site -->
			<a
				class="flex min-h-14 items-center gap-3 rounded-2xl bg-muted px-4 text-xl font-bold underline-offset-4 hover:underline"
				href={school}
				rel="noopener noreferrer"
				target="_blank"><ExternalLink class="size-6 shrink-0" />{t.replay.school}</a
			>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		</section>
	</div>
</main>
