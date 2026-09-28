import type { Mission } from '$lib/missions/schema';
import type { EndedBy, MissionResult, Screen, SessionSummary } from './types';

/** One visitor's walk through the Showcase. Wrong-state calls are ignored on purpose (double taps). */
export class Session {
	screen = $state<Screen>('attract');
	pilotName = $state('');
	results = $state<Record<string, MissionResult>>({});
	currentId = $state<string | null>(null);
	lastResult = $state<MissionResult | null>(null);
	private startedAt = 0;

	constructor(
		readonly missions: Mission[],
		private readonly now: () => number = () => Date.now()
	) {}

	get current(): Mission | null {
		return this.missions.find((m) => m.id === this.currentId) ?? null;
	}

	get totalStars(): number {
		return Object.values(this.results).reduce((sum, r) => sum + r.stars, 0);
	}

	get maxStars(): number {
		return this.missions.length * 3;
	}

	get solvedCount(): number {
		return this.missions.filter((m) => this.isSolved(m.id)).length;
	}

	get canFinish(): boolean {
		return this.solvedCount > 0;
	}

	get recommended(): string | null {
		return this.nextAfter(null);
	}

	isSolved(id: string): boolean {
		const r = this.results[id];
		return r !== undefined && !r.skipped && r.stars > 0;
	}

	/** First unsolved mission after `id` (wrapping around); from the start when `id` is null. */
	nextAfter(id: string | null): string | null {
		const start = id === null ? 0 : this.missions.findIndex((m) => m.id === id) + 1;
		for (let k = 0; k < this.missions.length; k++) {
			const m = this.missions[(start + k) % this.missions.length];
			if (!this.isSolved(m.id)) return m.id;
		}
		return null;
	}

	isLastOfLevel(id: string): boolean {
		const mission = this.missions.find((m) => m.id === id);
		if (!mission) return false;
		return this.missions.filter((m) => m.level === mission.level).at(-1)?.id === id;
	}

	begin() {
		if (this.screen !== 'attract') return;
		this.startedAt = this.now();
		this.screen = 'pilot';
	}

	setPilot(name: string) {
		if (this.screen !== 'pilot') return;
		this.pilotName = name;
		this.screen = 'map';
	}

	open(id: string) {
		if (this.screen !== 'map' && this.screen !== 'complete') return;
		if (!this.missions.some((m) => m.id === id)) return;
		this.currentId = id;
		this.screen = 'mission';
	}

	/** Stores a solved mission (best stars win) without leaving it — the kid may still tap "Karte". */
	record(result: MissionResult) {
		if (this.screen !== 'mission' || result.id !== this.currentId) return;
		const previous = this.results[result.id];
		const keep = previous !== undefined && !previous.skipped && previous.stars >= result.stars;
		this.results = { ...this.results, [result.id]: keep ? previous : result };
	}

	complete(result: MissionResult) {
		if (this.screen !== 'mission' || result.id !== this.currentId) return;
		this.record(result);
		this.lastResult = result;
		this.screen = 'complete';
	}

	skip() {
		if (this.screen !== 'mission' || this.currentId === null) return;
		const id = this.currentId;
		if (!this.results[id]) {
			this.results = {
				...this.results,
				[id]: { id, stars: 0, runs: 0, blocks: 0, seconds: 0, skipped: true, path: [] }
			};
		}
		this.screen = 'map';
	}

	backToMap() {
		if (this.screen === 'mission' || this.screen === 'complete') this.screen = 'map';
	}

	continue() {
		if (this.screen !== 'complete') return;
		const next = this.nextAfter(this.currentId);
		if (next === null) {
			this.screen = 'map';
			return;
		}
		this.currentId = next;
		this.screen = 'mission';
	}

	finish() {
		if (this.screen === 'map' && this.canFinish) this.screen = 'finale';
	}

	/** Idle reset: walking away from the finale still counts as finished. */
	timeout(): SessionSummary | null {
		return this.reset(this.screen === 'finale' ? 'finale' : 'idle');
	}

	/** Back to the attract screen. Returns what this visitor did, or null if nobody started. */
	reset(endedBy: EndedBy): SessionSummary | null {
		const summary: SessionSummary | null =
			this.startedAt === 0
				? null
				: {
						pilotName: this.pilotName,
						startedAt: this.startedAt,
						finishedAt: this.now(),
						endedBy,
						results: Object.values(this.results),
						totalStars: this.totalStars
					};
		this.screen = 'attract';
		this.pilotName = '';
		this.results = {};
		this.currentId = null;
		this.lastResult = null;
		this.startedAt = 0;
		return summary;
	}
}
