<script lang="ts">
	import { prefersReducedMotion } from 'svelte/motion';
	import type { Mission } from '$lib/missions/schema';
	import PathThumbnail from '$lib/screens/PathThumbnail.svelte';

	/** The flight path drawn cell by cell over the mission map, within about `ms`. */
	let { mission, path, ms = 6000 }: { mission: Mission; path: string[]; ms?: number } = $props();

	let shown = $state(0);
	// Depend on the cells, not the array: a refreshed record must not restart the drawing.
	const key = $derived(path.join(';'));

	$effect(() => {
		const cells = key.split(';');
		if (prefersReducedMotion.current) {
			shown = cells.length;
			return;
		}
		shown = 1;
		const step = Math.min(400, ms / Math.max(1, cells.length));
		const timer = setInterval(() => {
			if (shown >= cells.length) clearInterval(timer);
			else shown += 1;
		}, step);
		return () => clearInterval(timer);
	});
</script>

<PathThumbnail {mission} path={path.slice(0, shown)} />
