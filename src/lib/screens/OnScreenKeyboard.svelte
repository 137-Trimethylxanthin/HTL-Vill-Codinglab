<script lang="ts">
	import { CornerDownLeft, Delete } from '@lucide/svelte';
	import { t } from '$lib/i18n/de';
	import { MAX_NAME } from '$lib/session/names';

	let {
		value,
		mode = 'name',
		onChange,
		onDone
	}: {
		value: string;
		mode?: 'name' | 'email';
		onChange: (value: string) => void;
		onDone: () => void;
	} = $props();

	const ROWS = $derived(
		mode === 'email'
			? ['1234567890', 'qwertzuiop', 'asdfghjkl', 'yxcvbnm']
			: ['QWERTZUIOPÜ', 'ASDFGHJKLÖÄ', 'YXCVBNMß']
	);
	const EXTRA = $derived(mode === 'email' ? ['@', '.', '-', '_', '+'] : ['-']);
	const MAX = $derived(mode === 'email' ? 64 : MAX_NAME);
	const ALLOWED = $derived(mode === 'email' ? /^[a-z0-9@._+-]$/ : /^[A-Za-zÄÖÜäöüß -]$/);
	const upper = $derived(
		mode === 'name' && (value.length === 0 || value.endsWith(' ') || value.endsWith('-'))
	);

	function type(ch: string) {
		if (value.length >= MAX) return;
		if (ch === ' ' && (value.length === 0 || value.endsWith(' '))) return;
		const c = mode === 'email' ? ch.toLowerCase() : upper ? ch.toUpperCase() : ch.toLowerCase();
		onChange(value + c.replace('SS', 'ß'));
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Backspace') onChange(value.slice(0, -1));
		else if (e.key === 'Enter') onDone();
		else if (ALLOWED.test(mode === 'email' ? e.key.toLowerCase() : e.key)) type(e.key);
		else return;
		e.preventDefault();
	}
</script>

<svelte:window onkeydown={onKey} />

<div
	class="flex max-w-full flex-col items-center gap-2 rounded-3xl bg-card p-4 shadow-xl portrait:p-2"
>
	{#each ROWS as row (row)}
		<div class="flex max-w-full flex-wrap justify-center gap-2">
			{#each [...row] as ch (ch)}
				<button
					class="grid size-14 press place-items-center rounded-xl bg-muted font-display text-2xl font-bold"
					onclick={() => type(ch)}>{upper || ch === 'ß' ? ch : ch.toLowerCase()}</button
				>
			{/each}
		</div>
	{/each}
	<div class="flex max-w-full flex-wrap justify-center gap-2">
		{#each EXTRA as ch (ch)}
			<button
				class="h-14 w-16 press rounded-xl bg-muted text-2xl font-bold"
				onclick={() => type(ch)}>{ch}</button
			>
		{/each}
		{#if mode === 'name'}
			<button
				class="h-14 w-64 max-w-full press rounded-xl bg-muted text-xl"
				onclick={() => type(' ')}>{t.pilot.space}</button
			>
		{/if}
		<button
			class="grid h-14 w-20 press place-items-center rounded-xl bg-muted"
			aria-label={t.pilot.delete}
			onclick={() => onChange(value.slice(0, -1))}><Delete class="size-7" /></button
		>
		<button
			class="flex h-14 press items-center gap-2 rounded-xl bg-htl px-6 text-xl font-bold text-white"
			onclick={onDone}><CornerDownLeft class="size-6" />{t.pilot.done}</button
		>
	</div>
</div>
