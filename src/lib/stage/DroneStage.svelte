<script lang="ts">
	import { t } from '$lib/i18n/de';
	import type { Player } from './player.svelte';
	import type { Preview } from '$lib/workspace/preview';
	import PhantomDrone from './PhantomDrone.svelte';
	import { visibleCells } from './visibility';

	let {
		player,
		fog = false,
		phantom = null,
		glow = null,
		guess = null,
		onPick
	}: {
		player: Player;
		fog?: boolean;
		phantom?: Preview | null;
		/** A cell the coach's hint is about. */
		glow?: [number, number] | null;
		/** The child's guess where the drone ends up. */
		guess?: [number, number] | null;
		/** Guessing: every cell becomes tappable. */
		onPick?: (x: number, y: number) => void;
	} = $props();

	const CELL = 100;
	const rows = $derived(player.rows);
	const cols = $derived(rows[0]?.length ?? 1);
	const width = $derived(cols * CELL);
	const height = $derived(Math.max(rows.length, 1) * CELL);
	const cells = $derived(
		rows.flatMap((row, y) =>
			[...row].map((ch, x) => ({ ch, key: `${x},${y}`, px: x * CELL, py: y * CELL }))
		)
	);
	const visible = $derived(fog ? visibleCells(cols, rows.length, player.visited) : null);
	const lift = $derived(player.lift.current);
	const cx = $derived((player.x.current + 0.5) * CELL);
	const cy = $derived((player.y.current + 0.5) * CELL);
</script>

<svg viewBox="0 0 {width} {height}" class="h-full w-full" role="img" aria-label={t.stage.label}>
	<rect {width} {height} rx="24" class="fill-sky" />
	{#each cells as cell (cell.key)}
		{@const mid = { x: cell.px + CELL / 2, y: cell.py + CELL / 2 }}
		<rect
			x={cell.px + 4}
			y={cell.py + 4}
			width={CELL - 8}
			height={CELL - 8}
			rx="14"
			class="fill-white/60"
		/>
		{#if cell.ch === 'B'}
			<rect
				x={cell.px + 12}
				y={cell.py + 12}
				width={CELL - 24}
				height={CELL - 24}
				rx="10"
				class="fill-slate-500"
			/>
			{#each [0, 1] as row (row)}
				{#each [0, 1] as col (col)}
					<rect
						x={cell.px + 26 + col * 30}
						y={cell.py + 26 + row * 30}
						width="18"
						height="18"
						rx="4"
						class="fill-amber-200"
					/>
				{/each}
			{/each}
		{:else if cell.ch === 'P'}
			<circle cx={mid.x} cy={mid.y} r="36" class="fill-success" />
			<text
				x={mid.x}
				y={mid.y + 14}
				text-anchor="middle"
				class="fill-white font-display text-[40px] font-bold">H</text
			>
		{:else if cell.ch === 'K'}
			<rect
				x={cell.px + 30}
				y={cell.py + 30}
				width="40"
				height="40"
				rx="6"
				class="fill-amber-600"
			/>
			<rect x={cell.px + 46} y={cell.py + 30} width="8" height="40" class="fill-amber-300" />
		{:else if cell.ch === 'D'}
			<rect
				x={cell.px + 16}
				y={cell.py + 16}
				width={CELL - 32}
				height={CELL - 32}
				rx="12"
				stroke-width="6"
				stroke-dasharray="12 8"
				class="fill-none stroke-amber-600"
			/>
			{#if player.delivered.includes(cell.key)}
				<!-- The parcel the drone put down, drawn like the one it picked up. -->
				<g class="parcel-drop">
					<rect
						x={cell.px + 30}
						y={cell.py + 30}
						width="40"
						height="40"
						rx="6"
						class="fill-amber-600"
					/>
					<rect x={cell.px + 46} y={cell.py + 30} width="8" height="40" class="fill-amber-300" />
				</g>
			{/if}
		{:else if cell.ch === 'S'}
			<rect
				x={cell.px + 14}
				y={cell.py + 24}
				width={CELL - 28}
				height={CELL - 48}
				rx="6"
				class={player.photographed.includes(cell.key) ? 'fill-success' : 'fill-blue-700'}
			/>
			<line
				x1={mid.x}
				y1={cell.py + 24}
				x2={mid.x}
				y2={cell.py + CELL - 24}
				stroke-width="3"
				class="stroke-white/50"
			/>
		{:else if cell.ch === 'C'}
			<circle
				cx={mid.x}
				cy={mid.y}
				r="30"
				fill="none"
				stroke-width="10"
				class={player.visited.includes(cell.key) ? 'stroke-success' : 'stroke-drone'}
			/>
		{/if}
		{#if visible && !visible.has(cell.key)}
			<rect
				x={cell.px}
				y={cell.py}
				width={CELL}
				height={CELL}
				class="fill-slate-300 transition-opacity duration-500"
			/>
		{/if}
	{/each}

	<!-- Where the drone has been: a trail of dots. -->
	{#each player.visited as key (key)}
		{@const [vx, vy] = key.split(',').map(Number)}
		<circle cx={(vx + 0.5) * CELL} cy={(vy + 0.5) * CELL} r="7" class="fill-drone/50" />
	{/each}

	{#if glow}
		<rect
			x={glow[0] * CELL + 4}
			y={glow[1] * CELL + 4}
			width={CELL - 8}
			height={CELL - 8}
			rx="14"
			stroke-width="8"
			class="glow fill-none stroke-yellow-400"
		/>
	{/if}

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
				{#if player.sensing !== null}
					<rect
						x="-6"
						y="-100"
						width="12"
						height="60"
						rx="6"
						class={player.sensing ? 'fill-red-500/70' : 'fill-success/70'}
					/>
				{/if}
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

	{#if guess}
		<!-- A pin where the child guessed the drone would end up. -->
		<g transform="translate({(guess[0] + 0.5) * CELL} {(guess[1] + 0.5) * CELL})">
			<circle
				r="30"
				class="fill-none stroke-fuchsia-500"
				stroke-width="7"
				stroke-dasharray="10 7"
			/>
			<text y="12" text-anchor="middle" class="fill-fuchsia-500 font-display text-[34px] font-bold"
				>?</text
			>
		</g>
	{/if}

	{#if onPick}
		{#each cells as cell (cell.key)}
			<rect
				role="button"
				tabindex="-1"
				aria-label={cell.key}
				x={cell.px}
				y={cell.py}
				width={CELL}
				height={CELL}
				class="cursor-pointer fill-fuchsia-500/0 hover:fill-fuchsia-500/20"
				onpointerdown={() => onPick(cell.px / CELL, cell.py / CELL)}
			/>
		{/each}
	{/if}

	{#if phantom}
		<PhantomDrone preview={phantom} cell={CELL} />
	{/if}

	{#key player.flash}
		{#if player.flash > 0}
			<rect {width} {height} rx="24" class="flash pointer-events-none fill-white" />
		{/if}
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
	.glow {
		animation: glow 1.2s ease-in-out infinite;
	}
	@keyframes glow {
		50% {
			opacity: 0.35;
		}
	}
	.parcel-drop {
		animation: parcel-drop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes parcel-drop {
		from {
			transform: translateY(-24px) scale(0.6);
			opacity: 0;
		}
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
		.bump,
		.parcel-drop {
			animation: none;
		}
	}
</style>
