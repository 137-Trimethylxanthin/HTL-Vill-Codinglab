import type { SessionRecord } from './types';

export interface LeaderboardEntry {
	id: string;
	pilotName: string;
	totalStars: number;
	seconds: number;
	station: string;
}

const duration = (r: SessionRecord) =>
	Math.max(0, Math.round((Date.parse(r.finishedAt) - Date.parse(r.startedAt)) / 1000));
const localDay = (iso: string) => {
	const d = new Date(iso);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function leaderboard(
	records: SessionRecord[],
	filter: { period: 'today' | 'event' | 'all'; now: Date; event: string },
	limit = 10
): LeaderboardEntry[] {
	const today = localDay(filter.now.toISOString());
	return records
		.filter((r) => r.pilotName !== null && r.pilotName !== '')
		.filter((r) =>
			filter.period === 'today'
				? localDay(r.finishedAt) === today
				: filter.period === 'event'
					? r.event === filter.event
					: true
		)
		.map((r) => ({
			id: r.id,
			pilotName: r.pilotName as string,
			totalStars: r.totalStars,
			seconds: duration(r),
			station: r.station
		}))
		.sort((a, b) => b.totalStars - a.totalStars || a.seconds - b.seconds)
		.slice(0, limit);
}

export interface Logbook {
	visitors: number;
	finished: number;
	perDay: { day: string; visitors: number; finished: number }[];
	perYear: { year: number; visitors: number }[];
	perMission: {
		id: string;
		attempts: number;
		solved: number;
		avgStars: number;
		avgSeconds: number;
	}[];
	dropOff: { mission: string; count: number }[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function logbook(records: SessionRecord[]): Logbook {
	const days = new Map<string, { visitors: number; finished: number }>();
	const years = new Map<number, number>();
	const missions = new Map<
		string,
		{ attempts: number; solved: number; stars: number; seconds: number }
	>();
	const drops = new Map<string, number>();

	for (const r of records) {
		const day = localDay(r.finishedAt);
		const d = days.get(day) ?? { visitors: 0, finished: 0 };
		d.visitors += 1;
		if (r.endedBy === 'finale') d.finished += 1;
		days.set(day, d);
		const year = new Date(r.finishedAt).getFullYear();
		years.set(year, (years.get(year) ?? 0) + 1);
		for (const m of r.missions) {
			const s = missions.get(m.id) ?? { attempts: 0, solved: 0, stars: 0, seconds: 0 };
			s.attempts += 1;
			if (!m.skipped && m.stars > 0) {
				s.solved += 1;
				s.stars += m.stars;
				s.seconds += m.seconds;
			}
			missions.set(m.id, s);
		}
		if (r.endedBy === 'idle') {
			const last = r.missions.at(-1)?.id ?? '–';
			drops.set(last, (drops.get(last) ?? 0) + 1);
		}
	}

	return {
		visitors: records.length,
		finished: records.filter((r) => r.endedBy === 'finale').length,
		perDay: [...days].map(([day, v]) => ({ day, ...v })).sort((a, b) => b.day.localeCompare(a.day)),
		perYear: [...years]
			.map(([year, visitors]) => ({ year, visitors }))
			.sort((a, b) => b.year - a.year),
		perMission: [...missions]
			.map(([id, s]) => ({
				id,
				attempts: s.attempts,
				solved: s.solved,
				avgStars: s.solved ? round1(s.stars / s.solved) : 0,
				avgSeconds: s.solved ? Math.round(s.seconds / s.solved) : 0
			}))
			.sort((a, b) => a.id.localeCompare(b.id)),
		dropOff: [...drops]
			.map(([mission, count]) => ({ mission, count }))
			// most frequent first; "–" (no mission started) after real missions on ties
			.sort(
				(a, b) =>
					b.count - a.count ||
					Number(a.mission === '–') - Number(b.mission === '–') ||
					a.mission.localeCompare(b.mission)
			)
	};
}
