import { prefersReducedMotion, Spring } from 'svelte/motion';
import type { DropTarget } from '$lib/blocks/edit';
import { springOptions } from '$lib/ui/motion';
import type { DragSource, DropOp, HitResult } from './types';

export const DRAG_THRESHOLD = 8;
const SPRING_BACK_MS = 450;

export function resolveDrop(source: DragSource, hover: HitResult): DropOp {
	if (!hover) return { kind: 'cancel' };
	if (hover.kind === 'trash') {
		return source.kind === 'program' ? { kind: 'remove', id: source.id } : { kind: 'cancel' };
	}
	return source.kind === 'palette'
		? { kind: 'insert', type: source.type, target: hover.target }
		: { kind: 'move', id: source.id, target: hover.target };
}

export function sameHit(a: HitResult, b: HitResult): boolean {
	if (a === null || b === null) return a === b;
	if (a.kind === 'trash' || b.kind === 'trash') return a.kind === b.kind;
	return (
		a.target.parent === b.target.parent &&
		a.target.slot === b.target.slot &&
		a.target.index === b.target.index
	);
}

/**
 * Pointer-driven drag state. Decides *what* a drop means; the caller's hitTest decides
 * *where* the pointer is. Starts dragging only after DRAG_THRESHOLD px, otherwise reports a tap.
 * Only the pointer that started the drag can move or end it.
 */
export class DragController {
	active = $state<DragSource | null>(null);
	hover = $state<HitResult>(null);
	rejected = $state(false);
	width = $state(0);
	offsetX = 0;
	offsetY = 0;
	readonly x: Spring<number>;
	readonly y: Spring<number>;
	readonly tilt: Spring<number>;
	readonly scale: Spring<number>;
	private pending: { source: DragSource; startX: number; startY: number } | null = null;
	private pointerId = 0;
	private origin = { x: 0, y: 0 };
	private lastX = 0;
	private lastY = 0;
	private backTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(
		private readonly hitTest: (x: number, y: number) => HitResult,
		private readonly canDrop: (source: DragSource, target: DropTarget) => boolean,
		private readonly onDrop: (op: DropOp) => void,
		reduced: boolean = prefersReducedMotion.current
	) {
		this.x = new Spring(0, springOptions('snappy', reduced));
		this.y = new Spring(0, springOptions('snappy', reduced));
		this.tilt = new Spring(0, springOptions('bouncy', reduced));
		this.scale = new Spring(1, springOptions('bouncy', reduced));
	}

	press(
		source: DragSource,
		px: number,
		py: number,
		rect: { left: number; top: number; width: number },
		pointerId = 0
	) {
		// A rejected block is only springing back: grabbing again right away must work.
		if (this.rejected) this.finish();
		// One drag at a time: a second finger (or a palm) must not take over.
		else if (this.active || this.pending) return;
		this.pointerId = pointerId;
		this.pending = { source, startX: px, startY: py };
		this.offsetX = px - rect.left;
		this.offsetY = py - rect.top;
		this.width = rect.width;
		this.origin = { x: px, y: py };
		this.lastX = px;
		this.lastY = py;
		this.x.set(px, { instant: true });
		this.y.set(py, { instant: true });
		this.tilt.set(0, { instant: true });
		this.scale.set(1, { instant: true });
	}

	move(px: number, py: number, pointerId = 0) {
		if (pointerId !== this.pointerId || this.rejected) return;
		if (!this.active) {
			if (!this.pending) return;
			if (Math.hypot(px - this.pending.startX, py - this.pending.startY) < DRAG_THRESHOLD) return;
			this.active = this.pending.source;
			this.scale.target = 1.08;
		}
		this.x.target = px;
		this.y.target = py;
		this.tilt.target = Math.max(-12, Math.min(12, (px - this.lastX) * 0.8));
		this.lastX = px;
		this.lastY = py;
		this.updateHover();
	}

	/** Re-checks the target under the last pointer position (e.g. after the list scrolled). */
	refresh() {
		if (this.active && !this.rejected) this.updateHover();
	}

	end(pointerId = 0) {
		if (pointerId !== this.pointerId || this.rejected) return;
		const source = this.active;
		if (!source) {
			if (this.pending) this.onDrop({ kind: 'tap', source: this.pending.source });
			this.pending = null;
			return;
		}
		const op = resolveDrop(source, this.hover);
		this.pending = null;
		this.hover = null;
		this.tilt.target = 0;
		if (op.kind === 'cancel') {
			this.rejected = true;
			this.x.target = this.origin.x;
			this.y.target = this.origin.y;
			this.scale.target = 1;
			this.backTimer = setTimeout(() => this.finish(), SPRING_BACK_MS);
		} else {
			this.onDrop(op);
			this.finish();
		}
	}

	cancel(pointerId?: number) {
		if (pointerId !== undefined && pointerId !== this.pointerId) return;
		this.pending = null;
		this.finish();
	}

	private updateHover() {
		const source = this.active;
		if (!source) return;
		let hit = this.hitTest(this.lastX, this.lastY);
		if (hit?.kind === 'trash' && source.kind === 'palette') hit = null;
		else if (hit?.kind === 'slot' && !this.canDrop(source, hit.target)) hit = null;
		// A new object on every pointer move would re-render the list and restart its slide animations.
		if (!sameHit(hit, this.hover)) this.hover = hit;
	}

	private finish() {
		clearTimeout(this.backTimer);
		this.active = null;
		this.hover = null;
		this.rejected = false;
	}
}
