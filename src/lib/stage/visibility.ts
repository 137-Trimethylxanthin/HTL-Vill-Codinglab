/** Cells the drone can see in fog: everything within `radius` of a visited cell. */
export function visibleCells(
	width: number,
	height: number,
	visited: string[],
	radius = 1
): Set<string> {
	const out = new Set<string>();
	for (const key of visited) {
		const [vx, vy] = key.split(',').map(Number);
		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				const x = vx + dx;
				const y = vy + dy;
				if (x >= 0 && y >= 0 && x < width && y < height) out.add(`${x},${y}`);
			}
		}
	}
	return out;
}
