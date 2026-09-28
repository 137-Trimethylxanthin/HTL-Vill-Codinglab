import { describe, expect, it } from 'vitest';
import { visibleCells } from './visibility';

describe('visibleCells', () => {
	it('shows the cells around every visited cell', () => {
		expect([...visibleCells(3, 3, ['0,0'])].sort()).toEqual(['0,0', '0,1', '1,0', '1,1']);
	});

	it('joins several visited cells and stays inside the map', () => {
		const cells = visibleCells(4, 1, ['0,0', '3,0']);
		expect([...cells].sort()).toEqual(['0,0', '1,0', '2,0', '3,0']);
	});

	it('supports a larger radius', () => {
		expect(visibleCells(5, 5, ['2,2'], 2).size).toBe(25);
	});
});
