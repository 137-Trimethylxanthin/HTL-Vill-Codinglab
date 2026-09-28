<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { DEFAULT_PUBLIC_CONFIG, type StationStore } from '$lib/config/station.svelte';
	import { t } from '$lib/i18n/de';
	import type { Mission } from '$lib/missions/schema';
	import {
		editableOf,
		PlatformError,
		type EditableConfig,
		type Platform
	} from '$lib/platform/types';
	import { IdleTimer } from '$lib/session/idle.svelte';
	import Logbook from './Logbook.svelte';
	import PinPad from './PinPad.svelte';

	let {
		platform,
		store,
		missions,
		onClose
	}: { platform: Platform; store: StationStore; missions: Mission[]; onClose: () => void } =
		$props();

	type Stage = 'setup' | 'confirm' | 'locked' | 'open';
	let stage = $state<Stage>('locked');
	let entry = $state('');
	let firstPin = $state('');
	let pin = $state('');
	let pinError = $state<string | null>(null);
	let form = $state<EditableConfig>(editableOf(DEFAULT_PUBLIC_CONFIG));
	let smtpPassword = $state('');
	let testTo = $state('');
	let newPin = $state('');
	let emailCount = $state<number | null>(null);
	let confirmDelete = $state(false);
	let status = $state<string | null>(null);
	let busy = $state(false);
	let version = $state('');
	let update = $state<string | null>(null);

	// An unlocked admin screen must not wait for the next visitor: lock after 2 minutes.
	const ADMIN_IDLE_MS = 120_000;
	const autoLock = new IdleTimer(
		() => {
			stage = 'locked';
			pin = '';
			entry = '';
			status = null;
		},
		ADMIN_IDLE_MS,
		1_000
	);

	onMount(() => {
		stage = store.config.hasPin ? 'locked' : 'setup';
	});

	onDestroy(() => autoLock.stop());

	$effect(() => {
		if (stage === 'open') autoLock.start();
		else autoLock.stop();
	});

	const message = (e: unknown) => (e instanceof PlatformError ? e.message : String(e));

	async function submitPin() {
		pinError = null;
		if (stage === 'setup') {
			firstPin = entry;
			entry = '';
			stage = 'confirm';
			return;
		}
		if (stage === 'confirm') {
			if (entry !== firstPin) {
				pinError = t.admin.mismatch;
				entry = '';
				stage = 'setup';
				return;
			}
			try {
				await platform.setPin(null, entry);
				pin = entry;
				store.set(await platform.getConfig());
				await openSettings();
			} catch (e) {
				pinError = message(e);
				entry = '';
				stage = 'setup';
			}
			return;
		}
		if (await platform.verifyPin(entry)) {
			pin = entry;
			await openSettings();
		} else {
			pinError = t.admin.wrongPin;
		}
		entry = '';
	}

	async function openSettings() {
		form = editableOf(store.config);
		stage = 'open';
		emailCount = await platform.emailCount(pin).catch(() => null);
		version = await platform.appVersion().catch(() => '');
	}

	async function run(action: () => Promise<string | null>) {
		busy = true;
		status = null;
		try {
			status = await action();
		} catch (e) {
			status = message(e);
		}
		busy = false;
	}

	const save = () =>
		run(async () => {
			const saved = await platform.saveConfig(pin, $state.snapshot(form));
			const hadPassword = smtpPassword !== '';
			if (hadPassword) await platform.setSmtpPassword(pin, smtpPassword);
			smtpPassword = '';
			store.set(hadPassword ? await platform.getConfig() : saved);
			return t.admin.saved;
		});

	const checkUpdate = () =>
		run(async () => {
			update = await platform.checkUpdate();
			return update ? t.admin.updateFound(update) : t.admin.noUpdate;
		});

	const installUpdate = () =>
		run(async () => {
			await platform.installUpdate();
			return null;
		});

	const testMail = () =>
		run(async () => {
			await platform.testMail(pin, testTo.trim());
			return t.admin.testOk;
		});

	const exportEmails = () =>
		run(async () => {
			const path = await platform.exportEmails(pin);
			return path ? t.admin.exported(path) : null;
		});

	const deleteEmails = () =>
		run(async () => {
			if (!confirmDelete) {
				confirmDelete = true;
				return t.admin.deleteConfirm;
			}
			confirmDelete = false;
			const n = await platform.deleteEmails(pin);
			emailCount = 0;
			return t.admin.deleted(n);
		});

	const changePin = () =>
		run(async () => {
			await platform.setPin(pin, newPin);
			pin = newPin;
			newPin = '';
			return t.admin.saved;
		});

	function toggleMission(id: string, on: boolean) {
		const current = form.enabledMissions ?? missions.map((m) => m.id);
		const next = on ? [...new Set([...current, id])] : current.filter((x) => x !== id);
		form.enabledMissions = next.length === missions.length ? null : next;
	}

	const enabled = (id: string) =>
		form.enabledMissions === null || form.enabledMissions.includes(id);
	const field = 'h-12 w-full rounded-xl border bg-background px-3 text-lg select-text';
