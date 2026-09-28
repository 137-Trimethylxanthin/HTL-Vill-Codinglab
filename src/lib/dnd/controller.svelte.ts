import { Spring } from 'svelte/motion';
import type { DropTarget } from '$lib/blocks/edit';
import { SPRINGS } from '$lib/ui/motion';
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

/**
 * Pointer-driven drag state. Decides *what* a drop means; the caller's hitTest decides
 * *where* the pointer is. Starts dragging only after DRAG_THRESHOLD px, otherwise reports a tap.
 */
export class DragController {
	active = $state<DragSource | null>(null);
	hover = $state<HitResult>(null);
	rejected = $state(false);
	width = $state(0);
	offsetX = 0;
	offsetY = 0;
	x = new Spring(0, SPRINGS.snappy);
	y = new Spring(0, SPRINGS.snappy);
	tilt = new Spring(0, SPRINGS.bouncy);
	scale = new Spring(1, SPRINGS.bouncy);
	private pending: { source: DragSource; startX: number; startY: number } | null = null;
	private origin = { x: 0, y: 0 };
	private lastX = 0;
	private backTimer: ReturnType<typeof setTimeout> | undefined;

	constructor(
		private readonly hitTest: (x: number, y: number) => HitResult,
		private readonly canDrop: (source: DragSource, target: DropTarget) => boolean,
		private readonly onDrop: (op: DropOp) => void
	) {}

	press(
		source: DragSource,
		px: number,
		py: number,
		rect: { left: number; top: number; width: number }
	) {
		this.finish();
		this.pending = { source, startX: px, startY: py };
		this.offsetX = px - rect.left;
		this.offsetY = py - rect.top;
		this.width = rect.width;
		this.origin = { x: px, y: py };
		this.lastX = px;
		this.x.set(px, { instant: true });
		this.y.set(py, { instant: true });
		this.tilt.set(0, { instant: true });
		this.scale.set(1, { instant: true });
	}

	move(px: number, py: number) {
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
		const hit = this.hitTest(px, py);
		this.hover = hit?.kind === 'slot' && !this.canDrop(this.active, hit.target) ? null : hit;
	}

	end() {
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

	cancel() {
		this.pending = null;
		this.finish();
	}

	private finish() {
		clearTimeout(this.backTimer);
		this.active = null;
		this.hover = null;
		this.rejected = false;
	}
}
