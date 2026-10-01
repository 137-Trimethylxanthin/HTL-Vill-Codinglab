export interface LongPressOptions {
	onLong: () => void;
	ms?: number;
}

export const LONG_PRESS_MS = 2000;

/** Svelte action: call `onLong` after the element was held down for `ms` (hidden supervisor gestures). */
export function longPress(node: EventTarget, options: LongPressOptions) {
	let current = options;
	let timer: ReturnType<typeof setTimeout> | undefined;
	const cancel = () => clearTimeout(timer);
	const down = () => {
		cancel();
		timer = setTimeout(() => current.onLong(), current.ms ?? LONG_PRESS_MS);
	};
	const events = ['pointerup', 'pointerleave', 'pointercancel'];
	node.addEventListener('pointerdown', down);
	for (const name of events) node.addEventListener(name, cancel);
	return {
		update(next: LongPressOptions) {
			current = next;
		},
		destroy() {
			cancel();
			node.removeEventListener('pointerdown', down);
			for (const name of events) node.removeEventListener(name, cancel);
		}
	};
}
