<script lang="ts">
	import { CornerDownLeft, Delete } from '@lucide/svelte';
	import { t } from '$lib/i18n/de';
	import { MAX_NAME } from '$lib/session/names';

	let {
		value,
		onChange,
		onDone
	}: { value: string; onChange: (value: string) => void; onDone: () => void } = $props();

	const ROWS = ['QWERTZUIOPÜ', 'ASDFGHJKLÖÄ', 'YXCVBNMß'];
	const ALLOWED = /^[A-Za-zÄÖÜäöüß -]$/;
	const upper = $derived(value.length === 0 || value.endsWith(' ') || value.endsWith('-'));

	function type(ch: string) {
		if (value.length >= MAX_NAME) return;
		if (ch === ' ' && (value.length === 0 || value.endsWith(' '))) return;
		onChange(value + (upper ? ch.toUpperCase() : ch.toLowerCase()).replace('SS', 'ß'));
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Backspace') onChange(value.slice(0, -1));
		else if (e.key === 'Enter') onDone();
		else if (ALLOWED.test(e.key)) type(e.key);
		else return;
		e.preventDefault();
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="flex flex-col items-center gap-2 rounded-3xl bg-card p-4 shadow-xl">
	{#each ROWS as row (row)}
		<div class="flex gap-2">
			{#each [...row] as ch (ch)}
				<button
					class="grid size-14 press place-items-center rounded-xl bg-muted font-display text-2xl font-bold"
					onclick={() => type(ch)}>{upper || ch === 'ß' ? ch : ch.toLowerCase()}</button
				>
			{/each}
		</div>
	{/each}
	<div class="flex gap-2">
		<button class="h-14 w-16 press rounded-xl bg-muted text-2xl font-bold" onclick={() => type('-')}
			>-</button
		>
		<button class="h-14 w-64 press rounded-xl bg-muted text-xl" onclick={() => type(' ')}
			>{t.pilot.space}</button
		>
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
