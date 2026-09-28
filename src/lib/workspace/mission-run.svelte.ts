import { appendBlock, findBlock, removeBlock, setParam } from '$lib/blocks/edit';
import { countBlocks, toPython } from '$lib/blocks/generator';
import type { BlockNode, BlockType } from '$lib/blocks/types';
import { t } from '$lib/i18n/de';
import { isGoalReached } from '$lib/missions/goal';
import type { Mission } from '$lib/missions/schema';
import { calcStars, type Stars } from '$lib/missions/stars';
import type { PythonRunner } from '$lib/runtime/client';
import type { RunResult } from '$lib/sim/result';
import { Player } from '$lib/stage/player.svelte';
import { buildTimeline, startPose } from '$lib/stage/timeline';

export type RunStatus = 'idle' | 'running' | 'success' | 'fail';

function outcomeMessage(result: RunResult): string {
	if (result.stop) return t.stops[result.stop.code];
	if (result.pyError) return result.pyError.message;
	return result.final.flying ? t.outcome.stillFlying : t.outcome.missed;
}

/** State and rules of one mission attempt: program editing, running, result. */
export class MissionRun {
	program = $state<BlockNode[]>([]);
	runs = $state(0);
	status = $state<RunStatus>('idle');
	message = $state<string | null>(null);
	stars = $state<Stars>(0);
	readonly player = new Player();
	python = $derived(toPython(this.program));
	activeId = $derived(this.player.line ? (this.python.blockAt[this.player.line] ?? null) : null);

	constructor(
		private readonly mission: Mission,
		private readonly runner: Pick<PythonRunner, 'run'>
	) {
		this.player.reset(startPose(mission.map.start), mission.map.rows);
	}

	add(type: BlockType) {
		this.edit(appendBlock(this.program, type));
	}

	remove(id: string) {
		this.edit(removeBlock(this.program, id));
	}

	step(id: string, delta: number) {
		const node = findBlock(this.program, id);
		if (node?.n !== undefined) this.edit(setParam(this.program, id, node.n + delta));
	}

	resetStage() {
		this.player.reset(startPose(this.mission.map.start), this.mission.map.rows);
		this.status = 'idle';
		this.message = null;
	}

	async run() {
		if (this.status === 'running' || this.program.length === 0) return;
		this.resetStage();
		this.status = 'running';
		this.runs += 1;
		let result: RunResult;
		try {
			result = await this.runner.run(this.python.code, this.mission);
		} catch {
			this.status = 'fail';
			this.message = t.app.loadFailed;
			return;
		}
		const finished = await this.player.play(buildTimeline(this.mission.map.start, result.events));
		if (!finished) {
			if (this.status === 'running') this.status = 'idle';
			return;
		}
		if (isGoalReached(this.mission, result)) {
			this.stars = calcStars(
				{ reached: true, blockCount: countBlocks(this.program), runs: this.runs },
				this.mission.stars
			);
			this.status = 'success';
			this.message = t.workspace.success;
		} else {
			this.status = 'fail';
			this.message = outcomeMessage(result);
		}
	}

	private edit(next: BlockNode[]) {
		if (this.status === 'running') return;
		this.program = next;
		if (this.status !== 'idle') this.resetStage();
	}
}
