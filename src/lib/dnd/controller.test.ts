import { afterEach, describe, expect, it, vi } from 'vitest';
import { DragController, resolveDrop } from './controller.svelte';
import type { DropOp, HitResult } from './types';

const slot: HitResult = { kind: 'slot', target: { parent: null, slot: 'body', index: 2 } };
const rect = { left: 10, top: 20, width: 200 };

afterEach(() => {
	vi.useRealTimers();
});

describe('resolveDrop', () => {
	it('inserts palette blocks and moves program blocks', () => {
		expect(resolveDrop({ kind: 'palette', type: 'land' }, slot)).toEqual({
			kind: 'insert',
			type: 'land',
			target: { parent: null, slot: 'body', index: 2 }
		});
		expect(resolveDrop({ kind: 'program', id: 'a' }, slot)).toEqual({
			kind: 'move',
			id: 'a',
			target: { parent: null, slot: 'body', index: 2 }
		});
	});

	it('removes program blocks dropped on the trash', () => {
		expect(resolveDrop({ kind: 'program', id: 'a' }, { kind: 'trash' })).toEqual({
			kind: 'remove',
			id: 'a'
		});
	});

	it('cancels palette blocks on the trash and drops outside any target', () => {
		expect(resolveDrop({ kind: 'palette', type: 'land' }, { kind: 'trash' })).toEqual({
			kind: 'cancel'
		});
		expect(resolveDrop({ kind: 'program', id: 'a' }, null)).toEqual({ kind: 'cancel' });
	});
});

describe('DragController', () => {
	function setup(hit: HitResult = slot, allowed = true) {
		const ops: DropOp[] = [];
		const ctrl = new DragController(
			() => hit,
			() => allowed,
			(op) => ops.push(op)
		);
		return { ctrl, ops };
	}

	it('reports a tap when the pointer does not move', () => {
		const { ctrl, ops } = setup();
		ctrl.press({ kind: 'palette', type: 'land' }, 50, 50, rect);
		ctrl.move(53, 52);
		ctrl.end();
		expect(ops).toEqual([{ kind: 'tap', source: { kind: 'palette', type: 'land' } }]);
		expect(ctrl.active).toBeNull();
	});

	it('starts dragging after the threshold and drops on the hovered slot', () => {
		const { ctrl, ops } = setup();
		ctrl.press({ kind: 'palette', type: 'land' }, 50, 50, rect);
		ctrl.move(80, 90);
		expect(ctrl.active).toEqual({ kind: 'palette', type: 'land' });
		expect(ctrl.hover).toEqual(slot);
		expect(ctrl.offsetX).toBe(40);
		ctrl.end();
		expect(ops).toEqual([
			{ kind: 'insert', type: 'land', target: { parent: null, slot: 'body', index: 2 } }
		]);
		expect(ctrl.active).toBeNull();
	});

	it('ignores slots that canDrop refuses and springs back', () => {
		vi.useFakeTimers();
		const { ctrl, ops } = setup(slot, false);
		ctrl.press({ kind: 'program', id: 'a' }, 50, 50, rect);
		ctrl.move(120, 120);
		expect(ctrl.hover).toBeNull();
		ctrl.end();
		expect(ops).toEqual([]);
		expect(ctrl.rejected).toBe(true);
		expect(ctrl.active).not.toBeNull();
		vi.advanceTimersByTime(500);
		expect(ctrl.active).toBeNull();
		expect(ctrl.rejected).toBe(false);
	});

	it('cancel clears the drag without dropping', () => {
		const { ctrl, ops } = setup();
		ctrl.press({ kind: 'program', id: 'a' }, 50, 50, rect);
		ctrl.move(120, 120);
		ctrl.cancel();
		ctrl.end();
		expect(ops).toEqual([]);
		expect(ctrl.active).toBeNull();
		expect(ctrl.hover).toBeNull();
	});

	it('does nothing on move or end without a press', () => {
		const { ctrl, ops } = setup();
		ctrl.move(10, 10);
		ctrl.end();
		expect(ops).toEqual([]);
	});

	it('ignores other pointers while one finger drags', () => {
		const { ctrl, ops } = setup();
		ctrl.press({ kind: 'palette', type: 'land' }, 50, 50, rect, 1);
		ctrl.move(120, 120, 1);
		ctrl.press({ kind: 'palette', type: 'photo' }, 300, 300, rect, 2);
		ctrl.move(900, 600, 2);
		ctrl.end(2);
		expect(ctrl.active).toEqual({ kind: 'palette', type: 'land' });
		expect(ctrl.x.target).toBe(120);
		expect(ops).toEqual([]);
		ctrl.cancel(2);
		expect(ctrl.active).not.toBeNull();
		ctrl.end(1);
		expect(ops).toHaveLength(1);
	});

	it('does not show the trash while a palette block is over the palette', () => {
		const { ctrl } = setup({ kind: 'trash' });
		ctrl.press({ kind: 'palette', type: 'land' }, 50, 50, rect);
		ctrl.move(120, 120);
		expect(ctrl.hover).toBeNull();
	});

	it('re-checks the target at the last pointer position on refresh', () => {
		let hit: HitResult = null;
		const ctrl = new DragController(
			() => hit,
			() => true,
			() => {}
		);
		ctrl.press({ kind: 'palette', type: 'land' }, 50, 50, rect);
		ctrl.move(120, 120);
		expect(ctrl.hover).toBeNull();
		hit = slot;
		ctrl.refresh();
		expect(ctrl.hover).toEqual(slot);
	});

	it('uses instant springs when motion is reduced', () => {
		const ctrl = new DragController(
			() => null,
			() => true,
			() => {},
			true
		);
		expect(ctrl.tilt.stiffness).toBe(1);
		expect(ctrl.x.damping).toBe(1);
	});
});
