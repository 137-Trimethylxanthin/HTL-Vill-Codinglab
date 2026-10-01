<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from '$lib/i18n/de';
	import { PlatformError, type Platform } from '$lib/platform/types';
	import { IdleTimer } from '$lib/session/idle.svelte';
	import type { Session } from '$lib/session/session.svelte';
	import PinPad from './PinPad.svelte';

	let {
		platform,
		session,
		onNextVisitor,
		onClose
	}: {
		platform: Pick<Platform, 'verifyPin'>;
		session: Session;
		onNextVisitor: () => void;
		onClose: () => void;
	} = $props();

	let unlocked = $state(false);
	let entry = $state('');
	let pinError = $state<string | null>(null);
	let picking = $state(false);
	let confirmNext = $state(false);

	// A supervisor walks on quickly; an open menu (or a forgotten PIN pad) must not wait for a child.
	const MENU_IDLE_MS = 60_000;
	const autoClose = new IdleTimer(() => onClose(), MENU_IDLE_MS - 1_000, 1_000);
	onMount(() => autoClose.start());
	onDestroy(() => autoClose.stop());

	async function submitPin() {
		pinError = null;
		try {
			if (await platform.verifyPin(entry)) unlocked = true;
			else pinError = t.admin.wrongPin;
		} catch (e) {
			pinError = e instanceof PlatformError ? e.message : String(e);
		}
		entry = '';
	}

	function act(action: () => void) {
		action();
		onClose();
	}

	function nextVisitor() {
		if (!confirmNext) {
			confirmNext = true;
			return;
		}
		act(onNextVisitor);
	}

	const big = 'h-20 rounded-2xl px-6 text-2xl font-bold';
</script>

<svelte:window onpointerdown={() => autoClose.activity()} onkeydown={() => autoClose.activity()} />

<div class="fixed inset-0 z-50 overflow-y-auto bg-background">
	<div class="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-5 p-8">
		{#if !unlocked}
			<PinPad
				value={entry}
				label={t.supervisor.enterPin}
				error={pinError}
				onChange={(v) => (entry = v)}
				onSubmit={submitPin}
			/>
			<Button variant="secondary" class="mx-auto h-14 rounded-2xl px-8 text-lg" onclick={onClose}
				>{t.supervisor.close}</Button
			>
		{:else if picking}
			<h1 class="text-3xl font-bold">{t.supervisor.goTo}</h1>
			<div class="grid grid-cols-2 gap-3">
				{#each session.missions as m (m.id)}
					<Button
						variant={m.id === session.currentId ? 'default' : 'secondary'}
						class="h-16 justify-start rounded-2xl px-4 text-lg"
						onclick={() => act(() => session.goTo(m.id))}>{m.id} · {m.title}</Button
					>
				{/each}
			</div>
			<Button variant="secondary" class={big} onclick={() => (picking = false)}
				>{t.supervisor.close}</Button
			>
		{:else}
			<header>
				<h1 class="text-4xl font-bold">{t.supervisor.title}</h1>
				{#if session.current && session.screen === 'mission'}
					<p class="text-xl text-muted-foreground">
						{t.supervisor.mission(session.current.id, session.current.title)}
					</p>
				{/if}
				{#if session.help}<p class="text-xl font-bold text-destructive">
						{t.supervisor.helpOn}
					</p>{/if}
			</header>
			<Button
				variant="secondary"
				class="{big} flex-col gap-0"
				disabled={session.screen !== 'mission' ||
					session.currentId === null ||
					session.isRevealed(session.currentId) ||
					session.current?.editablePython}
				onclick={() => act(() => session.order())}
				>{t.supervisor.orderBlocks}<span class="text-base font-normal"
					>{t.supervisor.orderHint}</span
				></Button
			>
			<Button
				class="{big} flex-col gap-0"
				disabled={session.screen !== 'mission'}
				onclick={() => act(() => session.reveal())}
				>{t.supervisor.showSolution}<span class="text-base font-normal"
					>{t.supervisor.solutionHint}</span
				></Button
			>
			<Button variant="secondary" class={big} onclick={() => (picking = true)}
				>{t.supervisor.goTo}</Button
			>
			<Button
				variant="secondary"
				class={big}
				disabled={!session.help}
				onclick={() => act(() => session.clearHelp())}>{t.supervisor.clearHelp}</Button
			>
			<Button variant="destructive" class={big} onclick={nextVisitor}
				>{confirmNext ? t.supervisor.nextConfirm : t.supervisor.nextVisitor}</Button
			>
			<Button variant="secondary" class={big} onclick={onClose}>{t.supervisor.close}</Button>
		{/if}
	</div>
</div>
