<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { t } from '$lib/i18n/de';
	import { SHOWCASE } from '$lib/missions';
	import { PythonRunner } from '$lib/runtime/client';
	import MissionWorkspace from '$lib/workspace/MissionWorkspace.svelte';

	let runner = $state<PythonRunner | null>(null);
	let phase = $state<'loading' | 'ready' | 'failed'>('loading');

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
	<MissionWorkspace mission={SHOWCASE[0]} {runner} />
{:else}
	<main class="grid h-full place-items-center bg-sky">
		<p
			class="animate-pulse text-3xl font-black {phase === 'failed'
				? 'animate-none text-destructive'
				: ''}"
		>
			{phase === 'failed' ? t.app.loadFailed : t.app.loading}
		</p>
	</main>
{/if}
