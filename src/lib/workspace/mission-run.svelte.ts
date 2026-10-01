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
import type { MissionResult } from '$lib/session/types';
import type { RunResult } from '$lib/sim/result';
import { Player } from '$lib/stage/player.svelte';
import { buildTimeline, startPose, type Frame } from '$lib/stage/timeline';
import { loopSpans, nextRounds, type LoopSpan } from './rounds';

/** Stop taps this soon after Start (and Start taps this soon after Stop) are ignored: double taps on the same spot. */
export const STOP_GUARD_MS = 400;

export type RunStatus = 'idle' | 'running' | 'success' | 'fail';

function outcomeMessage(result: RunResult): string {
	if (result.stop) return t.stops[result.stop.code];
	if (result.pyError) return result.pyError.message;
	return result.final.flying ? t.outcome.stillFlying : t.outcome.missed;
}

/** A run in progress: its result and how far the animation got. */
interface Flight {
	gen: number;
	result: RunResult;
	frames: Frame[];
	next: number;
	spans: LoopSpan[];
	prev: Frame | null;
}

/** " Das war Block 3: „Vorwärts 4“." for the block where the run stopped (counted top to bottom). */
export function blameFor(program: BlockNode[], id: string | null): string {
	if (!id) return '';
	const order: BlockNode[] = [];
	const walk = (nodes: BlockNode[]) =>
		nodes.forEach((n) => {
			order.push(n);
			walk(n.children ?? []);
			walk(n.else ?? []);
		});
	walk(program);
	const at = order.findIndex((n) => n.id === id);
	if (at < 0) return '';
	const node = order[at];
	const label = node.n === undefined ? t.blocks[node.type] : `${t.blocks[node.type]} ${node.n}`;
	return ' ' + t.outcome.blame(at + 1, label);
}

/** State and rules of one mission attempt: program editing, running, result. */
export class MissionRun {
	program = $state<BlockNode[]>([]);
	runs = $state(0);
	/** Failed runs in a row on this mission (a sign the child is stuck). */
	fails = $state(0);
	/** The last success came right after a failed run: the child found and fixed a bug. */
	fixed = $state(false);
	/** Step-by-step mode: the flight advances one drone move per tap. */
	stepping = $state(false);
	/** A step is animating: further taps wait (while the program runs, status is 'running'). */
	stepBusy = $state(false);
	private flight: Flight | null = null;
	status = $state<RunStatus>('idle');
	message = $state<string | null>(null);
	/** Short hint about the last edit (e.g. program full). */
	notice = $state<string | null>(null);
	stars = $state<Stars>(0);
	speed = $state<1 | 2>(1);
	/** Round of each running repeat loop (block id → round), while the drone flies. */
	rounds = $state<Record<string, number>>({});
	/** Block where the last run crashed or stopped with an error. */
	failedId = $state<string | null>(null);
	/** Called for every animation frame (sound effects). */
	onFrame?: (frame: Frame) => void;
	readonly player = new Player();
	private readonly startedAt = Date.now();
	private runStartedAt = 0;
	private stoppedAt = 0;
	/** Bumped whenever a run is abandoned, so a late-waking old run cannot touch a newer one. */
	private gen = 0;
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

	result(): MissionResult {
		return {
			id: this.mission.id,
			stars: this.stars,
			runs: this.runs,
			blocks: countBlocks(this.program),
			seconds: Math.round((Date.now() - this.startedAt) / 1000),
			skipped: false,
			path: [...this.player.visited]
		};
	}

	/** Leaving the mission (navigation, idle reset): stop at once, no double-tap guard. */
	dispose() {
		this.gen++;
		this.stepping = false;
		this.stepBusy = false;
		this.flight = null;
		this.player.stop();
		this.status = 'idle';
		this.message = null;
	}

	resetStage() {
		this.gen++;
		this.fixed = false;
		this.stepping = false;
		this.stepBusy = false;
		this.flight = null;
		this.rounds = {};
		this.failedId = null;
		this.player.reset(startPose(this.mission.map.start), this.mission.map.rows);
		this.status = 'idle';
		this.message = null;
	}

