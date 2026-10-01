import type { SessionRecord } from '$lib/history/types';

export type Pace = 'green' | 'yellow' | 'red';

/** Before there is data: a rough time per mission by level (1.x, 2.x, 3.x). */
const DEFAULT_SECONDS: Record<string, number> = { '1': 120, '2': 180, '3': 240 };
/** Fewer solved runs than this: the median is not trusted yet. */
const MIN_SAMPLES = 3;

/** Typical time for a mission: the median of its solved runs, or a default by level. */
export function expectedSeconds(missionId: string, records: SessionRecord[]): number {
	const times = records
		.flatMap((r) => r.missions)
		.filter((m) => m.id === missionId && !m.skipped && m.stars > 0 && m.seconds > 0)
		.map((m) => m.seconds)
		.sort((a, b) => a - b);
	if (times.length < MIN_SAMPLES) return DEFAULT_SECONDS[missionId.split('.')[0]] ?? 180;
	const mid = Math.floor(times.length / 2);
	return times.length % 2 ? times[mid] : (times[mid - 1] + times[mid]) / 2;
}

/** Green while on pace, yellow up to 1.5× the typical time, red beyond. */
export function paceOf(seconds: number, expected: number): Pace {
	if (seconds <= expected) return 'green';
	if (seconds <= expected * 1.5) return 'yellow';
	return 'red';
}

/** "4:05" */
export function clock(ms: number): string {
	const s = Math.max(0, Math.floor(ms / 1000));
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
