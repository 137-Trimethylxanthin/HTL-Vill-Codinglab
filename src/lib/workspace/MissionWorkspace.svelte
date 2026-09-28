<script lang="ts">
	import { Play, RotateCcw, Star } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { appendBlock, findBlock, removeBlock, setParam } from '$lib/blocks/edit';
	import { countBlocks, toPython } from '$lib/blocks/generator';
	import type { BlockNode, BlockType } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import { isGoalReached } from '$lib/missions/goal';
	import type { Mission } from '$lib/missions/schema';
	import { calcStars, type Stars } from '$lib/missions/stars';
	import type { PythonRunner } from '$lib/runtime/client';
	import type { RunResult } from '$lib/sim/result';
	import DroneStage from '$lib/stage/DroneStage.svelte';
	import { Player } from '$lib/stage/player.svelte';
	import { buildTimeline, startPose } from '$lib/stage/timeline';
	import BlockPalette from './BlockPalette.svelte';
	import ProgramList from './ProgramList.svelte';
	import PythonView from './PythonView.svelte';

	let { mission, runner }: { mission: Mission; runner: PythonRunner } = $props();

	let program = $state<BlockNode[]>([]);
	let runs = $state(0);
	let status = $state<'idle' | 'running' | 'success' | 'fail'>('idle');
	let message = $state<string | null>(null);
	let stars = $state<Stars>(0);
	const player = new Player();

	const python = $derived(toPython(program));
	const activeId = $derived(player.line ? (python.blockAt[player.line] ?? null) : null);

	$effect.pre(() => {
		player.reset(startPose(mission.map.start));
	});

	function edit(next: BlockNode[]) {
		if (status === 'running') return;
		program = next;
		if (status !== 'idle') resetStage();
	}

	function resetStage() {
		player.reset(startPose(mission.map.start));
		status = 'idle';
		message = null;
	}

	function outcomeMessage(result: RunResult): string {
		if (result.stop) return t.stops[result.stop.code];
		if (result.pyError) return result.pyError.message;
		return result.final.flying ? t.outcome.stillFlying : t.outcome.missed;
	}

	async function run() {
		if (status === 'running' || program.length === 0) return;
		resetStage();
		status = 'running';
		runs += 1;
		const result = await runner.run(python.code, mission);
		const finished = await player.play(buildTimeline(mission.map.start, result.events));
		if (!finished) return;
		if (isGoalReached(mission, result)) {
			stars = calcStars({ reached: true, blockCount: countBlocks(program), runs }, mission.stars);
			status = 'success';
			message = t.workspace.success;
		} else {
			status = 'fail';
			message = outcomeMessage(result);
		}
	}
</script>

<div class="grid h-full grid-rows-[auto_1fr] gap-4 bg-sky p-4">
	<header class="flex items-center gap-4 rounded-3xl bg-card px-6 py-4 shadow-sm">
		<span class="rounded-xl bg-drone px-3 py-1 text-lg font-black text-drone-foreground"
			>{mission.id}</span
		>
		<div class="grow">
			<h1 class="text-2xl font-black">{mission.title}</h1>
			<p class="text-lg text-muted-foreground">{mission.goalText}</p>
		</div>
	</header>

	<div
		class="grid min-h-0 grid-cols-[minmax(14rem,1fr)_minmax(18rem,1.3fr)_minmax(20rem,1.6fr)] gap-4"
	>
		<div class="min-h-0 overflow-y-auto rounded-3xl bg-card/70 p-4">
			<BlockPalette
				blocks={mission.blocks}
				disabled={status === 'running'}
				onAdd={(type: BlockType) => edit(appendBlock(program, type))}
			/>
		</div>

		<div class="grid min-h-0 grid-rows-[1fr_auto] gap-4 rounded-3xl bg-card/70 p-4">
			<ProgramList
				{program}
				{activeId}
				locked={status === 'running'}
				onRemove={(id) => edit(removeBlock(program, id))}
				onStep={(id, delta) => {
					const node = findBlock(program, id);
					if (node?.n !== undefined) edit(setParam(program, id, node.n + delta));
				}}
			/>
			<PythonView code={python.code} activeLine={player.line} />
		</div>

		<div class="grid min-h-0 grid-rows-[1fr_auto] gap-4 rounded-3xl bg-card/70 p-4">
			<div class="min-h-0">
				<DroneStage rows={mission.map.rows} {player} />
			</div>
			<div class="flex flex-col gap-3">
				{#if message}
					<p
						class="rounded-2xl px-4 py-3 text-center text-xl font-bold {status === 'success'
							? 'bg-emerald-500 text-white'
							: 'bg-amber-100 text-amber-900'}"
					>
						{message}
						{#if status === 'success'}
							<span class="mt-1 flex justify-center gap-1">
								{#each [1, 2, 3] as i (i)}
									<Star
										class="size-8 {i <= stars
											? 'fill-yellow-300 text-yellow-300'
											: 'text-white/50'}"
									/>
								{/each}
							</span>
						{/if}
					</p>
				{/if}
				<div class="flex gap-3">
					<Button
						class="h-16 grow rounded-2xl bg-drone text-2xl font-black text-drone-foreground active:scale-95"
						disabled={status === 'running' || program.length === 0}
						onclick={run}><Play class="size-7" />{t.workspace.start}</Button
					>
					<Button
						variant="secondary"
						class="h-16 rounded-2xl px-6 text-xl active:scale-95"
						disabled={status === 'running'}
						onclick={resetStage}><RotateCcw class="size-6" />{t.workspace.reset}</Button
					>
				</div>
			</div>
		</div>
	</div>
</div>
