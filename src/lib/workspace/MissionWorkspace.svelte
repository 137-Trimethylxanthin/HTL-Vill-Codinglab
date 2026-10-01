<script lang="ts" module>
	// Survives the {#key} re-creation of the workspace.
	let lastAnnounced = '';
</script>

<script lang="ts">
	import {
		FastForward,
		Footprints,
		Map as MapIcon,
		Play,
		RotateCcw,
		SkipForward,
		Square,
		Star,
		Users
	} from '@lucide/svelte';
	import type { MissionResult } from '$lib/session/types';
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		blockTypes,
		createBlock,
		findBlock,
		insertBlock,
		moveBlock,
		type Slot
	} from '$lib/blocks/edit';
	import { BLOCKS } from '$lib/blocks/registry';
	import { DragController } from '$lib/dnd/controller.svelte';
	import { edgeSpeed, pickTarget, type Gap, type ListGeom } from '$lib/dnd/geometry';
	import type { DragSource, DropOp, HitResult } from '$lib/dnd/types';
	import { t } from '$lib/i18n/de';
	import type { Mission } from '$lib/missions/schema';
	import type { PythonRunner } from '$lib/runtime/client';
	import DroneStage from '$lib/stage/DroneStage.svelte';
	import { longPress } from '$lib/ui/long-press';
	import { cn } from '$lib/utils';
	import type { BlockNode } from '$lib/blocks/types';
	import type { LivePose } from '$lib/session/status';
	import type { Frame } from '$lib/stage/timeline';
	import { play, type Effect } from '$lib/ui/sound';
	import BlockPalette from './BlockPalette.svelte';
	import Poof from './Poof.svelte';
	import { previewBlock, type Preview } from './preview';
	import { nextGuideStep } from './guide';
	import GuideHand from './GuideHand.svelte';
	import { SHOWCASE } from '$lib/missions';
	import { blockColor } from './colors';
	import Coach from './Coach.svelte';
	import { CoachState } from './coach.svelte';
	import Confetti from './Confetti.svelte';
	import DragLayer from './DragLayer.svelte';
	import HelpButton from './HelpButton.svelte';
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
		onActivity,
		help = false,
		onHelp,
		onSupervisor,
		onRuns,
		onFails,
		revealed = false,
		driver = null,
		maxStars = 3,
		announceKey = '',
		onLive,
		missions = SHOWCASE
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
		/** Supervisor tools: help request, hidden menu (hold the mission id), run count for the overview. */
		help?: boolean;
		onHelp?: () => void;
		onSupervisor?: () => void;
		onRuns?: (runs: number) => void;
		/** Failed runs in a row, for the supervisors' stuck alert. */
		onFails?: (fails: number) => void;
		/** A supervisor showed the solution: success earns no stars, so show none. */
		revealed?: boolean;
		/** Duo mode: which kid taps this mission (the other navigates). */
		driver?: 1 | 2 | null;
		/** Blocks were handed over to put in order: the success shows (and earns) fewer stars. */
		maxStars?: number;
		/** Changes with every new turn (duo), so a rebuild of the same turn stays quiet. */
		announceKey?: string;
		/** The blocks and the drone right now, for a master station's live view. */
		onLive?: (live: { program: BlockNode[]; pose: LivePose }) => void;
		/** Missions this station plays, in order (for the "Neu!" badges). */
		missions?: Mission[];
	} = $props();

	let tab = $state<'program' | 'python'>('program');

	// Duo mode: announce whose turn it is when the mission opens.
	// Once per mission: the page re-creates this component for every mission ({#key}).
	let swapBanner = $state(
		untrack(() => {
			// The workspace is also rebuilt for supervisor actions: announce each turn only once.
			const fresh = driver !== null && announceKey !== lastAnnounced;
			lastAnnounced = announceKey;
			return fresh;
		})
	);
	$effect(() => {
		if (!swapBanner) return;
		const timer = setTimeout(() => (swapBanner = false), 3200);
		return () => clearTimeout(timer);
	});
	const caller = $derived(driver === 1 ? 2 : 1);

	$effect(() => {
		// Stepping waits for taps (which count by themselves): a child who walks away must time out.
		if (ctrl.status !== 'running' || ctrl.stepping) return;
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
	const FRAME_SOUNDS: Partial<Record<Frame['kind'], Effect>> = {
		takeoff: 'takeoff',
		land: 'land',
		crash: 'crash',
		photo: 'photo'
	};
	$effect(() => {
		ctrl.onFrame = (frame) => {
			const effect = FRAME_SOUNDS[frame.kind];
			if (effect) play(effect);
		};
	});
	const coach = $derived(new CoachState(mission.hints));
	$effect(() => onRuns?.(ctrl.runs));
	$effect(() => {
		const { x, y, heading, lift } = ctrl.player;
		onLive?.({
			program: ctrl.program,
			pose: {
				x: x.target,
				y: y.target,
				heading: heading.target,
				flying: lift.target > 0.5,
				carrying: ctrl.player.carrying
			}
		});
	});
	$effect(() => onFails?.(ctrl.fails));
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
		// Long enough for the squish and for the ripple to run down the blocks below.
		landTimer = setTimeout(() => (landedId = null), 700);
		navigator.vibrate?.(8);
		play('snap');
	}

	let poofs = $state<{ id: number; x: number; y: number; color: string }[]>([]);
	let poofId = 0;

	function burst(x: number, y: number, color: string) {
		const id = ++poofId;
		poofs = [...poofs, { id, x, y, color }];
		setTimeout(() => (poofs = poofs.filter((p) => p.id !== id)), 600);
		play('poof');
	}

	function apply(op: DropOp) {
		coach.activity();
		switch (op.kind) {
			case 'tap':
				if (op.source.kind === 'palette') landed(ctrl.add(op.source.type));
				else peek(op.source.id);
				break;
			case 'insert':
				landed(ctrl.insert(op.type, op.target));
				break;
			case 'move':
				ctrl.move(op.id, op.target);
				landed(op.id);
				break;
			case 'remove': {
				const node = findBlock(ctrl.program, op.id);
				if (node) burst(drag.x.current, drag.y.current, blockColor(node.type));
				ctrl.remove(op.id);
				break;
			}
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
			clearTimeout(peekTimer);
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

	const guideStep = $derived(
		mission.guide && ctrl.status === 'idle' ? nextGuideStep(ctrl.program, mission.solution) : null
	);

	// What the coach's current hint points at.
	const pointer = $derived(
		coach.shown === null ? null : (mission.hintTargets?.[coach.shown] ?? null)
	);

	// Blocks no earlier mission offered get a "Neu!" badge until they are used.
	const fresh = $derived.by(() => {
		const at = missions.findIndex((m) => m.id === mission.id);
		// In the very first mission everything is new: no badges there.
		if (at <= 0) return [];
		const before = missions.slice(0, at);
		return mission.blocks.filter((type) => !before.some((m) => m.blocks.includes(type)));
	});
	const used = $derived(new Set(blockTypes(ctrl.program)));

	// Phantom drone: what a block will do, shown while it is dragged or after tapping it.
	let peekId = $state<string | null>(null);
	let peekTimer: ReturnType<typeof setTimeout> | undefined;

	function peek(id: string) {
		peekId = id;
		clearTimeout(peekTimer);
		peekTimer = setTimeout(() => (peekId = null), 3000);
	}

	const PREVIEW_ID = 'preview';
	const phantom = $derived.by((): Preview | null => {
		// In the fog the phantom would give away what is hidden.
		if (mission.fog || ctrl.status === 'running') return null;
		const source = drag.active;
		const target = drag.hover?.kind === 'slot' ? drag.hover.target : null;
		if (source?.kind === 'palette') {
			if (!target) return null;
			const node = { ...createBlock(source.type), id: PREVIEW_ID };
			return previewBlock(insertBlock(ctrl.program, node, target), mission, PREVIEW_ID);
		}
		if (source?.kind === 'program') {
			const program = target ? moveBlock(ctrl.program, source.id, target) : ctrl.program;
			return previewBlock(program, mission, source.id);
		}
		return peekId ? previewBlock(ctrl.program, mission, peekId) : null;
	});

	const ghost = $derived.by(() => {
		const source = drag.active;
		if (!source) return null;
		if (source.kind === 'palette')
			return { type: source.type, n: BLOCKS[source.type].param?.default };
		const node = findBlock(ctrl.program, source.id);
		return node ? { type: node.type, n: node.n } : null;
	});

	// Predict, then run: before the first run of a "predict" mission the child taps a cell.
	let guessing = $state(false);
	// Raw: compared by identity with the guess a flight was started for.
	let guess = $state.raw<[number, number] | null>(null);
	let guessRight = $state<boolean | null>(null);

	function forgetGuess() {
		guessing = false;
		guess = null;
		guessRight = null;
	}

	// An edit makes an old guess (and its verdict) meaningless.
	$effect(() => {
		void ctrl.program;
		untrack(() => {
			if (!guessing) forgetGuess();
		});
	});

	async function start() {
		if (mission.predict && ctrl.runs === 0 && !ctrl.stepping && guess === null) {
			guessing = true;
			return;
		}
		forgetGuess();
		await run();
	}

	function pick(x: number, y: number) {
		const picked: [number, number] = [x, y];
		guess = picked;
		guessing = false;
		void run(picked);
	}

	/** `scored`: the guess made for exactly this flight (others are never scored). */
	async function run(scored: [number, number] | null = null) {
		coach.pause();
		guessRight = null;
		await ctrl.run();
		if (scored && guess === scored && (ctrl.status === 'success' || ctrl.status === 'fail')) {
			const { x, y } = ctrl.player;
			guessRight = Math.round(x.target) === scored[0] && Math.round(y.target) === scored[1];
		}
		settle();
	}

	function stop() {
		ctrl.stop();
		// Stopped between steps: no flight will settle, so let the coach watch again.
		if (ctrl.status === 'idle') coach.activity();
	}

	async function advance() {
		if (!ctrl.stepping) forgetGuess();
		coach.pause();
		await ctrl.advance();
		if (!ctrl.stepping) settle();
	}

	/** After a flight: cheer or console, and let the coach watch again. */
	function settle() {
		if (ctrl.status === 'success') {
			coach.succeeded();
			play('success');
		} else if (ctrl.status === 'fail') {
			coach.failed();
			play('fail');
		}
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
	<header
		class="flex items-center gap-3 rounded-3xl bg-card px-3 py-3 shadow-sm portrait:gap-2 portrait:py-2"
	>
		<Button
			variant="ghost"
			class="h-14 min-w-14 shrink-0 press rounded-2xl px-4 text-lg"
			aria-label={t.workspace.back}
			onclick={() => onBack()}
			><MapIcon class="size-7" /><span class="max-md:hidden">{t.workspace.back}</span></Button
		>
		<span
			class="rounded-xl bg-drone px-3 py-1 font-display text-xl font-bold text-drone-foreground"
			use:longPress={{ onLong: () => onSupervisor?.() }}>{mission.id}</span
		>
		<!-- w-0: the title shrinks (and truncates) instead of widening the header on phones. -->
		<div class="w-0 min-w-0 grow">
			<h1 class="truncate text-3xl font-bold portrait:text-2xl">{mission.title}</h1>
			<p class="text-lg text-muted-foreground portrait:text-sm portrait:leading-snug">
				{mission.goalText}
			</p>
		</div>
		{#if driver}
			<span
				class="flex shrink-0 flex-col rounded-xl bg-muted px-3 py-1 text-sm leading-tight font-semibold max-lg:hidden"
				><span>👆 {t.duo.taps(driver)}</span><span>🗺️ {t.duo.says(caller)}</span></span
			>
		{/if}
		{#if onHelp}<HelpButton {help} onToggle={onHelp} />{/if}
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
				pointAt={pointer?.block ?? null}
				fresh={fresh.filter((type) => !used.has(type))}
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
					rounds={ctrl.status === 'running' ? ctrl.rounds : {}}
					failedId={ctrl.failedId}
					onRemove={(id) => {
						coach.activity();
						play('poof');
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
			class="relative grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-4 rounded-3xl bg-card/70 p-4 portrait:row-start-1 portrait:grid-rows-[minmax(0,1fr)_auto] portrait:gap-2 portrait:p-3"
		>
			<!-- A question for the grown-ups, at their eye level (not on phones: no room). -->
			{#if mission.parentTip}
				<p
					class="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-1.5 text-sm text-muted-foreground portrait:hidden"
				>
					<Users class="size-4 shrink-0" /><span
						><b class="font-semibold">{t.workspace.parentTip}:</b>
						{mission.parentTip}</span
					>
				</p>
			{:else}
				<span class="portrait:hidden"></span>
			{/if}
			<div class="relative min-h-0">
				<DroneStage
					player={ctrl.player}
					fog={mission.fog}
					{phantom}
					glow={pointer?.cell ?? null}
					{guess}
					onPick={guessing ? pick : undefined}
				/>
				<Coach {coach} />
			</div>
			<div class="flex flex-col gap-3 portrait:gap-2">
				{#if guessing}
					<div
						class="flex items-center justify-between gap-3 rounded-2xl bg-fuchsia-500 px-4 py-2 text-lg font-bold text-white"
					>
						{t.workspace.guessAsk}
						<Button
							variant="secondary"
							class="h-12 press rounded-xl"
							onclick={() => {
								forgetGuess();
								void run();
							}}>{t.workspace.guessSkip}</Button
						>
					</div>
				{:else if guessRight !== null && ctrl.status !== 'running'}
					<p
						class="rounded-2xl px-4 py-2 text-center text-lg font-bold {guessRight
							? 'bg-fuchsia-500 text-white'
							: 'bg-fuchsia-100 text-fuchsia-900'}"
					>
						{guessRight ? t.workspace.guessRight : t.workspace.guessWrong}
					</p>
				{/if}
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
						{#if ctrl.status === 'success' && ctrl.fixed && !revealed}
							<p class="mt-1 text-base font-semibold">🔧 {t.workspace.fixed}</p>
						{/if}
						{#if ctrl.status === 'success' && revealed}
							<p class="mt-1 text-base font-semibold">{t.supervisor.withSolution}</p>
						{:else if ctrl.status === 'success'}
							<span class="mt-1 flex justify-center gap-1">
								{#each [1, 2, 3] as i (i)}
									<span class="star-pop" style:animation-delay="{i * 160}ms">
										<Star
											class={cn(
												'size-9',
												i <= Math.min(ctrl.stars, maxStars)
													? 'fill-yellow-300 text-yellow-300'
													: 'text-white/50'
											)}
										/>
									</span>
								{/each}
							</span>
						{/if}
						{#if ctrl.status === 'success'}
							<Button
								class="mt-2 h-14 press rounded-2xl bg-white px-8 text-xl font-bold text-success"
								onclick={() => onDone(ctrl.result())}>{t.workspace.next}</Button
							>
						{/if}
					</div>
				{/if}
				<div class="flex gap-3 portrait:gap-2">
					{#if ctrl.stepping}
						<!-- Step by step: one drone move per tap, or fly the rest, or stop. -->
						<Button
							data-step
							class="h-16 grow press rounded-2xl bg-drone text-2xl font-bold text-drone-foreground"
							disabled={ctrl.stepBusy}
							aria-label={t.workspace.nextStep}
							onclick={advance}
							><Footprints class="size-7" /><span class="max-xl:hidden portrait:hidden"
								>{t.workspace.nextStep}</span
							></Button
						>
						<Button
							variant="secondary"
							class="size-16 press rounded-2xl"
							aria-label={t.workspace.flyRest}
							disabled={ctrl.stepBusy}
							onclick={() => run()}><Play class="size-7" /></Button
						>
						<Button
							class="size-16 press rounded-2xl bg-destructive text-white"
							aria-label={t.workspace.stop}
							onclick={stop}><Square class="size-7" /></Button
						>
					{:else if ctrl.status === 'running'}
						<Button
							class="h-16 grow press rounded-2xl bg-destructive text-2xl font-bold text-white"
							onclick={stop}><Square class="size-7" />{t.workspace.stop}</Button
						>
					{:else}
						<Button
							data-start
							class="h-16 grow press rounded-2xl bg-drone text-2xl font-bold text-drone-foreground"
							disabled={ctrl.program.length === 0}
							onclick={start}><Play class="size-7" />{t.workspace.start}</Button
						>
						<Button
							data-step
							variant="secondary"
							class="size-16 press rounded-2xl"
							title={t.workspace.step}
							aria-label={t.workspace.step}
							disabled={ctrl.program.length === 0 || ctrl.stepBusy || guessing}
							onclick={advance}><Footprints class="size-7" /></Button
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
						class="h-16 min-w-16 press rounded-2xl px-5 text-xl"
						aria-label={t.workspace.reset}
						disabled={ctrl.status === 'running'}
						onclick={() => {
							forgetGuess();
							ctrl.resetStage();
						}}
						><RotateCcw class="size-6" /><span class="max-xl:hidden portrait:hidden"
							>{t.workspace.reset}</span
						></Button
					>
				</div>
			</div>
			{#if ctrl.status === 'success' && !revealed && !prefersReducedMotion.current}
				<Confetti />
			{/if}
		</div>
	</div>
</div>

<DragLayer {drag} {ghost} />
{#if driver && swapBanner}
	<!-- Tap anywhere (or wait) to dismiss. -->
	<button
		class="fixed inset-0 z-50 grid place-items-center bg-black/30"
		onclick={() => (swapBanner = false)}
		transition:fade={{ duration: 200 }}
	>
		<span
			class="star-pop rounded-3xl bg-card px-10 py-8 text-center shadow-2xl"
			style:animation-delay="0ms"
		>
			<span class="block font-display text-4xl font-bold">
				{driver === 1 && mission.id === missions[0]?.id ? t.duo.start : t.duo.swap}
			</span>
			<span class="mt-3 block text-2xl">👆 {t.duo.taps(driver)}</span>
			<span class="block text-2xl">🗺️ {t.duo.says(caller)}</span>
		</span>
	</button>
{/if}
{#if guideStep && !drag.active}
	<GuideHand step={guideStep} />
{/if}
{#each poofs as p (p.id)}
	<Poof x={p.x} y={p.y} color={p.color} />
{/each}
