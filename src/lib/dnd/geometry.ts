/** Insert position in a list: the number of items whose vertical middle lies above the pointer. */
export function dropIndex(midpoints: number[], y: number): number {
	return midpoints.filter((mid) => mid < y).length;
}
