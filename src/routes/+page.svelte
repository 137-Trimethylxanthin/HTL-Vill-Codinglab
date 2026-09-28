<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { t } from '$lib/i18n/de';
	import { SHOWCASE } from '$lib/missions';
	import { PythonRunner } from '$lib/runtime/client';
	import { cn } from '$lib/utils';
	import MissionWorkspace from '$lib/workspace/MissionWorkspace.svelte';

	let runner = $state<PythonRunner | null>(null);
	let phase = $state<'loading' | 'ready' | 'failed'>('loading');
	let index = $state(0);
	const mission = $derived(SHOWCASE[index]);

	onMount(() => {
		const created = new PythonRunner();
		runner = created;
		created.ready().then(
			() => (phase = 'ready'),
			() => (phase = 'failed')
		);
	});

	onDestroy(() => runner?.dispose());
</script>

{#if phase === 'ready' && runner}
	{#key mission.id}
		<MissionWorkspace
			{mission}
			{runner}
			onPrev={index > 0 ? () => index-- : undefined}
			onNext={index < SHOWCASE.length - 1 ? () => index++ : undefined}
		/>
	{/key}
{:else}
	<main class="grid h-full place-items-center bg-sky">
		<p
			class={cn(
				'font-display text-3xl font-bold',
				phase === 'failed' ? 'text-destructive' : 'animate-pulse'
			)}
		>
			{phase === 'failed' ? t.app.loadFailed : t.app.loading}
		</p>
	</main>
{/if}
