<script lang="ts">
	import type { Player } from './player.svelte';

	let { rows, player }: { rows: string[]; player: Player } = $props();

	const CELL = 100;
	const width = $derived(rows[0].length * CELL);
	const height = $derived(rows.length * CELL);
	const cells = $derived(
		rows.flatMap((row, y) => [...row].map((ch, x) => ({ ch, x: x * CELL, y: y * CELL })))
	);
	const lift = $derived(player.lift.current);
	const cx = $derived((player.x.current + 0.5) * CELL);
	const cy = $derived((player.y.current + 0.5) * CELL);
</script>

<svg viewBox="0 0 {width} {height}" class="h-full w-full" role="img" aria-label="Karte mit Drohne">
	<rect {width} {height} rx="24" class="fill-sky" />
	{#each cells as cell (cell.x + ',' + cell.y)}
		<rect
			x={cell.x + 4}
			y={cell.y + 4}
			width={CELL - 8}
			height={CELL - 8}
			rx="14"
			class="fill-white/60"
		/>
		{#if cell.ch === 'B'}
			<rect
				x={cell.x + 12}
				y={cell.y + 12}
				width={CELL - 24}
				height={CELL - 24}
				rx="10"
				class="fill-slate-500"
			/>
			{#each [0, 1] as row (row)}
				{#each [0, 1] as col (col)}
					<rect
						x={cell.x + 26 + col * 30}
						y={cell.y + 26 + row * 30}
						width="18"
						height="18"
						rx="4"
						class="fill-amber-200"
					/>
				{/each}
			{/each}
		{:else if cell.ch === 'P'}
			<circle cx={cell.x + CELL / 2} cy={cell.y + CELL / 2} r="36" class="fill-emerald-500" />
			<text
				x={cell.x + CELL / 2}
				y={cell.y + CELL / 2 + 14}
				text-anchor="middle"
				class="fill-white text-[40px] font-black">H</text
			>
		{:else if cell.ch === 'K'}
			<rect x={cell.x + 30} y={cell.y + 30} width="40" height="40" rx="6" class="fill-amber-600" />
		{:else if cell.ch === 'D'}
			<rect
				x={cell.x + 16}
				y={cell.y + 16}
				width={CELL - 32}
				height={CELL - 32}
				rx="12"
				stroke-width="6"
				stroke-dasharray="12 8"
				class="fill-none stroke-amber-600"
			/>
		{:else if cell.ch === 'S'}
			<rect
				x={cell.x + 14}
				y={cell.y + 24}
				width={CELL - 28}
				height={CELL - 48}
				rx="6"
				class="fill-blue-700"
			/>
		{/if}
	{/each}

	<!-- shadow grows apart from the drone while it flies -->
	<ellipse
		cx={cx + lift * 10}
		cy={cy + lift * 14}
		rx={30 - lift * 6}
		ry={14 - lift * 3}
		class="fill-black/20"
	/>

	{#key player.bump}
		<g class:bump={player.bump > 0} style="transform-origin: {cx}px {cy}px">
			<g
				transform="translate({cx} {cy - lift * 10}) rotate({player.heading.current}) scale({0.8 +
					lift * 0.25})"
			>
				<rect
					x="-6"
					y="-34"
					width="12"
					height="68"
					rx="6"
					class="fill-slate-800"
					transform="rotate(45)"
				/>
				<rect
					x="-6"
					y="-34"
					width="12"
					height="68"
					rx="6"
					class="fill-slate-800"
					transform="rotate(-45)"
				/>
				{#each [[-24, -24], [24, -24], [-24, 24], [24, 24]] as [px, py] (px + ',' + py)}
					<g transform="translate({px} {py})">
						<circle r="15" class="fill-slate-300/70" />
						<rect
							x="-14"
							y="-2"
							width="28"
							height="4"
							rx="2"
							class="fill-slate-700"
							class:spin={lift > 0.05}
						/>
					</g>
				{/each}
				<rect x="-16" y="-16" width="32" height="32" rx="10" class="fill-drone" />
				<circle cx="0" cy="-10" r="4" class="fill-white" />
				{#if player.carrying}
					<rect x="-10" y="18" width="20" height="16" rx="3" class="fill-amber-600" />
				{/if}
			</g>
		</g>
	{/key}
</svg>

<style>
	.spin {
		animation: spin 0.18s linear infinite;
		transform-box: fill-box;
		transform-origin: center;
	}
	.bump {
		animation: bump 0.5s ease-out;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes bump {
		0%,
		100% {
			transform: translate(0, 0);
		}
		20% {
			transform: translate(-8px, 0) rotate(-6deg);
		}
		40% {
			transform: translate(8px, 0) rotate(6deg);
		}
		60% {
			transform: translate(-5px, 0) rotate(-3deg);
		}
		80% {
			transform: translate(3px, 0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spin,
		.bump {
			animation: none;
		}
	}
</style>
