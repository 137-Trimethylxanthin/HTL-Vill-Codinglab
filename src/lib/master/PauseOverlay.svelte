<script lang="ts">
	import { Pause } from '@lucide/svelte';
	import { t } from '$lib/i18n/de';

	/** Shown while the master paused this station (e.g. for an announcement). */
	let { text }: { text: string } = $props();
</script>

<div class="fixed inset-0 z-50 grid place-items-center bg-sky/95 p-8">
	<div class="flex max-w-3xl flex-col items-center gap-6 text-center">
		<span class="grid size-28 place-items-center rounded-full bg-htl text-white shadow-xl">
			<Pause class="size-14" />
		</span>
		<h1 class="text-6xl font-bold">{t.leitstand.pauseTitle}</h1>
		<p class="text-3xl text-muted-foreground">{text || t.leitstand.pauseText}</p>
	</div>
</div>
