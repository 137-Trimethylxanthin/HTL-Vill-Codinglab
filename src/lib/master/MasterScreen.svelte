<script lang="ts">
	import { MessageSquare, Pause, Play, RotateCcw, Settings, Upload } from '@lucide/svelte';
	import PinPad from '$lib/admin/PinPad.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { logbook } from '$lib/history/stats';
	import type { SessionRecord } from '$lib/history/types';
	import { t } from '$lib/i18n/de';
	import type { Mission } from '$lib/missions/schema';
	import type { FleetRow, Platform, PublicConfig, RemoteCommand } from '$lib/platform/types';
	import { solvedToday } from '$lib/screens/wall';
	import { cn } from '$lib/utils';
	import { expectedSeconds } from './pace';
	import StationTile from './StationTile.svelte';

	/** The master station: all stations live, bulk commands, today's numbers. */
	let {
		platform,
		config,
		missions,
		onAdmin
	}: {
		platform: Platform;
		config: PublicConfig;
		missions: Mission[];
		onAdmin: () => void;
	} = $props();

	const POLL_MS = 2_000;
	const RECORDS_MS = 20_000;
	/** The PIN is kept in memory for a while, so a busy supervisor types it once. */
	const PIN_TTL_MS = 3 * 60_000;

	let rows = $state<FleetRow[]>([]);
	let fetchedAt = $state(Date.now());
	let tick = $state(Date.now());
	let records = $state<SessionRecord[]>([]);
	let selected = $state<string[]>([]);
	let notice = $state<string | null>(null);
	let busy = $state(false);
	let confirmReset = $state(false);
	let messageText = $state('');
	let pin = '';
	let pinAt = 0;
	let asking = $state<RemoteCommand | null>(null);
	let entry = $state('');
	let pinError = $state<string | null>(null);

	// The master itself (address '') is not a station to steer.
	const stations = $derived(
		rows
			.filter((r) => r.address !== '')
			.toSorted((a, b) => a.stationName.localeCompare(b.stationName, 'de'))
	);
	const targets = $derived(selected.length ? selected : stations.map((s) => s.stationId));
	const today = $derived(
		logbook(
			records.filter((r) => new Date(r.finishedAt).toDateString() === new Date().toDateString())
		)
	);
	const hardest = $derived(today.dropOff.toSorted((a, b) => b.count - a.count)[0] ?? null);

	$effect(() => {
		let stop = false;
		// A slow network can make a poll outlast the interval: never overlap (an old answer
		// arriving late would overwrite a newer one).
		let inflight = false;
		const poll = async () => {
			if (inflight) return;
			inflight = true;
			try {
				const next = await platform.fleet();
				if (stop) return;
				rows = next;
				fetchedAt = Date.now();
			} catch {
				// keep the last picture; the next poll tries again
			} finally {
				inflight = false;
			}
		};
		const load = async () => {
			records = await platform.listRecords().catch(() => records);
		};
		void poll();
		void load();
		const polling = setInterval(poll, POLL_MS);
		const loading = setInterval(load, RECORDS_MS);
		const ticking = setInterval(() => (tick = Date.now()), 1_000);
		return () => {
			stop = true;
			clearInterval(polling);
			clearInterval(loading);
			clearInterval(ticking);
		};
	});

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
	}

	async function send(command: RemoteCommand) {
		// Always explicit station ids: an empty list must never reach the backend.
		if (targets.length === 0) return;
		if (!pin || Date.now() - pinAt > PIN_TTL_MS) {
			asking = command;
			return;
		}
		busy = true;
		try {
			const results = await platform.sendCommand(pin, targets, command);
			notice = t.leitstand.sentOk(results.filter((r) => r.ok).length, results.length);
		} catch (e) {
			notice = e instanceof Error ? e.message : String(e);
			// A wrong PIN: ask again next time.
			pin = '';
		} finally {
			busy = false;
		}
	}

	async function submitPin() {
		const command = asking;
		if (!command) return;
		if (!(await platform.verifyPin(entry).catch(() => false))) {
			pinError = t.admin.wrongPin;
			entry = '';
			return;
		}
		pin = entry;
		pinAt = Date.now();
		entry = '';
		pinError = null;
		asking = null;
		await send(command);
	}

	function reset() {
		if (!confirmReset) {
			confirmReset = true;
			setTimeout(() => (confirmReset = false), 3_000);
			return;
		}
		confirmReset = false;
		void send({ kind: 'reset' });
	}

	function pushSettings() {
		void send({
			kind: 'settings',
			settings: {
				idleSeconds: config.idleSeconds,
				sound: config.sound !== false,
				enabledMissions: config.enabledMissions
			}
		});
	}

	const missionOf = (id: string | null) => missions.find((m) => m.id === id) ?? null;
	const big = 'h-12 press rounded-xl px-3 text-base';
</script>

