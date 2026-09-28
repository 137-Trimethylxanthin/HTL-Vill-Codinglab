<script lang="ts">
	import {
		ChevronLeft,
		ChevronRight,
		FastForward,
		Play,
		RotateCcw,
		Square,
		Star
	} from '@lucide/svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { Button } from '$lib/components/ui/button/index.js';
	import { findBlock, type Slot } from '$lib/blocks/edit';
	import { BLOCKS } from '$lib/blocks/registry';
	import { DragController } from '$lib/dnd/controller.svelte';
	import { edgeSpeed, pickTarget, type Gap, type ListGeom } from '$lib/dnd/geometry';
	import type { DragSource, DropOp, HitResult } from '$lib/dnd/types';
	import { t } from '$lib/i18n/de';
	import type { Mission } from '$lib/missions/schema';
	import type { PythonRunner } from '$lib/runtime/client';
	import DroneStage from '$lib/stage/DroneStage.svelte';
	import { cn } from '$lib/utils';
	import BlockPalette from './BlockPalette.svelte';
	import Coach from './Coach.svelte';
	import { CoachState } from './coach.svelte';
	import Confetti from './Confetti.svelte';
	import DragLayer from './DragLayer.svelte';
	import { MissionRun } from './mission-run.svelte';
	import ProgramList from './ProgramList.svelte';
	import PythonView from './PythonView.svelte';

	let {
		mission,
		runner,
		onPrev,
		onNext
	}: {
		mission: Mission;
		runner: PythonRunner;
		onPrev?: () => void;
		onNext?: () => void;
	} = $props();

	// The page re-creates this component per mission ({#key}), so these live for one mission.
	const ctrl = $derived(new MissionRun(mission, runner));
	const coach = $derived(new CoachState(mission.hints));
	$effect(() => {
		const current = coach;
		return () => current.dispose();
	});

	let landedId = $state<string | null>(null);
	let landTimer: ReturnType<typeof setTimeout> | undefined;

	function landed(id: string | null) {
		if (!id) return;
		landedId = id;
		clearTimeout(landTimer);
		landTimer = setTimeout(() => (landedId = null), 450);
		navigator.vibrate?.(8);
	}

	function apply(op: DropOp) {
		coach.activity();
		switch (op.kind) {
			case 'tap':
				if (op.source.kind === 'palette') landed(ctrl.add(op.source.type));
				break;
			case 'insert':
				landed(ctrl.insert(op.type, op.target));
				break;
			case 'move':
				ctrl.move(op.id, op.target);
				landed(op.id);
				break;
			case 'remove':
				ctrl.remove(op.id);
				break;
			case 'cancel':
				break;
		}
	}

	const MAGNET_PX = 40;
	const ROW_GAP = 8; // gap-2 between list items

	/** Reads every visible drop list in the program panel, in screen coordinates. */
	function readLists(scroller: HTMLElement): { el: HTMLElement; geom: ListGeom }[] {
		const view = scroller.getBoundingClientRect();
		return [...scroller.querySelectorAll<HTMLElement>('[data-drop-slot]')].flatMap((el) => {
			const r = el.getBoundingClientRect();
			const top = Math.max(r.top, view.top);
			const bottom = Math.min(r.bottom, view.bottom);
			if (bottom <= top) return []; // scrolled out of view
			let depth = 0;
			for (let p = el.parentElement; p && p !== scroller; p = p.parentElement) {
				if (p.dataset.dropSlot !== undefined) depth++;
			}
			// Containers count by their header tile, so "below the header" means "into the body".
			const mids = [...el.children]
				.filter(
					(c): c is HTMLElement => c instanceof HTMLElement && c.dataset.blockId !== undefined
				)
				.map((c) => {
					const h = (c.firstElementChild ?? c).getBoundingClientRect();
					return h.top + h.height / 2;
				});
			return [{ el, geom: { left: r.left, right: r.right, top, bottom, depth, mids } }];
		});
	}

	function readGap(scroller: HTMLElement): Gap | null {
		const li = scroller.querySelector<HTMLElement>('[data-drop-gap]')?.closest('li');
		if (!li) return null;
		const r = li.getBoundingClientRect();
		// offsetHeight ignores the grow-in scale animation.
		return { top: r.top, height: li.offsetHeight + ROW_GAP, left: r.left, right: r.right };
	}

	function hitTest(x: number, y: number): HitResult {
		const els = document.elementsFromPoint(x, y);
		if (els.some((el) => el.closest('[data-drop-trash]'))) return { kind: 'trash' };
		const scroller = document.querySelector<HTMLElement>('[data-drop-scroll]');
		if (scroller) {
			const lists = readLists(scroller);
			const pick = pickTarget(
				lists.map((l) => l.geom),
				x,
				y,
				readGap(scroller),
				MAGNET_PX
			);
			if (pick?.kind === 'gap') return drag.hover;
			if (pick?.kind === 'list') {
				const list = lists[pick.list].el;
				return {
					kind: 'slot',
					target: {
						parent: list.dataset.dropParent || null,
						slot: (list.dataset.dropSlot as Slot) ?? 'body',
						index: pick.index
					}
				};
			}
		}
		if (els.some((el) => el.closest('[data-drop-panel]'))) {
			return { kind: 'slot', target: { parent: null, slot: 'body', index: ctrl.program.length } };
		}
		return null;
	}

	// Auto-scroll the program list while dragging near its top or bottom edge.
	let scrollFrame = 0;
	let scrollSpeed = 0;

	function autoScroll(x: number, y: number) {
		const scroller = document.querySelector<HTMLElement>('[data-drop-scroll]');
		if (!scroller || !drag.active) return stopScroll();
		const r = scroller.getBoundingClientRect();
		scrollSpeed = x >= r.left && x <= r.right ? edgeSpeed(y, r.top, r.bottom) : 0;
		if (scrollSpeed !== 0 && scrollFrame === 0) scrollFrame = requestAnimationFrame(scrollStep);
	}

	function scrollStep() {
		scrollFrame = 0;
		const scroller = document.querySelector<HTMLElement>('[data-drop-scroll]');
		if (!scroller || scrollSpeed === 0 || !drag.active) return;
		scroller.scrollTop += scrollSpeed;
		drag.refresh();
		scrollFrame = requestAnimationFrame(scrollStep);
	}

	function stopScroll() {
		cancelAnimationFrame(scrollFrame);
		scrollFrame = 0;
		scrollSpeed = 0;
	}

	const drag = new DragController(hitTest, (source, target) => ctrl.canDrop(source, target), apply);

	function grab(source: DragSource, e: PointerEvent) {
		if (ctrl.status === 'running' || e.button > 0) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		drag.press(source, e.clientX, e.clientY, rect, e.pointerId);
	}

	const ghost = $derived.by(() => {
		const source = drag.active;
		if (!source) return null;
		if (source.kind === 'palette')
			return { type: source.type, n: BLOCKS[source.type].param?.default };
		const node = findBlock(ctrl.program, source.id);
		return node ? { type: node.type, n: node.n } : null;
	});

	async function run() {
		coach.activity();
		await ctrl.run();
		if (ctrl.status === 'success') coach.succeeded();
		else if (ctrl.status === 'fail') coach.failed();
	}
