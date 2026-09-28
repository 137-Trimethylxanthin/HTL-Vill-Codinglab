import { describe, expect, it } from 'vitest';
import { pressPinKey } from './pin';

describe('pressPinKey', () => {
	it('adds digits up to 8', () => {
		let v = '';
		for (const k of '123456789') v = pressPinKey(v, k);
		expect(v).toBe('12345678');
	});

	it('deletes with back and ignores other keys', () => {
		expect(pressPinKey('12', 'back')).toBe('1');
		expect(pressPinKey('', 'back')).toBe('');
		expect(pressPinKey('12', 'x')).toBe('12');
	});
});
