<script lang="ts">
	import { Delete } from '@lucide/svelte';
	import { t } from '$lib/i18n/de';
	import { pressPinKey } from './pin';

	let {
		value,
		label,
		error = null,
		onChange,
		onSubmit
	}: {
		value: string;
		label: string;
		error?: string | null;
		onChange: (value: string) => void;
		onSubmit: () => void;
	} = $props();

	const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'ok'];

	function press(key: string) {
		if (key === 'ok') onSubmit();
		else onChange(pressPinKey(value, key));
	}

	function onKey(e: KeyboardEvent) {
		if (/^\d$/.test(e.key)) press(e.key);
		else if (e.key === 'Backspace') press('back');
		else if (e.key === 'Enter') press('ok');
		else return;
		e.preventDefault();
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="flex flex-col items-center gap-5">
	<h2 class="text-3xl font-bold">{label}</h2>
	<div class="flex h-6 gap-3" aria-label={`${value.length}`}>
		{#each Array.from({ length: Math.max(4, value.length) }, (_, i) => i) as i (i)}
			<span class="size-5 rounded-full {i < value.length ? 'bg-htl' : 'bg-muted'}"></span>
		{/each}
	</div>
	{#if error}<p class="font-bold text-destructive">{error}</p>{/if}
	<div class="grid grid-cols-3 gap-3">
		{#each KEYS as key (key)}
			<button
				class="grid h-16 w-20 press place-items-center rounded-2xl text-2xl font-bold {key === 'ok'
					? 'bg-htl text-white'
					: 'bg-muted'}"
				aria-label={key === 'back' ? t.pilot.delete : key === 'ok' ? t.admin.ok : key}
				onclick={() => press(key)}
			>
				{#if key === 'back'}<Delete class="size-7" />{:else if key === 'ok'}{t.admin
						.ok}{:else}{key}{/if}
			</button>
		{/each}
	</div>
</div>