</script>

<svelte:window
	onpointermove={(e) => {
		drag.move(e.clientX, e.clientY, e.pointerId);
		autoScroll(e.clientX, e.clientY);
	}}
	onpointerup={(e) => {
		drag.end(e.pointerId);
		stopScroll();
	}}
	onpointercancel={(e) => {
		drag.cancel(e.pointerId);
		stopScroll();
	}}
	onblur={() => {
		drag.cancel();
		stopScroll();
	}}
/>

<div class="grid h-full grid-rows-[auto_1fr] gap-4 bg-sky p-4">
	<header class="flex items-center gap-3 rounded-3xl bg-card px-3 py-3 shadow-sm">
		<Button
			variant="ghost"
			class="size-14 press rounded-2xl"
			aria-label={t.workspace.prevMission}
			disabled={!onPrev}
			onclick={() => onPrev?.()}><ChevronLeft class="size-8" /></Button
		>
		<span class="rounded-xl bg-drone px-3 py-1 font-display text-xl font-bold text-drone-foreground"
			>{mission.id}</span
		>
		<div class="min-w-0 grow">
			<h1 class="text-3xl font-bold">{mission.title}</h1>
			<p class="text-lg text-muted-foreground">{mission.goalText}</p>
		</div>
		<Button
			variant="ghost"
			class="size-14 press rounded-2xl"
			aria-label={t.workspace.nextMission}
			disabled={!onNext}
			onclick={() => onNext?.()}><ChevronRight class="size-8" /></Button
		>
	</header>

	<div
		class="grid min-h-0 grid-cols-[minmax(13rem,0.8fr)_minmax(24rem,1.4fr)_minmax(20rem,1.4fr)] gap-4"
	>
		<div
			data-drop-trash
			class={cn(
				'min-h-0 overflow-y-auto rounded-3xl bg-card/70 p-4 transition-colors',
				drag.hover?.kind === 'trash' && 'bg-destructive/15'
			)}
		>
			<BlockPalette
				blocks={mission.blocks}
				disabled={ctrl.status === 'running'}
				onGrab={(type, e) => grab({ kind: 'palette', type }, e)}
				onAdd={(type) => apply({ kind: 'tap', source: { kind: 'palette', type } })}
			/>
		</div>

		<div
			data-drop-panel
			class="grid min-h-0 min-w-0 grid-cols-1 grid-rows-[minmax(0,3fr)_minmax(0,2fr)] gap-4 rounded-3xl bg-card/70 p-4 [&>*]:min-w-0"
		>
			<ProgramList
				program={ctrl.program}
				activeId={ctrl.activeId}
				locked={ctrl.status === 'running'}
				draggingId={drag.active?.kind === 'program' ? drag.active.id : null}
				hover={drag.hover?.kind === 'slot' ? drag.hover.target : null}
				{landedId}
				onRemove={(id) => {
					coach.activity();
					ctrl.remove(id);
				}}
				onStep={(id, delta) => {
					coach.activity();
					ctrl.step(id, delta);
				}}
				onGrab={(id, e) => grab({ kind: 'program', id }, e)}
			/>
			<PythonView
				code={ctrl.python.code}
				activeLine={ctrl.player.line}
				numberTargets={ctrl.numberTargets}
				onNumber={mission.editablePython && ctrl.status !== 'running'
					? (id, delta) => {
							coach.activity();
							ctrl.step(id, delta);
						}
					: undefined}
			/>
		</div>

		<div class="relative grid min-h-0 grid-rows-[1fr_auto] gap-4 rounded-3xl bg-card/70 p-4">
			<div class="relative min-h-0">
				<DroneStage player={ctrl.player} fog={mission.fog} />
				<Coach {coach} />
			</div>
			<div class="flex flex-col gap-3">
				{#if ctrl.notice}
					<p
						class="rounded-2xl bg-warn px-4 py-2 text-center text-lg font-bold text-warn-foreground"
					>
						{ctrl.notice}
					</p>
				{/if}
				{#if ctrl.message}
					<div
						class={cn(
							'rounded-2xl px-4 py-3 text-center text-xl font-bold',
							ctrl.status === 'success' ? 'bg-success text-white' : 'bg-warn text-warn-foreground'
						)}
					>
						{ctrl.message}
						{#if ctrl.status === 'success'}
							<span class="mt-1 flex justify-center gap-1">
								{#each [1, 2, 3] as i (i)}
									<span class="star-pop" style:animation-delay="{i * 160}ms">
										<Star
											class={cn(
												'size-9',
												i <= ctrl.stars ? 'fill-yellow-300 text-yellow-300' : 'text-white/50'
											)}
										/>
									</span>
								{/each}
							</span>
							{#if onNext}
								<Button
									class="mt-2 h-14 press rounded-2xl bg-white px-8 text-xl font-bold text-success"
									onclick={() => onNext?.()}
									>{t.workspace.next}<ChevronRight class="size-6" /></Button
								>
							{/if}
						{/if}
					</div>
				{/if}
				<div class="flex gap-3">
					{#if ctrl.status === 'running'}
						<Button
							class="h-16 grow press rounded-2xl bg-destructive text-2xl font-bold text-white"
							onclick={() => ctrl.stop()}><Square class="size-7" />{t.workspace.stop}</Button
						>
					{:else}
						<Button
							class="h-16 grow press rounded-2xl bg-drone text-2xl font-bold text-drone-foreground"
							disabled={ctrl.program.length === 0}
							onclick={run}><Play class="size-7" />{t.workspace.start}</Button
						>
					{/if}
					<Button
						variant="secondary"
						class="size-16 press rounded-2xl"
						aria-label={t.workspace.speed}
						aria-pressed={ctrl.speed === 2}
						onclick={() => ctrl.toggleSpeed()}
						><FastForward class={cn('size-7', ctrl.speed === 2 && 'text-drone')} /></Button
					>
					<Button
						variant="secondary"
						class="h-16 press rounded-2xl px-5 text-xl"
						disabled={ctrl.status === 'running'}
						onclick={() => ctrl.resetStage()}
						><RotateCcw class="size-6" />{t.workspace.reset}</Button
					>
				</div>
			</div>
			{#if ctrl.status === 'success' && !prefersReducedMotion.current}
				<Confetti />
			{/if}
		</div>
	</div>
</div>

<DragLayer {drag} {ghost} />
