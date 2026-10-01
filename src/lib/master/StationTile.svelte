<script lang="ts">
	import type { BlockNode } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import type { Mission } from '$lib/missions/schema';
	import type { FleetRow } from '$lib/platform/types';
	import { cn } from '$lib/utils';
	import { blockColor } from '$lib/workspace/colors';
	import { BLOCK_ICONS } from '$lib/workspace/icons';
	import { expand } from './compact';
	import { clock, paceOf, type Pace } from './pace';

	/** One station on the master's screen: a live mini-view drawn from its status. */
	let {
		row,
		mission,
		expected,
		now,
		selected,
		onToggle
	}: {
		row: FleetRow;
		mission: Mission | null;
		/** Typical seconds for the station's current mission (pace colour). */
		expected: number;
		/** Local clock offset added to the station's own durations since the last poll. */
		now: number;
		selected: boolean;
		onToggle: () => void;
	} = $props();

	const CELL = 20;
	const program = $derived(expand(row.program));
	const missionMs = $derived(
		row.missionMs === null || row.missionMs === undefined ? null : row.missionMs + now
	);
	// No pace for a station that stopped reporting: its timer would only keep growing.
	const pace = $derived<Pace | null>(
		missionMs === null || row.offline ? null : paceOf(missionMs / 1000, expected)
	);
	// Measured on the station's own clock (no skew), plus the time since the last poll.
	const visitMs = $derived(
		row.visitMs === null || row.visitMs === undefined ? null : row.visitMs + now
	);
	const PACE_STYLE: Record<Pace, string> = {
		green: 'bg-success text-white',
		yellow: 'bg-yellow-400 text-slate-900',
		red: 'bg-destructive text-white animate-pulse'
	};
	const TILE: Record<string, string> = {
		B: 'fill-slate-500',
		P: 'fill-success',
		K: 'fill-amber-600',
		D: 'fill-amber-300',
		S: 'fill-blue-700',
		C: 'fill-drone/40'
	};

	/** The blocks flattened with their depth, for a compact list. */
	function lines(nodes: BlockNode[], depth = 0): { node: BlockNode; depth: number }[] {
		return nodes.flatMap((node) => [
			{ node, depth },
			...lines(node.children ?? [], depth + 1),
			...lines(node.else ?? [], depth + 1)
		]);
	}
	const blockLines = $derived(lines(program));
</script>

<button
	class={cn(
		'flex flex-col gap-2 rounded-2xl border-4 bg-card p-3 text-left shadow-md transition-colors',
		selected ? 'border-htl' : 'border-transparent',
		row.help && 'ring-4 ring-destructive',
		row.offline && 'opacity-50'
	)}
	aria-pressed={selected}
	onclick={onToggle}
>
	<div class="flex items-center gap-2">
		<span
			class={cn(
				'size-5 shrink-0 rounded-md border-2',
				selected ? 'border-htl bg-htl' : 'border-slate-300'
			)}
		></span>
		<span class="min-w-0 grow truncate text-lg font-bold">{row.stationName}</span>
		{#if row.help}<span class="rounded-full bg-destructive px-2 text-sm font-bold text-white"
				>HILFE</span
			>{/if}
		{#if row.stuck && !row.help}<span
				class="rounded-full bg-orange-500 px-2 text-sm font-bold text-white">HÄNGT</span
			>{/if}
		{#if row.paused}<span class="rounded-full bg-htl px-2 text-sm font-bold text-white"
				>{t.leitstand.paused}</span
			>{/if}
		{#if row.offline}<span class="rounded-full bg-slate-300 px-2 text-sm font-bold"
				>{t.leitstand.offline}</span
			>{/if}
	</div>

	{#if mission && row.screen === 'mission'}
		<div class="flex items-center justify-between gap-2 text-sm">
			<span class="truncate font-semibold">{mission.id} · {mission.title}</span>
			{#if pace && missionMs !== null}
				<span
					class={cn('shrink-0 rounded-lg px-2 py-0.5 font-bold tabular-nums', PACE_STYLE[pace])}
					title={t.leitstand.pace[pace]}>{clock(missionMs)}</span
				>
			{/if}
		</div>
		<div class="flex gap-2">
			<svg
				viewBox="0 0 {mission.map.rows[0].length * CELL} {mission.map.rows.length * CELL}"
				class="w-1/2 shrink-0 rounded-lg bg-sky"
				role="img"
				aria-label={mission.title}
			>
				{#each mission.map.rows as line, y (y)}
					{#each [...line] as ch, x (x)}
						<rect
							x={x * CELL + 1}
							y={y * CELL + 1}
							width={CELL - 2}
							height={CELL - 2}
							rx="3"
							class={TILE[ch] ?? 'fill-white/70'}
						/>
					{/each}
				{/each}
				{#if row.pose}
					<g
						transform="translate({(row.pose.x + 0.5) * CELL} {(row.pose.y + 0.5) *
							CELL}) rotate({row.pose.heading})"
					>
						<circle
							r={row.pose.flying ? 7 : 5.5}
							class="fill-drone stroke-white"
							stroke-width="2"
						/>
						<path d="M0 -11 L4 -6 L-4 -6 Z" class="fill-slate-800" />
					</g>
				{/if}
			</svg>
			<ol
				class="flex min-w-0 grow flex-col gap-0.5 overflow-hidden text-xs font-semibold text-white"
			>
				{#each blockLines.slice(0, 9) as { node, depth }, i (i)}
					{@const Icon = BLOCK_ICONS[node.type]}
					<li
						class="flex items-center gap-1 truncate rounded px-1"
						style:margin-left="{depth * 8}px"
						style:background={blockColor(node.type)}
					>
						<Icon class="size-3 shrink-0" />{t.blocks[node.type]}{node.n !== undefined
							? ` ${node.n}`
							: ''}
					</li>
				{/each}
				{#if blockLines.length > 9}
					<li class="text-muted-foreground">+{blockLines.length - 9}</li>
				{/if}
			</ol>
		</div>
	{:else}
		<p class="text-muted-foreground">
			{row.screen === 'attract'
				? t.leitstand.waiting
				: (t.leitstand.screen[row.screen] ?? row.screen)}
		</p>
	{/if}

	<div class="flex justify-between text-xs text-muted-foreground tabular-nums">
		<span>{visitMs !== null ? `${t.leitstand.visit} ${clock(visitMs)}` : ''}</span>
		<span>{row.solved} ✓ · {row.runs} ▶</span>
	</div>
</button>
