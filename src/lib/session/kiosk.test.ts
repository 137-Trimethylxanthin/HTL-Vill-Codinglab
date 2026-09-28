import { describe, expect, it } from 'vitest';
import { installKioskGuards, isBlockedKey } from './kiosk';

const key = (
	k: string,
	mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }> = {}
) => ({
	key: k,
	ctrlKey: false,
	metaKey: false,
	altKey: false,
	shiftKey: false,
	...mods
});

describe('isBlockedKey', () => {
	it('blocks reload, close, zoom and navigation shortcuts', () => {
		expect(isBlockedKey(key('F5'))).toBe(true);
		expect(isBlockedKey(key('r', { ctrlKey: true }))).toBe(true);
		expect(isBlockedKey(key('W', { ctrlKey: true }))).toBe(true);
		expect(isBlockedKey(key('+', { ctrlKey: true }))).toBe(true);
		expect(isBlockedKey(key('0', { metaKey: true }))).toBe(true);
		expect(isBlockedKey(key('ArrowLeft', { altKey: true }))).toBe(true);
		expect(isBlockedKey(key('ContextMenu'))).toBe(true);
	});

	it('keeps normal typing and the admin shortcut free', () => {
		expect(isBlockedKey(key('a'))).toBe(false);
		expect(isBlockedKey(key('Enter'))).toBe(false);
		expect(isBlockedKey(key('A', { ctrlKey: true, shiftKey: true }))).toBe(false);
	});

	it('blocks devtools only outside dev', () => {
		expect(isBlockedKey(key('I', { ctrlKey: true, shiftKey: true }))).toBe(true);
		expect(isBlockedKey(key('F12'))).toBe(true);
		expect(isBlockedKey(key('I', { ctrlKey: true, shiftKey: true }), true)).toBe(false);
		expect(isBlockedKey(key('F12'), true)).toBe(false);
	});
});

describe('installKioskGuards', () => {
	const fire = (target: EventTarget, type: string, props: object = {}) => {
		const event = Object.assign(new Event(type, { cancelable: true }), props);
		target.dispatchEvent(event);
		return event.defaultPrevented;
	};

	it('prevents context menu, blocked keys, ctrl-wheel zoom and drag', () => {
		const target = new EventTarget();
		installKioskGuards(target);
		expect(fire(target, 'contextmenu')).toBe(true);
		expect(fire(target, 'keydown', key('F5'))).toBe(true);
		expect(fire(target, 'keydown', key('a'))).toBe(false);
		expect(fire(target, 'wheel', { ctrlKey: true })).toBe(true);
		expect(fire(target, 'wheel', { ctrlKey: false })).toBe(false);
		expect(fire(target, 'dragstart')).toBe(true);
	});

	it('removes every guard on cleanup', () => {
		const target = new EventTarget();
		const cleanup = installKioskGuards(target);
		cleanup();
		expect(fire(target, 'contextmenu')).toBe(false);
		expect(fire(target, 'keydown', key('F5'))).toBe(false);
	});
});
