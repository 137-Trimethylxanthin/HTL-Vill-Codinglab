<script lang="ts">
	import { setSoundEnabled, unlockSound } from '$lib/ui/sound';
	import { onDestroy, onMount } from 'svelte';
	import AdminScreen from '$lib/admin/AdminScreen.svelte';
	import SupervisorMenu from '$lib/admin/SupervisorMenu.svelte';
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
	import Splash from '$lib/screens/Splash.svelte';
	import Wall from '$lib/screens/Wall.svelte';
	import { IdleTimer } from '$lib/session/idle.svelte';
	import { installKioskGuards } from '$lib/session/kiosk';
	import { ORDERED_MAX_STARS, Session } from '$lib/session/session.svelte';
	import { seededRandom, shuffleBlocks } from '$lib/session/order';
	import { buildStatus, StatusPublisher } from '$lib/session/status';
	import type { SessionSummary } from '$lib/session/types';
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
	let supervisorOpen = $state(false);
	/** Start presses in the open mission, for the supervisor overview. */
	let runs = $state(0);
	/** Failed runs in a row in the open mission: the overview flags a stuck visitor. */
	let fails = $state(0);

	// Supervisors see every station's status on their phones (no visitor names).
	const publisher = new StatusPublisher((status) => platform.publishStatus(status));
	$effect(() => publisher.update(buildStatus(session, runs, fails)));

	/**
	 * A supervisor loaded the solution (or its blocks shuffled, to put in order): the workspace
	 * starts over with it as the program. Seeded by the press count, so each press reshuffles.
	 */
	const workspaceMission = $derived.by(() => {
		const m = session.current;
		if (m && session.isRevealed(m.id)) return { ...m, starter: m.solution };
		if (m && session.isOrdered(m.id))
			return { ...m, starter: shuffleBlocks(m.solution, seededRandom(session.revealTick)) };
		return m;
	});

	function activity() {
		idle.activity();
		publisher.activity();
	}

	$effect(() => setSoundEnabled(station.config.sound !== false));

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
		platform
			.init()
			.then(() => station.load(platform))
			.then(() => {
				applyConfig();
				if (!station.config.hasPin) adminOpen = true;
			});
		publisher.start();
		return installKioskGuards(window, import.meta.env.DEV);
	});

	onDestroy(() => {
		runner?.dispose();
		idle.stop();
		publisher.stop();
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
		if (adminOpen || supervisorOpen || station.config.wallMode || session.screen === 'attract')
			idle.stop();
		else idle.start();
	});

	const promo = $derived.by(() => {
		const r = session.lastResult;
		const level = session.current?.level;
		return r && level && session.isLastOfLevel(r.id) ? t.complete.promo[level - 1] : null;
	});

	function onKey(e: KeyboardEvent) {
		activity();
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
			e.preventDefault();
			adminOpen = true;
		}
		if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'h') {
			e.preventDefault();
			if (session.screen === 'mission' && !adminOpen) supervisorOpen = true;
		}
	}
</script>

<svelte:window
	onpointerdown={() => {
		activity();
		unlockSound();
	}}
	onkeydown={onKey}
/>

<div class="contents" inert={settling || adminOpen || supervisorOpen}>
	{#if station.config.wallMode}
		<!-- Wall display: only watching, no visitor flow. -->
		<Wall
			{platform}
			missions={SHOWCASE}
			event={station.config.eventCode}
			onAdmin={() => (adminOpen = true)}
		/>
	{:else if phase !== 'ready' || !runner}
		<Splash failed={phase === 'failed'} />
	{:else if session.screen === 'attract'}
		<Attract {demo} onStart={() => session.begin()} onAdmin={() => (adminOpen = true)} />
	{:else if session.screen === 'pilot'}
		<Pilot onDone={(name, duo) => session.setPilot(name, duo)} />
	{:else if session.screen === 'map'}
		<MissionMap {session} onOpen={(id) => session.open(id)} onFinish={() => session.finish()} />
	{:else if session.screen === 'mission' && workspaceMission}
		{#key `${workspaceMission.id}:${session.revealTick}`}
			<MissionWorkspace
				mission={workspaceMission}
				{runner}
				onBack={() => session.backToMap()}
				onSkip={() => session.skip()}
				onSolved={(result) => session.record(result)}
				onDone={(result) => session.complete(result)}
				onActivity={activity}
				help={session.help}
				onHelp={() => session.toggleHelp()}
				onSupervisor={() => (supervisorOpen = true)}
				onRuns={(n) => (runs = n)}
				onFails={(n) => (fails = n)}
				revealed={session.currentId !== null && session.isRevealed(session.currentId)}
				missions={session.missions}
				driver={session.driver}
				announceKey={`${session.startedAtMs}:${session.turns}`}
				maxStars={session.currentId !== null && session.isOrdered(session.currentId)
					? ORDERED_MAX_STARS
					: 3}
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

{#if supervisorOpen}
	<SupervisorMenu
		{platform}
		{session}
		onNextVisitor={() => store(session.reset(session.screen === 'finale' ? 'finale' : 'quit'))}
		onClose={() => (supervisorOpen = false)}
	/>
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
