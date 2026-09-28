<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { t } from '$lib/i18n/de';
	import { SHOWCASE } from '$lib/missions';
	import { PythonRunner } from '$lib/runtime/client';
	import Attract from '$lib/screens/Attract.svelte';
	import Finale from '$lib/screens/Finale.svelte';
	import IdleOverlay from '$lib/screens/IdleOverlay.svelte';
	import MissionComplete from '$lib/screens/MissionComplete.svelte';
	import MissionMap from '$lib/screens/MissionMap.svelte';
	import Pilot from '$lib/screens/Pilot.svelte';
	import { IdleTimer } from '$lib/session/idle.svelte';
	import { installKioskGuards } from '$lib/session/kiosk';
	import { Session } from '$lib/session/session.svelte';
	import { cn } from '$lib/utils';
	import MissionWorkspace from '$lib/workspace/MissionWorkspace.svelte';

	const session = new Session(SHOWCASE);
	const idle = new IdleTimer(() => session.timeout());
	const demo = SHOWCASE.find((m) => m.id === '2.1') ?? SHOWCASE[0];

	let runner = $state<PythonRunner | null>(null);
	let phase = $state<'loading' | 'ready' | 'failed'>('loading');

	onMount(() => {
		const created = new PythonRunner();
		runner = created;
		created.ready().then(
			() => (phase = 'ready'),
			() => (phase = 'failed')
		);
		return installKioskGuards(window, import.meta.env.DEV);
	});

	onDestroy(() => {
		runner?.dispose();
		idle.stop();
	});

	// After every screen change, ignore input briefly: the second tap of a double tap
	// would otherwise hit whatever button now sits under the finger.
	const SETTLE_MS = 350;
	let settling = $state(false);
	$effect(() => {
		void session.screen;
		settling = true;
		const timer = setTimeout(() => (settling = false), SETTLE_MS);
		return () => clearTimeout(timer);
	});

	// The idle timer runs on every screen except the attract loop.
	$effect(() => {
		if (session.screen === 'attract') idle.stop();
		else idle.start();
	});

	const promo = $derived.by(() => {
		const r = session.lastResult;
		const level = session.current?.level;
		return r && level && session.isLastOfLevel(r.id) ? t.complete.promo[level - 1] : null;
	});
</script>

<svelte:window onpointerdown={() => idle.activity()} onkeydown={() => idle.activity()} />

<div class="contents" inert={settling}>
	{#if phase !== 'ready' || !runner}
		<main class="grid h-full place-items-center bg-sky">
			<p
				class={cn(
					'font-display text-3xl font-bold',
					phase === 'failed' ? 'text-destructive' : 'animate-pulse'
				)}
			>
				{phase === 'failed' ? t.app.loadFailed : t.app.loading}
			</p>
		</main>
	{:else if session.screen === 'attract'}
		<Attract {demo} onStart={() => session.begin()} />
	{:else if session.screen === 'pilot'}
		<Pilot onDone={(name) => session.setPilot(name)} />
	{:else if session.screen === 'map'}
		<MissionMap {session} onOpen={(id) => session.open(id)} onFinish={() => session.finish()} />
	{:else if session.screen === 'mission' && session.current}
		{#key session.current.id}
			<MissionWorkspace
				mission={session.current}
				{runner}
				onBack={() => session.backToMap()}
				onSkip={() => session.skip()}
				onSolved={(result) => session.record(result)}
				onDone={(result) => session.complete(result)}
			/>
		{/key}
	{:else if session.screen === 'complete' && session.lastResult}
		<MissionComplete
			result={session.lastResult}
			{promo}
			hasNext={session.nextAfter(session.currentId) !== null}
			onNext={() => session.continue()}
			onMap={() => session.backToMap()}
		/>
	{:else if session.screen === 'finale'}
		<Finale {session} onDone={() => session.reset('finale')} />
	{/if}
</div>

{#if idle.warning}
	<IdleOverlay remaining={idle.remaining} onContinue={() => idle.activity()} />
{/if}
