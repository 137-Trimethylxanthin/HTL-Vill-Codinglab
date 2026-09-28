import { describe, expect, it } from 'vitest';
import { dropIndex } from './geometry';

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
