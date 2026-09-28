<script lang="ts">
	import { Lightbulb } from '@lucide/svelte';
	import { backOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';
	import { t } from '$lib/i18n/de';
	import type { CoachState } from './coach.svelte';

	let { coach }: { coach: CoachState } = $props();
</script>

<div class="pointer-events-none absolute bottom-3 left-3 flex max-w-[85%] items-end gap-2">
	<button
		class="pointer-events-auto grid size-14 shrink-0 press place-items-center rounded-full bg-htl text-white shadow-lg"
		aria-label={t.coach.ask}
		onclick={() => coach.request()}
	>
		<Lightbulb class="size-7" />
	</button>
	{#key coach.hint}
		{#if coach.hint}
			<button
				in:scale={{ start: 0.4, duration: 380, easing: backOut }}
				class="pointer-events-auto rounded-2xl rounded-bl-sm bg-card px-4 py-3 text-left text-lg font-semibold shadow-xl"
				onclick={() => coach.dismiss()}
			>
				{coach.hint}
			</button>
		{/if}
	{/key}
</div>
