import { describe, expect, it } from 'vitest';
import { SPRINGS, springOptions } from './motion';

describe('springOptions', () => {
	it('returns the preset when motion is allowed', () => {
		expect(springOptions('bouncy', false)).toEqual(SPRINGS.bouncy);
	});

	it('returns an instant spring when motion is reduced', () => {
		expect(springOptions('bouncy', true)).toEqual({ stiffness: 1, damping: 1 });
	});

	it('keeps bouncy bouncier than gentle', () => {
		expect(SPRINGS.bouncy.damping).toBeLessThan(SPRINGS.gentle.damping);
	});
});