	stop() {
		if (this.status !== 'running') return;
		if (Date.now() - this.runStartedAt < STOP_GUARD_MS) return;
		this.player.stop();
		this.resetStage();
		this.stoppedAt = Date.now();
	}

	/** Start: play the whole flight. While stepping, play the rest of it. */
	async run() {
		if (this.stepping) return this.resume();
		const flight = await this.begin();
		if (!flight) return;
		if (await this.fly(flight, flight.frames)) this.finish(flight);
	}

	/** Step-by-step: one drone move per tap; the first tap runs the program. */
	async advance() {
		if (this.stepBusy) return;
		let flight = this.flight;
		if (!this.stepping) {
			this.stepBusy = true;
			flight = await this.begin();
			this.stepBusy = false;
			if (!flight) return;
			this.flight = flight;
			this.stepping = true;
		}
		if (!flight) return;
		const frame = flight.frames[flight.next];
		if (frame) {
			this.stepBusy = true;
			const done = await this.fly(flight, [frame], true);
			this.stepBusy = false;
			if (!done) return;
			flight.next += 1;
		}
		if (flight.next >= flight.frames.length) this.finish(flight);
	}

	private async resume() {
		const flight = this.flight;
		if (!flight || this.stepBusy) return;
		this.stepping = false;
		if (await this.fly(flight, flight.frames.slice(flight.next))) this.finish(flight);
	}

	/** Runs the Python and prepares the animation; null if not allowed or superseded. */
	private async begin(): Promise<Flight | null> {
		if (this.status === 'running' || this.program.length === 0) return null;
		if (Date.now() - this.stoppedAt < STOP_GUARD_MS) return null;
		this.resetStage();
		const gen = this.gen;
		this.notice = null;
		this.status = 'running';
		this.runStartedAt = Date.now();
		this.runs += 1;
		let result: RunResult;
		try {
			result = await this.runner.run(this.python.code, this.mission);
		} catch {
			if (gen !== this.gen) return null;
			this.status = 'fail';
			this.message = t.app.loadFailed;
			return null;
		}
		if (gen !== this.gen) return null;
		return {
			gen,
			result,
			frames: buildTimeline(this.mission.map.start, result.events),
			next: 0,
			spans: loopSpans(this.program, this.python.lineOf),
			prev: null
		};
	}

	/** Animates frames of the flight; false if it was stopped or superseded meanwhile. */
	private async fly(flight: Flight, frames: Frame[], hold = false): Promise<boolean> {
		const finished = await this.player.play(
			frames,
			() => this.speed,
			(frame) => {
				this.rounds = nextRounds(this.rounds, flight.spans, flight.prev, frame);
				flight.prev = frame;
				this.onFrame?.(frame);
			},
			hold
		);
		if (flight.gen !== this.gen) return false;
		if (!finished) {
			this.status = 'idle';
			return false;
		}
		return true;
	}

	private finish({ result }: Flight) {
		this.stepping = false;
		this.flight = null;
		this.player.line = null;
		this.player.sensing = null;
		if (isGoalReached(this.mission, result)) {
			this.stars = calcStars(
				{ reached: true, blockCount: countBlocks(this.program), runs: this.runs },
				this.mission.stars
			);
			this.status = 'success';
			this.message = t.workspace.success;
			this.fixed = this.fails > 0;
			this.fails = 0;
		} else {
			this.status = 'fail';
			this.fails += 1;
			const line = result.stop?.line ?? result.pyError?.line;
			this.failedId = line ? (this.python.blockAt[line] ?? null) : null;
			this.message = outcomeMessage(result) + blameFor(this.program, this.failedId);
		}
	}

	private edit(next: BlockNode[]) {
		if (this.status === 'running' || next === this.program) return;
		this.program = next;
		this.notice = null;
		if (this.status !== 'idle') this.resetStage();
	}
}
