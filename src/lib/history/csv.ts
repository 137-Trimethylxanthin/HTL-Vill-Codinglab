import type { SessionRecord } from './types';

function field(value: string | number): string {
	const s = String(value);
	const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
	return /[;"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** One line per visit, semicolon-separated (opens in German Excel). */
export function recordsCsv(records: SessionRecord[]): string {
	const header = 'Ende;Station;Event;Pilot;Sterne;Beendet durch;Dauer (s);Missionen';
	const lines = records.map((r) => {
		const seconds = Math.max(
			0,
			Math.round((Date.parse(r.finishedAt) - Date.parse(r.startedAt)) / 1000)
		);
		const missions = r.missions
			.map((m) => (m.skipped ? `${m.id}:übersprungen` : `${m.id}:${m.stars}:${m.seconds}`))
			.join(' ');
		return [
			r.finishedAt,
			r.station,
			r.event,
			r.pilotName ?? '',
			r.totalStars,
			r.endedBy,
			seconds,
			missions
		]
			.map(field)
			.join(';');
	});
	return [header, ...lines].join('\n') + '\n';
}
