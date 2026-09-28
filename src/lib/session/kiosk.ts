type KeyLike = {
	key: string;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
};

const CTRL_BLOCKED = new Set([
	'r',
	'w',
	'q',
	'n',
	't',
	'p',
	's',
	'o',
	'f',
	'g',
	'h',
	'j',
	'l',
	'u',
	'+',
	'-',
	'=',
	'0'
]);
const DEVTOOLS = new Set(['i', 'j', 'c']);

/** Keys a visitor must not use at the kiosk. Ctrl+Shift+A stays free for the admin screen. */
export function isBlockedKey(e: KeyLike, dev = false): boolean {
	const k = e.key.toLowerCase();
	const ctrl = e.ctrlKey || e.metaKey;
	if (['f3', 'f5', 'f7', 'contextmenu'].includes(k)) return true;
	if (k === 'f12') return !dev;
	if (e.altKey && ['arrowleft', 'arrowright', 'home'].includes(k)) return true;
	if (ctrl && e.shiftKey && ((DEVTOOLS.has(k) && !dev) || k === 'r' || k === 'delete')) return true;
	return ctrl && CTRL_BLOCKED.has(k);
}

/** Stops browser behaviour that breaks a kiosk. Returns a cleanup function. */
export function installKioskGuards(target: EventTarget, dev = false): () => void {
	const prevent = (e: Event) => e.preventDefault();
	const onKey = (e: Event) => {
		if (isBlockedKey(e as unknown as KeyLike, dev)) {
			e.preventDefault();
			e.stopPropagation();
		}
	};
	const onWheel = (e: Event) => {
		if ((e as WheelEvent).ctrlKey) e.preventDefault();
	};
	const listeners: [string, (e: Event) => void, AddEventListenerOptions?][] = [
		['contextmenu', prevent],
		['dragstart', prevent],
		['gesturestart', prevent],
		['keydown', onKey, { capture: true }],
		['wheel', onWheel, { passive: false }]
	];
	for (const [type, fn, options] of listeners) target.addEventListener(type, fn, options);
	return () => {
		for (const [type, fn, options] of listeners) target.removeEventListener(type, fn, options);
	};
}
