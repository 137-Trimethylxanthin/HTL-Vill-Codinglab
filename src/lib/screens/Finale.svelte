<script lang="ts">
	import { FileDown, Mail, RotateCcw, Star, Trophy } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Button } from '$lib/components/ui/button/index.js';
	import { HTL_URL } from '$lib/config/defaults';
	import { t } from '$lib/i18n/de';
	import { toRecord } from '$lib/history/record';
	import { leaderboard as rank, type LeaderboardEntry } from '$lib/history/stats';
	import { certificateData } from '$lib/platform/data';
	import { PlatformError, type Platform, type PublicConfig } from '$lib/platform/types';
	import { encodeVisit, visitOf } from '$lib/replay/codec';
	import { qrDataUrl } from '$lib/session/qr';
	import type { Session } from '$lib/session/session.svelte';
	import Confetti from '$lib/workspace/Confetti.svelte';
	import EmailDialog from './EmailDialog.svelte';
	import Leaderboard from './Leaderboard.svelte';
	import { solvedToday } from './wall';
	import PathThumbnail from './PathThumbnail.svelte';

	let {
		session,
		platform,
		config,
		onDone
	}: { session: Session; platform: Platform; config: PublicConfig; onDone: () => void } = $props();

	let qr = $state('');
	/** Take-home replay of this visit's flights (only when the admin set a replay address). */
	let replayQr = $state('');
	const last = $derived(
		Object.values(session.results)
			.filter((r) => !r.skipped && r.stars > 0)
			.at(-1)
	);
	const lastMission = $derived(last ? session.missions.find((m) => m.id === last.id) : undefined);

	let notice = $state<string | null>(null);
	let emailOpen = $state(false);
	let emailBusy = $state(false);
	let emailError = $state<string | null>(null);
	const data = () => certificateData(session, config.qrUrl || HTL_URL, new Date());

	// A double tap must not save two PDFs.
	let certBusy = $state(false);

	async function saveCertificate() {
		if (certBusy) return;
		certBusy = true;
		notice = null;
		try {
			const path = await platform.saveCertificate(data());
			if (path) notice = t.certificate.saved;
		} catch {
			notice = t.certificate.failed;
		} finally {
			certBusy = false;
		}
	}

	async function sendEmail(email: string, consent: boolean) {
		// The keyboard's "Fertig" key and Enter can fire again while a send is running.
		if (emailBusy) return;
		emailBusy = true;
		emailError = null;
		try {
			await platform.sendCertificate(email, consent, data());
			emailOpen = false;
			notice = t.email.sent;
		} catch (e) {
			emailError =
				e instanceof PlatformError && e.code === 'invalidEmail' ? t.email.invalid : t.email.failed;
		}
		emailBusy = false;
	}

	let board = $state<LeaderboardEntry[] | null>(null);
	let flownToday = $state(0);

	async function openBoard() {
		const records = await platform.listRecords().catch(() => []);
		const preview = toRecord(
			{
				pilotName: session.pilotName,
				startedAt: session.startedAtMs || Date.now() - 1,
				finishedAt: Date.now(),
				endedBy: 'finale',
				totalStars: session.totalStars,
				results: Object.values(session.results)
			},
			config,
			'current'
		);
		const now = new Date();
		board = rank([...records, preview], { period: 'today', now, event: config.eventCode });
		// Same count as the wall display: every visitor today, named or not.
		flownToday = solvedToday([...records, preview], now);
	}

	onMount(() => {
		qrDataUrl(config.qrUrl || HTL_URL).then(
			(url) => (qr = url),
			() => (qr = '')
		);
		const visit = visitOf(
			Object.values(session.results),
			config.qrUrl && config.qrUrl !== HTL_URL ? config.qrUrl : null
		);
		if (config.replayUrl && visit.flights.length > 0) {
			encodeVisit(visit)
				// low error correction: fewer, larger modules for phone cameras
				.then((code) =>
					QRCode.toDataURL(`${config.replayUrl}#${code}`, {
						margin: 1,
						width: 512,
						errorCorrectionLevel: 'L',
						color: { dark: '#0f172a', light: '#ffffff' }
					})
				)
				.then(
					(url) => (replayQr = url),
					() => (replayQr = '')
				);
		}
	});
