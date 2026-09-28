import { describe, expect, it } from 'vitest';
import { tokenizeLine } from './highlight';

describe('tokenizeLine', () => {
	it('marks keywords, calls and numbers', () => {
		expect(tokenizeLine('for i in range(4):')).toEqual([
			{ kind: 'keyword', text: 'for' },
			{ kind: 'text', text: ' i ' },
			{ kind: 'keyword', text: 'in' },
			{ kind: 'text', text: ' ' },
			{ kind: 'call', text: 'range' },
			{ kind: 'text', text: '(' },
			{ kind: 'number', text: '4' },
			{ kind: 'text', text: '):' }
		]);
	});

	it('marks strings and comments', () => {
		expect(tokenizeLine('print("hi") # Gruß')).toEqual([
			{ kind: 'call', text: 'print' },
			{ kind: 'text', text: '(' },
			{ kind: 'string', text: '"hi"' },
			{ kind: 'text', text: ') ' },
			{ kind: 'comment', text: '# Gruß' }
		]);
	});

	it('keeps indentation as text', () => {
		expect(tokenizeLine('    land()')[0]).toEqual({ kind: 'text', text: '    ' });
	});

	it('returns nothing for an empty line', () => {
		expect(tokenizeLine('')).toEqual([]);
	});
});
