<script lang="ts">
	import {
		FastForward,
		Map as MapIcon,
		Play,
		RotateCcw,
		SkipForward,
		Square,
		Star
	} from '@lucide/svelte';
	import type { MissionResult } from '$lib/session/types';
	import { untrack } from 'svelte';
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
	import { blockColor } from './colors';
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
		onBack,
		onSkip,
		onSolved,
		onDone,
		onActivity
	}: {
		mission: Mission;
		runner: PythonRunner;
		onBack: () => void;
		onSkip: () => void;
		/** Called as soon as a run succeeds, so leaving via "Karte" keeps the stars. */
		onSolved: (result: MissionResult) => void;
		onDone: (result: MissionResult) => void;
		/** Watching a flight counts as activity: the idle reset must not fire mid-flight. */
		onActivity?: () => void;
	} = $props();

	let tab = $state<'program' | 'python'>('program');

	$effect(() => {
		if (ctrl.status !== 'running') return;
		const timer = setInterval(() => onActivity?.(), 5000);
		return () => {
			clearInterval(timer);
			// The idle time counts from the end of the flight.
			untrack(() => onActivity?.());
		};
	});

	// Only the status is tracked: recording reads and writes session state.
	$effect(() => {
		if (ctrl.status === 'success') untrack(() => onSolved(ctrl.result()));
	});

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
	const ROW_GAP = 0; // blocks sit flush: each tab fills the notch of the block below

	/**
	 * Where an element sits once every running slide/scale animation has finished, in screen
	 * coordinates. Blocks animate towards their place while the gap moves; measuring them in
	 * flight would make the drop target flip back and forth under a resting pointer.
	 */
	function layoutBox(el: HTMLElement, scroller: HTMLElement) {
		let left = 0;
		let top = 0;
		for (let p: HTMLElement | null = el; p && p !== scroller; p = p.offsetParent as HTMLElement) {
			left += p.offsetLeft;
			top += p.offsetTop;
		}
		const view = scroller.getBoundingClientRect();
		left += view.left + scroller.clientLeft - scroller.scrollLeft;
		top += view.top + scroller.clientTop - scroller.scrollTop;
		return { left, top, right: left + el.offsetWidth, bottom: top + el.offsetHeight };
	}

	/** Reads every visible drop list in the program panel, in screen coordinates. */
	function readLists(scroller: HTMLElement): { el: HTMLElement; geom: ListGeom }[] {
		const view = scroller.getBoundingClientRect();
		return [...scroller.querySelectorAll<HTMLElement>('[data-drop-slot]')].flatMap((el) => {
			const r = layoutBox(el, scroller);
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
					const h = layoutBox((c.firstElementChild as HTMLElement | null) ?? c, scroller);
					return (h.top + h.bottom) / 2;
				});
			return [{ el, geom: { left: r.left, right: r.right, top, bottom, depth, mids } }];
		});
	}

	function readGap(scroller: HTMLElement): Gap | null {
		const li = scroller.querySelector<HTMLElement>('[data-drop-gap]')?.closest('li');
		if (!li) return null;
		const r = layoutBox(li, scroller);
		return { top: r.top, height: r.bottom - r.top + ROW_GAP, left: r.left, right: r.right };
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
		const before = scroller.scrollTop;
		scroller.scrollTop += scrollSpeed;
		// Already at the end: nothing moved, so keep the frame loop but skip the hit test.
		if (scroller.scrollTop !== before) drag.refresh();
		scrollFrame = requestAnimationFrame(scrollStep);
	}

	function stopScroll() {
		cancelAnimationFrame(scrollFrame);
		scrollFrame = 0;
		scrollSpeed = 0;
	}

	const drag = new DragController(hitTest, (source, target) => ctrl.canDrop(source, target), apply);

	// Idle reset or navigation can unmount us mid-run or mid-drag: leave nothing running.
	$effect(() => {
		const current = ctrl;
		return () => {
			drag.cancel();
			current.dispose();
			clearTimeout(landTimer);
		};
	});

	// Long palettes (e.g. 3.2, or portrait) overflow; only then may a finger scroll them.
	let paletteBox = $state<HTMLElement>();
	let paletteScrolls = $state(false);
	$effect(() => {
		const box = paletteBox;
		if (!box) return;
		const measure = () => {
			paletteScrolls = box.scrollHeight > box.clientHeight || box.scrollWidth > box.clientWidth;
		};
		const observer = new ResizeObserver(measure);
		observer.observe(box);
		for (const child of box.children) observer.observe(child);
		measure();
		return () => observer.disconnect();
	});

	// The drop gap is as tall as the block being moved, so nothing jumps when it lands.
	let gapHeight = $state<number | null>(null);

	function grab(source: DragSource, e: PointerEvent) {
		if (ctrl.status === 'running' || e.button > 0) return;
		const el = e.currentTarget as HTMLElement;
		// A just-landed block is still squished: keep the grab point, but at its real size.
		const r = el.getBoundingClientRect();
		const sx = r.width ? el.offsetWidth / r.width : 1;
		const sy = r.height ? el.offsetHeight / r.height : 1;
		const rect = {
			left: e.clientX - (e.clientX - r.left) * sx,
			top: e.clientY - (e.clientY - r.top) * sy,
			width: el.offsetWidth
		};
		drag.press(source, e.clientX, e.clientY, rect, e.pointerId);
		gapHeight = source.kind === 'program' ? (el.closest('li')?.offsetHeight ?? null) : null;
	}

	// Each Python line gets the colour of the block it came from.
	const lineColors = $derived(
		Object.fromEntries(
			Object.entries(ctrl.python.blockAt).flatMap(([line, id]) => {
				const node = findBlock(ctrl.program, id);
				return node ? [[Number(line), blockColor(node.type)]] : [];
			})
		)
	);

	const ghost = $derived.by(() => {
		const source = drag.active;
		if (!source) return null;
		if (source.kind === 'palette')
			return { type: source.type, n: BLOCKS[source.type].param?.default };
		const node = findBlock(ctrl.program, source.id);
		return node ? { type: node.type, n: node.n } : null;
	});

	async function run() {
		coach.pause();
		await ctrl.run();
		if (ctrl.status === 'success') coach.succeeded();
		else if (ctrl.status === 'fail') coach.failed();
		// A superseded run returns while a newer one flies: leave the coach paused then.
		else if (ctrl.status !== 'running') coach.activity();
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

<div
	class="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-4 bg-sky p-4 portrait:gap-3 portrait:p-3"
>
	<header class="flex items-center gap-3 rounded-3xl bg-card px-3 py-3 shadow-sm">
		<Button
			variant="ghost"
			class="h-14 min-w-14 shrink-0 press rounded-2xl px-4 text-lg"
			aria-label={t.workspace.back}
			onclick={() => onBack()}
			><MapIcon class="size-7" /><span class="max-md:hidden">{t.workspace.back}</span></Button
		>
		<span class="rounded-xl bg-drone px-3 py-1 font-display text-xl font-bold text-drone-foreground"
			>{mission.id}</span
		>
		<div class="min-w-0 grow">
			<h1 class="truncate text-3xl font-bold portrait:text-2xl">{mission.title}</h1>
			<p class="text-lg text-muted-foreground portrait:text-base">{mission.goalText}</p>
		</div>
		<Button
			variant="ghost"
			class="h-14 min-w-14 shrink-0 press rounded-2xl px-4 text-lg"
			aria-label={t.workspace.skip}
			disabled={ctrl.status === 'running'}
			onclick={() => onSkip()}
			><span class="max-md:hidden">{t.workspace.skip}</span><SkipForward class="size-6" /></Button
		>
	</header>

	<div
		class="grid min-h-0 gap-4 portrait:grid-rows-[minmax(0,42fr)_auto_minmax(0,58fr)] portrait:gap-3 landscape:grid-cols-[minmax(13rem,0.8fr)_minmax(24rem,1.4fr)_minmax(20rem,1.4fr)]"
	>
		<div
			data-drop-trash
			bind:this={paletteBox}
			class={cn(
				'min-h-0 overflow-y-auto rounded-3xl bg-card/70 p-4 transition-colors portrait:row-start-2 portrait:overflow-x-auto portrait:overflow-y-hidden portrait:p-3',
				drag.hover?.kind === 'trash' && 'bg-destructive/15'
			)}
		>
			<BlockPalette
				blocks={mission.blocks}
				scrollable={paletteScrolls}
				disabled={ctrl.status === 'running'}
				onGrab={(type, e) => grab({ kind: 'palette', type }, e)}
				onAdd={(type) => apply({ kind: 'tap', source: { kind: 'palette', type } })}
			/>
		</div>

		<div
			data-drop-panel
			class="flex min-h-0 min-w-0 flex-col gap-4 rounded-3xl bg-card/70 p-4 portrait:row-start-3 portrait:gap-3 portrait:p-3"
		>
			<div class="flex gap-2 landscape:hidden">
				<Button
					variant={tab === 'program' ? 'default' : 'secondary'}
					class="h-14 grow press rounded-2xl text-lg"
					onclick={() => (tab = 'program')}>{t.workspace.showProgram}</Button
				>
				<Button
					variant={tab === 'python' ? 'default' : 'secondary'}
					class="h-14 grow press rounded-2xl text-lg"
					onclick={() => (tab = 'python')}>{t.workspace.showPython}</Button
				>
			</div>
			<div
				class={cn(
					'flex min-h-0 min-w-0 flex-col landscape:flex-[3]',
					tab === 'python' ? 'portrait:hidden' : 'portrait:flex-1'
				)}
			>
				<ProgramList
					program={ctrl.program}
					activeId={ctrl.activeId}
					locked={ctrl.status === 'running'}
					draggingId={drag.active?.kind === 'program' && !drag.rejected ? drag.active.id : null}
					hover={drag.hover?.kind === 'slot' ? drag.hover.target : null}
					{landedId}
					{gapHeight}
					gapType={ghost?.type ?? null}
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
			</div>
			<div
				class={cn(
					'flex min-h-0 min-w-0 flex-col landscape:flex-[2]',
					tab === 'program' ? 'portrait:hidden' : 'portrait:flex-1'
				)}
			>
				<PythonView
					code={ctrl.python.code}
					activeLine={ctrl.player.line}
					numberTargets={ctrl.numberTargets}
					{lineColors}
					onNumber={mission.editablePython && ctrl.status !== 'running'
						? (id, delta) => {
								coach.activity();
								ctrl.step(id, delta);
							}
						: undefined}
				/>
			</div>
		</div>

		<div
			class="relative grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4 rounded-3xl bg-card/70 p-4 portrait:row-start-1 portrait:gap-2 portrait:p-3"
		>
			<div class="relative min-h-0">
				<DroneStage player={ctrl.player} fog={mission.fog} />
				<Coach {coach} />
			</div>
			<div class="flex flex-col gap-3 portrait:gap-2">
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
							'rounded-2xl px-4 py-3 text-center text-xl font-bold portrait:py-2',
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
							<Button
								class="mt-2 h-14 press rounded-2xl bg-white px-8 text-xl font-bold text-success"
								onclick={() => onDone(ctrl.result())}>{t.workspace.next}</Button
							>
						{/if}
					</div>
				{/if}
				<div class="flex gap-3 portrait:gap-2">
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