</script>

<main
	class="grid h-full grid-cols-[1.2fr_1fr] gap-6 overflow-y-auto bg-sky p-8 portrait:grid-cols-1 portrait:grid-rows-[auto_auto] portrait:p-4"
>
	<section
		class="relative flex flex-col items-center justify-center gap-6 overflow-hidden rounded-3xl bg-card p-8 text-center shadow-lg portrait:min-h-max portrait:p-5"
	>
		<h1 class="text-6xl font-bold break-words portrait:text-4xl">
			{t.finale.title(session.pilotName)}
		</h1>
		<p class="flex items-center gap-3 font-display text-5xl font-bold">
			<Star class="size-14 fill-yellow-300 text-yellow-400" />{session.totalStars} / {session.maxStars}
		</p>
		{#if last && lastMission}
			<div class="h-56 w-full max-w-md">
				<PathThumbnail mission={lastMission} path={last.path} />
			</div>
		{/if}
		<p class="text-2xl">{t.finale.solved(session.solvedCount)}</p>
		{#if !prefersReducedMotion.current}
			<Confetti />
		{/if}
	</section>
	<section
		class="flex flex-col items-center justify-center gap-6 rounded-3xl bg-card/70 p-8 text-center"
	>
		<div class="flex flex-wrap items-start justify-center gap-6">
			{#if replayQr}
				<div class="flex max-w-64 flex-col items-center gap-3">
					<h2 class="text-3xl font-bold">{t.replay.qrTitle}</h2>
					<div class="grid size-64 place-items-center rounded-2xl bg-white p-3 shadow-md">
						<img src={replayQr} alt={t.replay.qrTitle} class="size-full" />
					</div>
				</div>
			{/if}
			<div class="flex max-w-64 flex-col items-center gap-3">
				<h2 class="text-3xl font-bold">{t.finale.qrTitle}</h2>
				<div class="grid size-64 place-items-center rounded-2xl bg-white p-3 shadow-md">
					{#if qr}<img src={qr} alt={config.qrUrl || HTL_URL} class="size-full" />{:else}<p
							class="text-center font-mono text-lg break-all"
						>
							{config.qrUrl || HTL_URL}
						</p>{/if}
				</div>
			</div>
		</div>
		<p class="text-xl text-muted-foreground">{t.finale.qrHint}</p>
		<div class="flex flex-wrap justify-center gap-3">
			<Button variant="secondary" class="h-16 press rounded-2xl px-6 text-xl" onclick={openBoard}
				><Trophy class="size-6" />{t.leaderboard.button}</Button
			>
			{#if platform.features.certificate}
				<Button
					variant="secondary"
					class="h-16 press rounded-2xl px-6 text-xl"
					disabled={certBusy}
					onclick={saveCertificate}><FileDown class="size-6" />{t.certificate.button}</Button
				>
			{/if}
			{#if platform.features.email && config.smtpReady}
				<Button
					variant="secondary"
					class="h-16 press rounded-2xl px-6 text-xl"
					onclick={() => (emailOpen = true)}><Mail class="size-6" />{t.email.button}</Button
				>
			{/if}
		</div>
		{#if notice}<p class="text-xl font-bold">{notice}</p>{/if}
		<Button
			class="h-20 press rounded-3xl bg-drone px-12 font-display text-3xl font-bold text-drone-foreground"
			onclick={onDone}><RotateCcw class="size-8" />{t.finale.again}</Button
		>
	</section>
</main>

{#if emailOpen}
	<EmailDialog
		busy={emailBusy}
		error={emailError}
		onSend={sendEmail}
		onCancel={() => (emailOpen = false)}
	/>
{/if}

{#if board}
	<Leaderboard entries={board} ownId="current" flown={flownToday} onClose={() => (board = null)} />
{/if}
