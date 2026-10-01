import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LONG_PRESS_MS, longPress } from './long-press';

describe('longPress', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	const press = (node: EventTarget, name: string) => node.dispatchEvent(new Event(name));

	it('fires after holding long enough', () => {
		const node = new EventTarget();
		const onLong = vi.fn();
		longPress(node, { onLong });
		press(node, 'pointerdown');
		vi.advanceTimersByTime(LONG_PRESS_MS - 1);
		expect(onLong).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(onLong).toHaveBeenCalledOnce();
	});

	it('does not fire when let go or slid off early', () => {
		const node = new EventTarget();
		const onLong = vi.fn();
		longPress(node, { onLong, ms: 500 });
		for (const end of ['pointerup', 'pointerleave', 'pointercancel']) {
			press(node, 'pointerdown');
			vi.advanceTimersByTime(400);
			press(node, end);
		}
		vi.advanceTimersByTime(1000);
		expect(onLong).not.toHaveBeenCalled();
	});

	it('stops listening when destroyed', () => {
		const node = new EventTarget();
		const onLong = vi.fn();
		const action = longPress(node, { onLong });
		press(node, 'pointerdown');
		action.destroy();
		press(node, 'pointerdown');
		vi.advanceTimersByTime(LONG_PRESS_MS * 2);
		expect(onLong).not.toHaveBeenCalled();
	});
});
