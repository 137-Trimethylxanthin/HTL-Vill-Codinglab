<script lang="ts">
	import { Play } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import BlockTile from '$lib/workspace/BlockTile.svelte';

	const swatches = [
		['htl', 'bg-htl text-white', 'HTL (Platzhalter)'],
		['drone', 'bg-drone text-drone-foreground', 'Drohne'],
		['sky', 'bg-sky', 'Himmel'],
		['success', 'bg-success text-white', 'Erfolg'],
		['warn', 'bg-warn text-warn-foreground', 'Hinweis']
	] as const;
</script>

<main class="flex h-full flex-col gap-8 overflow-y-auto bg-sky p-8">
	<h1 class="text-5xl font-bold">CodingLab Stil</h1>
	<section class="flex flex-wrap gap-4">
		{#each swatches as [key, cls, label] (key)}
			<div class="grid h-28 w-44 place-items-center rounded-3xl text-lg font-bold shadow-md {cls}">
				{label}
			</div>
		{/each}
	</section>
	<section class="flex flex-col gap-2">
		<h2 class="text-4xl font-bold">Überschrift in Fredoka</h2>
		<p class="text-xl">Fließtext in Inter. Kurz und klar.</p>
		<code class="font-mono text-xl">for i in range(4):</code>
	</section>
	<section class="flex max-w-md flex-col gap-3">
		<BlockTile type="takeoff" />
		<BlockTile type="forward" n={3} onStep={() => {}} onRemove={() => {}} />
		<BlockTile type="repeat" n={4} onStep={() => {}} />
		<BlockTile type="if_obstacle" />
	</section>
	<section class="flex gap-3">
		<Button class="h-16 press rounded-2xl bg-drone px-8 text-2xl font-bold text-drone-foreground">
			<Play class="size-7" />Start
		</Button>
		<Button variant="secondary" class="h-16 press rounded-2xl px-8 text-xl">Zurück</Button>
	</section>
</main>
