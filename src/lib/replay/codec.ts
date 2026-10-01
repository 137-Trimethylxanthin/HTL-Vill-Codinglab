import type { Mission } from '$lib/missions/schema';
import type { MissionResult } from '$lib/session/types';

/** One solved mission of a visit, as the take-home page replays it. */
export interface Flight {
	id: string;
	stars: 1 | 2 | 3;
	/** Visited cells "x,y" in visiting order. */
	path: string[];
}

export interface Visit {
	flights: Flight[];
	/** The school link of the station, when it is not the default one. */
	link: string | null;
}

// Fragment = format char + base64url. "z": deflate-raw compressed JSON, "p": plain JSON.
// JSON = [[[id, stars, cells], …], link?]; cells = two base36 digits per cell ("0403" = 0,4 → 0,3).
// No names, no ids: the link is shown to anyone who sees the code.
const MAX_FRAGMENT = 4000;
const MAX_JSON = 8000;
const MAX_FLIGHTS = 20;
const MAX_CELLS = 100;

export function visitOf(results: MissionResult[], link: string | null = null): Visit {
	return {
		flights: results
			.filter((r) => !r.skipped && r.stars > 0 && r.path.length > 0)
			.map((r) => ({
				id: r.id,
				stars: r.stars as Flight['stars'],
				path: r.path.slice(0, MAX_CELLS)
			})),
		link
	};
}

const cellsOf = (path: string[]) =>
	path
		.map((key) => {
			const [x, y] = key.split(',').map(Number);
			return x.toString(36) + y.toString(36);
		})
		.join('');

function toJson(visit: Visit): string {
	const flights = visit.flights.map((f) => [f.id, f.stars, cellsOf(f.path)]);
	return JSON.stringify(visit.link ? [flights, visit.link] : [flights]);
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = '';
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array | null {
	if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
	try {
		const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
		return Uint8Array.from(binary, (c) => c.charCodeAt(0));
	} catch {
		return null;
	}
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
	const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
	return new Uint8Array(await new Response(out).arrayBuffer());
}

const canCompress = () =>
	typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

/** Synchronous variant without compression (also the fallback where streams are missing). */
export function encodeVisitPlain(visit: Visit): string {
	return 'p' + toBase64Url(new TextEncoder().encode(toJson(visit)));
}

export async function encodeVisit(visit: Visit): Promise<string> {
	if (!canCompress()) return encodeVisitPlain(visit);
	try {
		const bytes = new TextEncoder().encode(toJson(visit));
		return 'z' + toBase64Url(await pipe(bytes, new CompressionStream('deflate-raw')));
	} catch {
		return encodeVisitPlain(visit);
	}
}

function safeLink(value: unknown): string | null {
	if (typeof value !== 'string' || value.length > 200) return null;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
	} catch {
		return null;
	}
}

function parseFlight(value: unknown): Flight | null {
	if (!Array.isArray(value) || value.length !== 3) return null;
	const [id, stars, cells] = value;
	if (typeof id !== 'string' || !/^\d{1,2}\.\d{1,2}$/.test(id)) return null;
	if (stars !== 1 && stars !== 2 && stars !== 3) return null;
	if (typeof cells !== 'string' || !/^([0-9a-z]{2})+$/.test(cells)) return null;
	if (cells.length > MAX_CELLS * 2) return null;
	const path = cells
		.match(/../g)!
		.map((pair) => `${parseInt(pair[0], 36)},${parseInt(pair[1], 36)}`);
	return { id, stars, path };
}

/** The visit in a URL fragment (with or without "#"), or null for anything that is not one. */
export async function decodeVisit(fragment: string): Promise<Visit | null> {
	const text = fragment.replace(/^#/, '');
	if (text.length < 2 || text.length > MAX_FRAGMENT) return null;
	const bytes = fromBase64Url(text.slice(1));
	if (!bytes) return null;
	let raw: Uint8Array;
	if (text[0] === 'p') raw = bytes;
	else if (text[0] === 'z' && canCompress()) {
		try {
			raw = await pipe(bytes, new DecompressionStream('deflate-raw'));
		} catch {
			return null;
		}
	} else return null;
	if (raw.length > MAX_JSON) return null;
	try {
		const data: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
		if (!Array.isArray(data) || !Array.isArray(data[0]) || data[0].length > MAX_FLIGHTS)
			return null;
		const flights = data[0].map(parseFlight);
		if (flights.length === 0 || flights.some((f) => f === null)) return null;
		return { flights: flights as Flight[], link: safeLink(data[1]) };
	} catch {
		return null;
	}
}

/** Flights of known missions whose path stays on that mission's map (anything else is dropped). */
export function onMaps(
	flights: Flight[],
	missions: Mission[]
): { mission: Mission; flight: Flight }[] {
	const seen = new Set<string>();
	return flights.flatMap((flight) => {
		const mission = missions.find((m) => m.id === flight.id);
		// Unknown missions, and repeats in a hand-made link, are dropped.
		if (!mission || seen.has(mission.id)) return [];
		seen.add(mission.id);
		const { rows } = mission.map;
		const inside = flight.path.every((key) => {
			const [x, y] = key.split(',').map(Number);
			return y < rows.length && x < rows[0].length;
		});
		return inside ? [{ mission, flight }] : [];
	});
}
