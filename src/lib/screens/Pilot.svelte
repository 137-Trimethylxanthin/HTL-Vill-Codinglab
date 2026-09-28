<script lang="ts">
	import { Keyboard, Shuffle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from '$lib/i18n/de';
	import { randomPilotName, sanitizeName } from '$lib/session/names';
	import OnScreenKeyboard from './OnScreenKeyboard.svelte';

	let { onDone }: { onDone: (name: string) => void } = $props();

	let name = $state(randomPilotName());
	let typing = $state(false);
	let sent = false;

	function go() {
		if (sent) return;
		sent = true;
		onDone(sanitizeName(name) || randomPilotName());
	}
</script>

<main class="flex h-full flex-col items-center justify-center gap-8 bg-sky p-8">
	<h1 class="text-5xl font-bold">{t.pilot.title}</h1>
	<div
		class="max-w-full min-w-[min(24rem,90vw)] rounded-3xl bg-card px-10 py-6 text-center font-display text-5xl font-bold break-all shadow-lg portrait:px-6 portrait:text-3xl"
	>
		{#if name}{name}{:else}<span class="text-muted-foreground">{t.pilot.placeholder}</span>{/if}
	</div>
	{#if typing}
		<OnScreenKeyboard value={name} onChange={(v) => (name = v)} onDone={() => (typing = false)} />
	{:else}
		<div class="flex flex-wrap justify-center gap-4">
			<Button
				variant="secondary"
				class="h-16 press rounded-2xl px-6 text-xl"
				onclick={() => (name = randomPilotName())}
				><Shuffle class="size-6" />{t.pilot.random}</Button
			>
			<Button
				variant="secondary"
				class="h-16 press rounded-2xl px-6 text-xl"
				onclick={() => {
					name = '';
					typing = true;
				}}><Keyboard class="size-6" />{t.pilot.own}</Button
			>
		</div>
	{/if}
	<Button
		class="h-20 press rounded-3xl bg-drone px-14 font-display text-4xl font-bold text-drone-foreground"
		onclick={go}>{t.pilot.go}</Button
	>
</main>