</script>

<svelte:window onpointerdown={() => autoLock.activity()} onkeydown={() => autoLock.activity()} />

<div class="fixed inset-0 z-50 overflow-y-auto bg-background">
	{#if stage !== 'open'}
		<div class="flex min-h-full flex-col items-center justify-center gap-6 p-8">
			{#if stage === 'setup'}
				<p class="max-w-md text-center text-lg text-muted-foreground">{t.admin.setupHint}</p>
			{/if}
			<PinPad
				value={entry}
				label={stage === 'setup'
					? t.admin.setupTitle
					: stage === 'confirm'
						? t.admin.confirmTitle
						: t.admin.enterTitle}
				error={pinError}
				onChange={(v) => (entry = v)}
				onSubmit={submitPin}
			/>
			{#if store.config.hasPin}
				<Button variant="secondary" class="h-14 rounded-2xl px-8 text-lg" onclick={onClose}
					>{t.admin.close}</Button
				>
			{/if}
		</div>
	{:else}
		<div class="mx-auto flex max-w-3xl flex-col gap-8 p-8">
			<header class="flex items-center gap-4">
				<h1 class="grow text-4xl font-bold">{t.admin.title}</h1>
				<Button class="h-12 rounded-xl px-6" disabled={busy} onclick={save}>{t.admin.save}</Button>
				<Button variant="secondary" class="h-12 rounded-xl px-6" onclick={onClose}
					>{t.admin.close}</Button
				>
			</header>
			{#if status}<p class="rounded-xl bg-muted px-4 py-3 text-lg">{status}</p>{/if}
			{#if platform.kind === 'web'}<p class="text-muted-foreground">{t.admin.webHint}</p>{/if}

			<section class="flex flex-col gap-3">
				<h2 class="text-2xl font-bold">{t.admin.station}</h2>
				<label class="flex flex-col gap-1"
					>{t.admin.stationName}<input class={field} bind:value={form.stationName} /></label
				>
				<label class="flex flex-col gap-1"
					>{t.admin.eventCode}<input class={field} bind:value={form.eventCode} /></label
				>
				{#if !form.eventCode.trim()}<p class="font-bold text-warn-foreground">
						{t.admin.eventHint}
					</p>{/if}
				<label class="flex flex-col gap-1"
					>{t.admin.idleSeconds}<input
						class={field}
						type="number"
						min="30"
						max="600"
						bind:value={form.idleSeconds}
					/></label
				>
				<label class="flex items-center gap-3 text-lg"
					><input type="checkbox" class="size-6" bind:checked={form.fullscreen} />{t.admin
						.fullscreen}</label
				>
				<label class="flex flex-col gap-1"
					>{t.admin.qrUrl}<input class={field} bind:value={form.qrUrl} /></label
				>
				<label class="flex flex-col gap-1"
					>{t.logbook.retention}<input
						class={field}
						type="number"
						min="1"
						max="365"
						bind:value={form.nameRetentionDays}
					/></label
				>
				<label class="flex flex-col gap-1"
					>{t.logbook.manualPeers}<input
						class={field}
						value={form.manualPeers.join(', ')}
						onchange={(e) =>
							(form.manualPeers = e.currentTarget.value
								.split(',')
								.map((s) => s.trim())
								.filter(Boolean))}
					/></label
				>
			</section>

			<section class="flex flex-col gap-3">
				<h2 class="text-2xl font-bold">{t.admin.missions}</h2>
				<div class="grid grid-cols-2 gap-2">
					{#each missions as m (m.id)}
						<label class="flex h-12 items-center gap-3 rounded-xl bg-muted px-3 text-lg">
							<input
								type="checkbox"
								class="size-6"
								checked={enabled(m.id)}
								onchange={(e) => toggleMission(m.id, e.currentTarget.checked)}
							/>
							{m.id} · {m.title}
						</label>
					{/each}
				</div>
			</section>

			{#if platform.features.email}
				<section class="flex flex-col gap-3">
					<h2 class="text-2xl font-bold">{t.admin.mail}</h2>
					<div class="grid grid-cols-[1fr_8rem] gap-3">
						<label class="flex flex-col gap-1"
							>{t.admin.smtpHost}<input class={field} bind:value={form.smtp.host} /></label
						>
						<label class="flex flex-col gap-1"
							>{t.admin.smtpPort}<input
								class={field}
								type="number"
								bind:value={form.smtp.port}
							/></label
						>
					</div>
					<label class="flex items-center gap-3 text-lg"
						><input type="checkbox" class="size-6" bind:checked={form.smtp.starttls} />{t.admin
							.smtpStarttls}</label
					>
					<label class="flex flex-col gap-1"
						>{t.admin.smtpUser}<input class={field} bind:value={form.smtp.username} /></label
					>
					<label class="flex flex-col gap-1"
						>{t.admin.smtpPassword}<input
							class={field}
							type="password"
							placeholder={store.config.smtpReady ? t.admin.smtpPasswordSet : ''}
							bind:value={smtpPassword}
						/></label
					>
					<label class="flex flex-col gap-1"
						>{t.admin.smtpFrom}<input class={field} bind:value={form.smtp.from} /></label
					>
					<div class="flex items-end gap-3">
						<label class="flex grow flex-col gap-1"
							>{t.admin.testTo}<input class={field} type="email" bind:value={testTo} /></label
						>
						<Button
							variant="secondary"
							class="h-12 rounded-xl px-6"
							disabled={busy || !testTo}
							onclick={testMail}>{t.admin.testSend}</Button
						>
					</div>
				</section>

				<section class="flex flex-col gap-3">
					<h2 class="text-2xl font-bold">{t.admin.emails}</h2>
					{#if emailCount !== null}<p class="text-lg">{t.admin.emailsCount(emailCount)}</p>{/if}
					<div class="flex gap-3">
						<Button
							variant="secondary"
							class="h-12 rounded-xl px-6"
							disabled={busy}
							onclick={exportEmails}>{t.admin.export}</Button
						>
						<Button
							variant="destructive"
							class="h-12 rounded-xl px-6"
							disabled={busy}
							onclick={deleteEmails}>{t.admin.deleteAll}</Button
						>
					</div>
				</section>
			{/if}

			<Logbook {platform} {pin} />

			<section class="flex flex-col gap-3">
				<h2 class="text-2xl font-bold">{t.admin.changePin}</h2>
				<div class="flex items-end gap-3">
					<label class="flex grow flex-col gap-1"
						>{t.admin.newPin}<input
							class={field}
							type="password"
							inputmode="numeric"
							bind:value={newPin}
						/></label
					>
					<Button
						variant="secondary"
						class="h-12 rounded-xl px-6"
						disabled={busy || !newPin}
						onclick={changePin}>{t.admin.changePin}</Button
					>
				</div>
			</section>

			{#if platform.kind === 'tauri'}
				<section class="flex flex-col gap-3">
					<h2 class="text-2xl font-bold">{t.admin.updates}</h2>
					{#if version}<p class="text-lg">{t.admin.version(version)}</p>{/if}
					<div class="flex gap-3">
						<Button
							variant="secondary"
							class="h-12 rounded-xl px-6"
							disabled={busy}
							onclick={checkUpdate}>{t.admin.checkUpdate}</Button
						>
						{#if update}<Button class="h-12 rounded-xl px-6" disabled={busy} onclick={installUpdate}
								>{t.admin.installUpdate}</Button
							>{/if}
					</div>
				</section>
			{/if}
		</div>
	{/if}
</div>
