<script lang="ts">
	import type { Mission } from '$lib/missions/schema';

	let { mission, path }: { mission: Mission; path: string[] } = $props();

	const CELL = 20;
	const rows = $derived(mission.map.rows);
	const width = $derived(rows[0].length * CELL);
	const height = $derived(rows.length * CELL);
	const points = $derived(
		path
			.map((key) => {
				const [x, y] = key.split(',').map(Number);
				return `${(x + 0.5) * CELL},${(y + 0.5) * CELL}`;
			})
			.join(' ')
	);
	const FILL: Record<string, string> = { B: 'fill-slate-500', P: 'fill-success' };
</script>

<svg viewBox="0 0 {width} {height}" class="h-full w-full" aria-hidden="true">
	{#each rows as row, y (y)}
		{#each [...row] as ch, x (x)}
			<rect
				x={x * CELL + 1}
				y={y * CELL + 1}
				width={CELL - 2}
				height={CELL - 2}
				rx="4"
				class={FILL[ch] ?? 'fill-sky'}
			/>
		{/each}
	{/each}
	<polyline
		{points}
		fill="none"
		stroke-width="4"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="stroke-drone"
	/>
</svg>
