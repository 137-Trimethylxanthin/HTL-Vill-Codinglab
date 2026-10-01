<script lang="ts">
	import { prefersReducedMotion, Spring } from 'svelte/motion';
	import type { Preview } from '$lib/workspace/preview';

	/** A see-through drone that acts out one block, over and over, so kids need not imagine it. */
	let { preview, cell }: { preview: Preview; cell: number } = $props();

	const poses = $derived([preview.before, ...preview.frames.map((f) => f.pose)]);
	const opts = { stiffness: 0.15, damping: 0.6 };
	const x = new Spring(0, opts);
	const y = new Spring(0, opts);
	const heading = new Spring(0, opts);

	$effect(() => {
		const list = poses;
		let i = 0;
		const place = (k: number, instant: boolean) => {
			const p = list[k];
			x.set(p.x, { instant });
			y.set(p.y, { instant });
			heading.set(p.heading, { instant });
		};
		place(0, true);
		if (list.length < 2 || prefersReducedMotion.current) {
			place(list.length - 1, true);
			return;
		}
		// Step through the poses, rest at the end, then start over.
		const timer = setInterval(() => {
			i = (i + 1) % (list.length + 2);
			if (i === 0) place(0, true);
			else if (i < list.length) place(i, false);
		}, 450);
		return () => clearInterval(timer);
	});

	const centre = (v: number) => (v + 0.5) * cell;
	const path = $derived(poses.map((p) => `${centre(p.x)},${centre(p.y)}`).join(' '));
</script>

<g class="pointer-events-none" opacity="0.55">
	{#if poses.length > 1}
		<polyline
			points={path}
			fill="none"
			stroke-width="8"
			stroke-dasharray="4 14"
			stroke-linecap="round"
			class={preview.fails ? 'stroke-red-500' : 'stroke-drone'}
		/>
	{/if}
	<g transform="translate({centre(x.current)} {centre(y.current)}) rotate({heading.current})">
		{#each [[-24, -24], [24, -24], [-24, 24], [24, 24]] as [px, py] (px + ',' + py)}
			<circle cx={px} cy={py} r="14" class="fill-white stroke-slate-500" stroke-width="3" />
		{/each}
		<rect
			x="-16"
			y="-16"
			width="32"
			height="32"
			rx="10"
			class={preview.fails ? 'fill-red-500' : 'fill-drone'}
		/>
		<path d="M0 -30 L8 -20 L-8 -20 Z" class="fill-slate-700" />
	</g>
</g>
