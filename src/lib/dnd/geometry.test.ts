import { describe, expect, it } from 'vitest';
import {
	dropIndex,
	edgeSpeed,
	nearestWithin,
	pickTarget,
	toVirtual,
	type ListGeom
} from './geometry';

describe('dropIndex', () => {
	const mids = [100, 160, 220];

	it('is 0 above the first item', () => {
		expect(dropIndex(mids, 50)).toBe(0);
	});

	it('counts the items whose middle is above the pointer', () => {
		expect(dropIndex(mids, 130)).toBe(1);
		expect(dropIndex(mids, 200)).toBe(2);
	});

	it('is the list length below the last item', () => {
		expect(dropIndex(mids, 999)).toBe(3);
		expect(dropIndex([], 10)).toBe(0);
	});
});

describe('nearestWithin', () => {
	const boxes = [
		{ left: 0, top: 0, right: 100, bottom: 50, depth: 0 },
		{ left: 20, top: 60, right: 100, bottom: 100, depth: 1 }
	];

	it('returns the index of a box containing the point, preferring the deepest', () => {
		expect(nearestWithin(boxes, 50, 25, 40)).toBe(0);
		expect(
			nearestWithin([...boxes, { left: 0, top: 0, right: 100, bottom: 100, depth: 2 }], 50, 80, 40)
		).toBe(2);
	});

	it('snaps to a box within the distance', () => {
		expect(nearestWithin(boxes, 130, 80, 40)).toBe(1);
		expect(nearestWithin(boxes, 50, 53, 40)).toBe(0);
	});

	it('returns -1 when nothing is close enough', () => {
		expect(nearestWithin(boxes, 300, 300, 40)).toBe(-1);
	});
});

describe('edgeSpeed', () => {
	it('is 0 away from the edges', () => {
		expect(edgeSpeed(200, 100, 500)).toBe(0);
	});

	it('scrolls up near the top and down near the bottom, faster closer to the edge', () => {
		expect(edgeSpeed(110, 100, 500)).toBeLessThan(0);
		expect(edgeSpeed(495, 100, 500)).toBeGreaterThan(0);
		expect(Math.abs(edgeSpeed(101, 100, 500))).toBeGreaterThan(Math.abs(edgeSpeed(140, 100, 500)));
	});

	it('is 0 outside the box', () => {
		expect(edgeSpeed(50, 100, 500)).toBe(0);
		expect(edgeSpeed(600, 100, 500)).toBe(0);
	});
});

describe('toVirtual', () => {
	const gap = { top: 264, height: 64, left: 0, right: 500 };
	it('removes the open gap from positions below it', () => {
		expect(toVirtual(200, gap)).toBe(200);
		expect(toVirtual(400, gap)).toBe(336);
		expect(toVirtual(400, null)).toBe(400);
	});
});

describe('pickTarget', () => {
	// takeoff (mid 228), loop header (mid 292) with body list 264–344 (item mid 320), land (mid 380) — without gap
	const flat: ListGeom[] = [
		{ left: 0, right: 500, top: 200, bottom: 420, depth: 0, mids: [228, 292, 380] },
		{ left: 40, right: 500, top: 300, bottom: 344, depth: 1, mids: [320] }
	];

	it('picks the deepest list under the pointer and the index inside it', () => {
		expect(pickTarget(flat, 100, 230, null, 40)).toEqual({ kind: 'list', list: 0, index: 1 });
		expect(pickTarget(flat, 100, 330, null, 40)).toEqual({ kind: 'list', list: 1, index: 1 });
	});

	it('keeps the target while the pointer is over the gap', () => {
		const gap = { top: 264, height: 64, left: 0, right: 500 };
		expect(pickTarget(flat, 100, 290, gap, 40)).toEqual({ kind: 'gap' });
		expect(pickTarget(flat, 900, 290, gap, 40)).toBeNull();
	});

	it('judges positions below the gap as if the gap were closed', () => {
		// gap opened above the loop: everything below 264 moved down by 64 on screen
		const gap = { top: 264, height: 64, left: 0, right: 500 };
		const live: ListGeom[] = [
			{ left: 0, right: 500, top: 200, bottom: 484, depth: 0, mids: [228, 356, 444] },
			{ left: 40, right: 500, top: 364, bottom: 408, depth: 1, mids: [384] }
		];
		// on screen 394 is inside the (moved) loop body: that is where the block goes
		expect(pickTarget(live, 100, 394, gap, 40)).toEqual({ kind: 'list', list: 1, index: 1 });
		// on screen 350 is the upper half of the (moved) loop header: still before the loop
		expect(pickTarget(live, 100, 350, gap, 40)).toEqual({ kind: 'list', list: 0, index: 1 });
	});

	it('returns null far away from every list', () => {
		expect(pickTarget(flat, 900, 900, null, 40)).toBeNull();
	});
});
