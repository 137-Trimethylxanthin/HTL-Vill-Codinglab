import {
	appendBlock,
	canInsert,
	createBlock,
	findBlock,
	insertBlock,
	MAX_BLOCKS,
	moveBlock,
	removeBlock,
	setParam,
	type DropTarget
} from '$lib/blocks/edit';
import { countBlocks, numberLines, toPython } from '$lib/blocks/generator';
import type { BlockNode, BlockType } from '$lib/blocks/types';
import type { DragSource } from '$lib/dnd/types';
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
	/** Short hint about the last edit (e.g. program full). */
	notice = $state<string | null>(null);
	stars = $state<Stars>(0);
	speed = $state<1 | 2>(1);
	readonly player = new Player();
	python = $derived(toPython(this.program));
	numberTargets = $derived(numberLines(this.program, this.python));
	activeId = $derived(this.player.line ? (this.python.blockAt[this.player.line] ?? null) : null);

	constructor(
		private readonly mission: Mission,
		private readonly runner: Pick<PythonRunner, 'run'>
	) {
		this.program = structuredClone(mission.starter ?? []);
		this.player.reset(startPose(mission.map.start), mission.map.rows);
	}

	add(type: BlockType): string | null {
		if (this.status === 'running') return null;
		const next = appendBlock(this.program, type);
		if (next === this.program) {
			this.notice = t.workspace.full;
			return null;
		}
		this.edit(next);
		return next[next.length - 1].id;
	}

	insert(type: BlockType, target: DropTarget): string | null {
		if (this.status === 'running') return null;
		const node = createBlock(type);
		const next = insertBlock(this.program, node, target);
		if (next === this.program) {
			if (countBlocks(this.program) >= MAX_BLOCKS) this.notice = t.workspace.full;
			return null;
		}
		this.edit(next);
		return node.id;
	}

	move(id: string, target: DropTarget) {
		this.edit(moveBlock(this.program, id, target));
	}

	remove(id: string) {
		this.edit(removeBlock(this.program, id));
	}

	step(id: string, delta: number) {
		const node = findBlock(this.program, id);
		if (node?.n !== undefined) this.edit(setParam(this.program, id, node.n + delta));
	}

	canDrop(source: DragSource, target: DropTarget): boolean {
		if (this.status === 'running') return false;
		if (source.kind === 'palette') {
			return (
				countBlocks(this.program) < MAX_BLOCKS &&
				canInsert(this.program, createBlock(source.type), target)
			);
		}
		const node = findBlock(this.program, source.id);
		return node !== undefined && canInsert(removeBlock(this.program, source.id), node, target);
	}

	toggleSpeed() {
		this.speed = this.speed === 1 ? 2 : 1;
	}

	resetStage() {
		this.player.reset(startPose(this.mission.map.start), this.mission.map.rows);
		this.status = 'idle';
		this.message = null;
	}

	stop() {
		if (this.status !== 'running') return;
		this.player.stop();
		this.resetStage();
	}

	async run() {
		if (this.status === 'running' || this.program.length === 0) return;
		this.resetStage();
		this.notice = null;
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
		if (this.status !== 'running') return;
		const finished = await this.player.play(
			buildTimeline(this.mission.map.start, result.events),
			this.speed
		);
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
		if (this.status === 'running' || next === this.program) return;
		this.program = next;
		this.notice = null;
		if (this.status !== 'idle') this.resetStage();
	}
}
