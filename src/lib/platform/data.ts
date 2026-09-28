import type { Mission } from '$lib/missions/schema';
import type { Session } from '$lib/session/session.svelte';
import type { CertificateData } from './types';

export function isValidEmail(value: string): boolean {
	return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(value);
}

/** Missions to offer: the admin's selection, or all when the selection is empty or unknown. */
export function missionsFor(all: Mission[], enabled: string[] | null): Mission[] {
	if (!enabled?.length) return all;
	const picked = all.filter((m) => enabled.includes(m.id));
	return picked.length > 0 ? picked : all;
}

export function certificateData(session: Session, qrUrl: string, now: Date): CertificateData {
	const solved = session.missions.filter((m) => session.isSolved(m.id));
	const last = Object.values(session.results)
		.filter((r) => !r.skipped && r.stars > 0)
		.at(-1);
	const lastMission = last ? session.missions.find((m) => m.id === last.id) : undefined;
	return {
		pilotName: session.pilotName,
		totalStars: session.totalStars,
		maxStars: session.maxStars,
		missions: solved.map((m) => ({ id: m.id, title: m.title, stars: session.results[m.id].stars })),
		date: new Intl.DateTimeFormat('de-AT').format(now),
		qrUrl,
		map: last && lastMission ? { rows: lastMission.map.rows, path: last.path } : null
	};
}
