/** Insert position in a list: the number of items whose vertical middle lies above the pointer. */
export function dropIndex(midpoints: number[], y: number): number {
	return midpoints.filter((mid) => mid < y).length;
}

export interface Box {
	left: number;
	top: number;
	right: number;
	bottom: number;
	/** Nesting depth; deeper boxes win ties. */
	depth: number;
}

/** Index of the closest box within `max` px of the point (0 px = inside), deepest on ties; -1 if none. */
export function nearestWithin(boxes: Box[], x: number, y: number, max: number): number {
	let best = -1;
	let bestDist = Infinity;
	let bestDepth = -1;
	boxes.forEach((box, i) => {
		const dx = Math.max(box.left - x, 0, x - box.right);
		const dy = Math.max(box.top - y, 0, y - box.bottom);
		const dist = Math.hypot(dx, dy);
		if (dist > max) return;
		if (dist < bestDist || (dist === bestDist && box.depth > bestDepth)) {
			best = i;
			bestDist = dist;
			bestDepth = box.depth;
		}
	});
	return best;
}

/** Auto-scroll speed in px per frame: negative near the top edge, positive near the bottom. */
export function edgeSpeed(y: number, top: number, bottom: number, zone = 48, max = 16): number {
	if (y < top || y > bottom) return 0;
	if (y < top + zone) return -max * (1 - (y - top) / zone);
	if (y > bottom - zone) return max * (1 - (bottom - y) / zone);
	return 0;
}

/** The open drop gap on screen (its full height including the list's row gap). */
export interface Gap {
	top: number;
	height: number;
	left: number;
	right: number;
}

/** A drop list on screen: its box, nesting depth and the vertical middles of its blocks' header tiles. */
export interface ListGeom {
	left: number;
	right: number;
	top: number;
	bottom: number;
	depth: number;
	mids: number[];
}

export type Pick = { kind: 'gap' } | { kind: 'list'; list: number; index: number } | null;

/** Screen position → position in the layout without the gap. */
export function toVirtual(y: number, gap: Gap | null): number {
	if (!gap) return y;
	return y >= gap.top + gap.height ? y - gap.height : y;
}

/**
 * Finds the drop target as if the gap were closed, so opening or moving the gap can never
 * change the answer under a resting pointer. Over the gap itself the caller keeps its target.
 */
export function pickTarget(
	lists: ListGeom[],
	x: number,
	y: number,
	gap: Gap | null,
	magnet: number
): Pick {
	if (gap && x >= gap.left && x <= gap.right && y >= gap.top && y < gap.top + gap.height) {
		return { kind: 'gap' };
	}
	const vy = toVirtual(y, gap);
	const boxes = lists.map((l) => ({
		left: l.left,
		right: l.right,
		top: toVirtual(l.top, gap),
		bottom: toVirtual(l.bottom, gap),
		depth: l.depth
	}));
	const i = nearestWithin(boxes, x, vy, magnet);
	if (i < 0) return null;
	const mids = lists[i].mids.map((m) => toVirtual(m, gap));
	return { kind: 'list', list: i, index: dropIndex(mids, vy) };
}
