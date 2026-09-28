<script lang="ts">
	import { backOut } from 'svelte/easing';
	import { fade, scale } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from '$lib/i18n/de';

	let { remaining, onContinue }: { remaining: number; onContinue: () => void } = $props();
</script>

<div class="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-8" transition:fade>
	<div
		class="flex flex-col items-center gap-6 rounded-3xl bg-card p-10 text-center shadow-2xl"
		in:scale={{ start: 0.8, duration: 350, easing: backOut }}
	>
		<h2 class="text-5xl font-bold">{t.idle.title}</h2>
		<p class="font-display text-8xl font-bold text-drone tabular-nums">{remaining}</p>
		<Button
			class="h-20 press rounded-3xl bg-drone px-12 font-display text-3xl font-bold text-drone-foreground"
			onclick={onContinue}>{t.idle.continue}</Button
		>
	</div>
</div>
