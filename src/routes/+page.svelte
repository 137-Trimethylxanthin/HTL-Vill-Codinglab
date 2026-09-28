<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import AdminScreen from '$lib/admin/AdminScreen.svelte';
	import { configKey, StationStore } from '$lib/config/station.svelte';
	import { toRecord } from '$lib/history/record';
	import { t } from '$lib/i18n/de';
	import { SHOWCASE } from '$lib/missions';
	import { getPlatform } from '$lib/platform';
	import { missionsFor } from '$lib/platform/data';
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
	import type { SessionSummary } from '$lib/session/types';
	import { cn } from '$lib/utils';
	import MissionWorkspace from '$lib/workspace/MissionWorkspace.svelte';

	const platform = getPlatform();
	const station = new StationStore();
	let session = $state(new Session(SHOWCASE));
	/** Every visit becomes a record, also abandoned ones (spec 4.6). */
	function store(summary: SessionSummary | null) {
		if (summary) void platform.saveSession(toRecord(summary, station.config)).catch(() => {});
	}
	const idle = new IdleTimer(() => store(session.timeout()));
	const demo = SHOWCASE.find((m) => m.id === '2.1') ?? SHOWCASE[0];

	let runner = $state<PythonRunner | null>(null);
	let phase = $state<'loading' | 'ready' | 'failed'>('loading');
	let adminOpen = $state(false);

	/** Settings changed (or first loaded): new idle time, mission selection, fresh session. */
	let lastConfig = '';

	function applyConfig() {
		idle.setIdleMs(station.config.idleSeconds * 1000);
		store(session.reset('quit'));
		session = new Session(missionsFor(SHOWCASE, station.config.enabledMissions));
		lastConfig = configKey(station.config);
	}

	onMount(() => {
		const created = new PythonRunner();
		runner = created;
		created.ready().then(
			() => (phase = 'ready'),
			() => (phase = 'failed')
		);
		station.load(platform).then(() => {
			applyConfig();
			if (!station.config.hasPin) adminOpen = true;
		});
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

	// The idle timer runs on every screen except the attract loop, and never during admin.
	$effect(() => {
		if (adminOpen || session.screen === 'attract') idle.stop();
		else idle.start();
	});

	const promo = $derived.by(() => {
		const r = session.lastResult;
		const level = session.current?.level;
		return r && level && session.isLastOfLevel(r.id) ? t.complete.promo[level - 1] : null;
	});

	function onKey(e: KeyboardEvent) {
		idle.activity();
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
			e.preventDefault();
			adminOpen = true;
		}
	}
</script>

<svelte:window onpointerdown={() => idle.activity()} onkeydown={onKey} />

<div class="contents" inert={settling || adminOpen}>
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
		<Attract {demo} onStart={() => session.begin()} onAdmin={() => (adminOpen = true)} />
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
		<Finale
			{session}
			{platform}
			config={station.config}
			onDone={() => store(session.reset('finale'))}
		/>
	{/if}
</div>

{#if idle.warning}
	<IdleOverlay remaining={idle.remaining} onContinue={() => idle.activity()} />
{/if}

{#if adminOpen}
	<AdminScreen
		{platform}
		store={station}
		missions={SHOWCASE}
		onClose={() => {
			adminOpen = false;
			// Only a real settings change resets the visitor.
			if (configKey(station.config) !== lastConfig) applyConfig();
		}}
	/>
{/if}
