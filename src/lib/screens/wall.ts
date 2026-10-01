import type { SessionRecord } from '$lib/history/types';
import type { Mission } from '$lib/missions/schema';
import { demoEvents } from '$lib/session/demo';

export interface WallFlight {
	key: string;
	missionId: string;
	stars: number;
	path: string[];
	/** Only names that the leaderboard shows anyway. */
	pilotName: string | null;
}

const localDay = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const isToday = (r: SessionRecord, now: Date) => localDay(new Date(r.finishedAt)) === localDay(now);
const solved = (m: SessionRecord['missions'][number]) => !m.skipped && m.stars > 0;

/** Missions solved today, on all stations this one knows. */
export function solvedToday(records: SessionRecord[], now: Date): number {
	return records
		.filter((r) => isToday(r, now))
		.reduce((sum, r) => sum + r.missions.filter(solved).length, 0);
}

/** Today's solved flights that have a path, newest first. */
export function pickFlights(
	records: SessionRecord[],
	now: Date,
	publicIds: ReadonlySet<string>,
	limit = 12
): WallFlight[] {
	return records
		.filter((r) => isToday(r, now))
		.sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt))
		.flatMap((r) =>
			r.missions
				.filter((m) => solved(m) && (m.path?.length ?? 0) > 1)
				.reverse()
				.map((m) => ({
					key: `${r.id}:${m.id}`,
					missionId: m.id,
					stars: m.stars,
					path: m.path as string[],
					pilotName: publicIds.has(r.id) ? r.pilotName : null
				}))
		)
		.slice(0, limit);
}

/** Until the first visitor flies: the reference solutions, as paths. */
export function exampleFlights(missions: Mission[]): WallFlight[] {
	return missions.flatMap((m) => {
		let events;
		try {
			events = demoEvents(m);
		} catch {
			return []; // sensor missions cannot be replayed without Python
		}
		const path = [`${m.map.start.x},${m.map.start.y}`];
		for (const e of events) {
			if (e.kind !== 'move') continue;
			const key = `${e.x},${e.y}`;
			if (!path.includes(key)) path.push(key);
		}
		return path.length > 1
			? [{ key: `example:${m.id}`, missionId: m.id, stars: 3, path, pilotName: null }]
			: [];
	});
}
