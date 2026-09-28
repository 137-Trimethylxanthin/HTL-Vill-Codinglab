import { describe, expect, it } from 'vitest';
import { MAX_NAME, randomPilotName, sanitizeName } from './names';

describe('randomPilotName', () => {
	it('combines an adjective and a noun', () => {
		expect(randomPilotName(() => 0)).toBe('Flinke Hummel');
		expect(randomPilotName(() => 0.999)).toBe('Tapfere Biene');
	});

	it('uses Math.random by default', () => {
		expect(randomPilotName()).toMatch(/^\p{Lu}\p{Ll}+ \p{Lu}\p{Ll}+$/u);
	});
});

describe('sanitizeName', () => {
	it('keeps letters, umlauts, spaces and hyphens', () => {
		expect(sanitizeName('Jürgen-Maß')).toBe('Jürgen-Maß');
	});

	it('drops digits and symbols and collapses spaces', () => {
		expect(sanitizeName('  Max123!  ')).toBe('Max');
		expect(sanitizeName('Lea    Marie')).toBe('Lea Marie');
	});

	it(`cuts names at ${MAX_NAME} characters`, () => {
		expect(sanitizeName('Abcdefghijklmnopqrstuvwxyz')).toHaveLength(MAX_NAME);
	});

	it('returns an empty string for nothing usable', () => {
		expect(sanitizeName('1234 !!')).toBe('');
	});
});