<main class="grid h-full grid-rows-[auto_minmax(0,1fr)_auto] gap-4 bg-sky p-4">
	<header class="flex items-center gap-4 rounded-3xl bg-card px-5 py-3 shadow-sm">
		<h1 class="text-3xl font-bold">{t.leitstand.title}</h1>
		<span class="text-lg text-muted-foreground">{config.stationName}</span>
		<span class="grow"></span>
		<Button
			variant="ghost"
			class={big}
			onclick={() => {
				pin = '';
				onAdmin();
			}}><Settings class="size-6" />{t.leitstand.admin}</Button
		>
	</header>

	<div class="grid min-h-0 grid-cols-[minmax(0,1fr)_18rem] gap-4">
		<section class="min-h-0 overflow-y-auto rounded-3xl bg-card/70 p-4">
			{#if stations.length === 0}
				<p class="p-6 text-center text-xl text-muted-foreground">{t.leitstand.noStations}</p>
			{:else}
				<div class="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-3">
					{#each stations as row (row.stationId)}
						{@const mission = missionOf(row.missionId)}
						<StationTile
							{row}
							{mission}
							expected={mission ? expectedSeconds(mission.id, records) : 180}
							now={tick - fetchedAt}
							selected={selected.includes(row.stationId)}
							onToggle={() => toggle(row.stationId)}
						/>
					{/each}
				</div>
			{/if}
		</section>

		<aside class="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-3xl bg-card/70 p-4">
			<h2 class="text-xl font-bold">{t.leitstand.stats}</h2>
			<p class="text-4xl font-bold text-drone">{solvedToday(records, new Date())}</p>
			<p class="-mt-2 text-muted-foreground">{t.leitstand.solved}</p>
			<p class="text-2xl font-bold">{today.visitors}</p>
			<p class="-mt-2 text-muted-foreground">{t.leitstand.visitors}</p>
			<ol class="flex flex-col gap-1 text-sm">
				{#each today.perMission as m (m.id)}
					<li class="flex justify-between gap-2 tabular-nums">
						<span class="font-semibold">{m.id}</span>
						<span>{m.solved}/{m.attempts} ✓</span>
						<span>{t.leitstand.avg} {Math.round(m.avgSeconds)} s</span>
					</li>
				{/each}
			</ol>
			{#if hardest}
				<p class="rounded-xl bg-orange-100 px-3 py-2 text-sm text-orange-900">
					{t.leitstand.hardest}: <b>{hardest.mission}</b> ({hardest.count})
				</p>
			{/if}
		</aside>
	</div>

	<footer class="flex flex-wrap items-center gap-2 rounded-3xl bg-card px-3 py-2 shadow-sm">
		<Button
			variant="secondary"
			class={big}
			onclick={() => (selected = stations.map((s) => s.stationId))}>{t.leitstand.all}</Button
		>
		<Button variant="secondary" class={big} onclick={() => (selected = [])}
			>{t.leitstand.none}</Button
		>
		<span class="px-1 text-muted-foreground">
			{selected.length ? t.leitstand.selected(selected.length) : t.leitstand.toAll}
		</span>
		<Button
			class={cn(big, 'bg-destructive text-white')}
			disabled={busy || !stations.length}
			onclick={reset}
			><RotateCcw class="size-6" />{confirmReset ? t.leitstand.confirm : t.leitstand.reset}</Button
		>
		<Button
			variant="secondary"
			class={big}
			disabled={busy || !stations.length}
			onclick={() => send({ kind: 'pause', on: true, text: messageText.trim() || undefined })}
			><Pause class="size-6" />{t.leitstand.pause}</Button
		>
		<Button
			variant="secondary"
			class={big}
			disabled={busy || !stations.length}
			onclick={() => send({ kind: 'pause', on: false })}
			><Play class="size-6" />{t.leitstand.resume}</Button
		>
		<Button
			variant="secondary"
			class={big}
			disabled={busy || !stations.length}
			onclick={() => send({ kind: 'endHelp' })}>{t.leitstand.endHelp}</Button
		>
		<Button
			variant="secondary"
			class={big}
			disabled={busy || !stations.length}
			onclick={() => send({ kind: 'showSolution' })}>{t.leitstand.showSolution}</Button
		>
		<Button
			variant="secondary"
			class={big}
			title={t.leitstand.pushHint}
			disabled={busy || !stations.length}
			onclick={pushSettings}><Upload class="size-6" />{t.leitstand.pushSettings}</Button
		>
		<div class="flex min-w-72 grow items-center gap-2">
			<input
				class="h-12 grow rounded-xl border bg-white px-3 text-base"
				maxlength="200"
				placeholder={t.leitstand.messagePlaceholder}
				bind:value={messageText}
			/>
			<Button
				class={big}
				disabled={busy || !stations.length || !messageText.trim()}
				onclick={() => send({ kind: 'message', text: messageText.trim() })}
				><MessageSquare class="size-6" />{t.leitstand.send}</Button
			>
		</div>
		{#if notice}<p class="w-full text-muted-foreground">{notice}</p>{/if}
	</footer>
</main>

{#if asking}
	<div class="fixed inset-0 z-50 grid place-items-center bg-black/40 p-6">
		<div class="flex flex-col items-center gap-4 rounded-3xl bg-card p-6 shadow-2xl">
			<PinPad
				value={entry}
				label={t.leitstand.pin}
				error={pinError}
				onChange={(v) => (entry = v)}
				onSubmit={submitPin}
			/>
			<Button variant="secondary" class={big} onclick={() => (asking = null)}
				>{t.supervisor.close}</Button
			>
		</div>
	</div>
{/if}
