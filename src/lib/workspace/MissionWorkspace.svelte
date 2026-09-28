<script lang="ts">
	import { Play, RotateCcw, Star } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from '$lib/i18n/de';
	import type { Mission } from '$lib/missions/schema';
	import type { PythonRunner } from '$lib/runtime/client';
	import DroneStage from '$lib/stage/DroneStage.svelte';
	import BlockPalette from './BlockPalette.svelte';
	import { MissionRun } from './mission-run.svelte';
	import ProgramList from './ProgramList.svelte';
	import PythonView from './PythonView.svelte';

	let { mission, runner }: { mission: Mission; runner: PythonRunner } = $props();

	// A new mission (or runner) starts a fresh attempt.
	const ctrl = $derived(new MissionRun(mission, runner));
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
		class="grid min-h-0 grid-cols-[minmax(13rem,0.8fr)_minmax(24rem,1.4fr)_minmax(20rem,1.4fr)] gap-4"
	>
		<div class="min-h-0 overflow-y-auto rounded-3xl bg-card/70 p-4">
			<BlockPalette
				blocks={mission.blocks}
				disabled={ctrl.status === 'running'}
				onAdd={(type) => ctrl.add(type)}
			/>
		</div>

		<div
			class="grid min-h-0 min-w-0 grid-cols-1 grid-rows-[minmax(0,3fr)_minmax(0,2fr)] gap-4 rounded-3xl bg-card/70 p-4 [&>*]:min-w-0"
		>
			<ProgramList
				program={ctrl.program}
				activeId={ctrl.activeId}
				locked={ctrl.status === 'running'}
				onRemove={(id) => ctrl.remove(id)}
				onStep={(id, delta) => ctrl.step(id, delta)}
			/>
			<PythonView code={ctrl.python.code} activeLine={ctrl.player.line} />
		</div>

		<div class="grid min-h-0 grid-rows-[1fr_auto] gap-4 rounded-3xl bg-card/70 p-4">
			<div class="min-h-0">
				<DroneStage player={ctrl.player} fog={mission.fog} />
			</div>
			<div class="flex flex-col gap-3">
				{#if ctrl.message}
					<p
						class="rounded-2xl px-4 py-3 text-center text-xl font-bold {ctrl.status === 'success'
							? 'bg-emerald-500 text-white'
							: 'bg-amber-100 text-amber-900'}"
					>
						{ctrl.message}
						{#if ctrl.status === 'success'}
							<span class="mt-1 flex justify-center gap-1">
								{#each [1, 2, 3] as i (i)}
									<Star
										class="size-8 {i <= ctrl.stars
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
						disabled={ctrl.status === 'running' || ctrl.program.length === 0}
						onclick={() => ctrl.run()}><Play class="size-7" />{t.workspace.start}</Button
					>
					<Button
						variant="secondary"
						class="h-16 rounded-2xl px-6 text-xl active:scale-95"
						disabled={ctrl.status === 'running'}
						onclick={() => ctrl.resetStage()}
						><RotateCcw class="size-6" />{t.workspace.reset}</Button
					>
				</div>
			</div>
		</div>
	</div>
</div>
