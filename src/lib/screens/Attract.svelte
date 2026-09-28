<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { t } from '$lib/i18n/de';
	import type { Mission } from '$lib/missions/schema';
	import { demoEvents } from '$lib/session/demo';
	import DroneStage from '$lib/stage/DroneStage.svelte';
	import { Player } from '$lib/stage/player.svelte';
	import { buildTimeline, startPose } from '$lib/stage/timeline';

	let { demo, onStart, onAdmin }: { demo: Mission; onStart: () => void; onAdmin: () => void } =
		$props();

	// Operator entrance: hold the school name for 3 s (touch kiosks have no keyboard).
	let holdTimer: ReturnType<typeof setTimeout> | undefined;
	let held = false;
	function holdStart(e: PointerEvent) {
		e.stopPropagation();
		held = false;
		clearTimeout(holdTimer);
		holdTimer = setTimeout(() => {
			held = true;
			onAdmin();
		}, 3000);
	}
	function holdEnd() {
		clearTimeout(holdTimer);
	}

	const player = new Player();
	let alive = true;
	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	async function loop(mission: Mission) {
		const frames = buildTimeline(mission.map.start, demoEvents(mission));
		while (alive) {
			player.reset(startPose(mission.map.start), mission.map.rows);
			if (prefersReducedMotion.current) return;
			await wait(800);
			if (!alive) return;
			await player.play(frames);
			await wait(1500);
		}
	}

	onMount(() => {
		void loop(demo);
	});

	onDestroy(() => {
		alive = false;
		player.stop();
	});
</script>

<button
	class="grid h-full w-full grid-rows-[auto_minmax(0,1fr)_auto] items-center gap-6 bg-sky p-8 text-center"
	onclick={onStart}
>
	<div>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
		<p
			class="mx-auto w-fit p-3 text-xl font-bold tracking-widest text-htl uppercase"
			onpointerdown={holdStart}
			onpointerup={holdEnd}
			onpointerleave={holdEnd}
			onclick={(e) => {
				if (held) e.stopPropagation();
			}}
		>
			{t.attract.school}
		</p>
		<h1 class="text-6xl font-bold portrait:text-5xl">{t.attract.title}</h1>
		<p class="mt-2 text-2xl text-muted-foreground">{t.attract.subtitle}</p>
	</div>
	<div class="mx-auto h-full min-h-0 w-full max-w-2xl">
		<DroneStage {player} />
	</div>
	<span
		class="breathe mx-auto rounded-full bg-drone px-12 py-5 font-display text-4xl font-bold text-drone-foreground shadow-xl"
		>{t.attract.tap}</span
	>
</button>
