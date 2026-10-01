import type { Mission } from '$lib/missions/schema';
import type { EndedBy, MissionResult, Screen, SessionSummary } from './types';

/** A second tap on "Hilfe" this soon after the first is the same tap (double tap), not "cancel". */
export const HELP_GUARD_MS = 400;
/** Solving after "Blöcke zum Ordnen" earns at most this many stars. */
export const ORDERED_MAX_STARS = 2;

/** One visitor's walk through the Showcase. Wrong-state calls are ignored on purpose (double taps). */
export class Session {
	screen = $state<Screen>('attract');
	pilotName = $state('');
	/** Two kids play together: one taps (pilot), one tells what to do (navigator); they swap. */
	duo = $state(false);
	/** Missions opened so far; decides whose turn it is to tap in duo mode. */
	turns = $state(0);
	private lastTurnId: string | null = null;
	results = $state<Record<string, MissionResult>>({});
	currentId = $state<string | null>(null);
	lastResult = $state<MissionResult | null>(null);
	/** The visitor asked for a supervisor. */
	help = $state(false);
	/** When the current mission was opened (0 = none). */
	openedAt = $state(0);
	/** Missions whose reference solution a supervisor loaded: they never count for stars. */
	revealed = $state<string[]>([]);
	/** Missions a supervisor turned into "put the blocks in order": at most ORDERED_MAX_STARS. */
	ordered = $state<string[]>([]);
	/** Counts "show solution" (and "order the blocks") presses, so each press rebuilds the program. */
	revealTick = $state(0);
	private startedAt = 0;
	private helpToggledAt = -Infinity;

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

	get startedAtMs(): number {
		return this.startedAt;
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

	isRevealed(id: string): boolean {
		return this.revealed.includes(id);
	}

	toggleHelp() {
		const now = this.now();
		if (now - this.helpToggledAt < HELP_GUARD_MS) return;
		this.helpToggledAt = now;
		this.help = !this.help;
	}

	clearHelp() {
		this.help = false;
	}

	/** Supervisor: load the solution for the current mission. Solving it then counts as skipped. */
	reveal() {
		if (this.screen !== 'mission' || this.currentId === null) return;
		if (!this.isRevealed(this.currentId)) this.revealed = [...this.revealed, this.currentId];
		this.revealTick += 1;
		this.help = false;
	}

	isOrdered(id: string): boolean {
		return this.ordered.includes(id);
	}

	/** Supervisor: the solution's blocks, shuffled, for the kid to put in order. Counts, but capped. */
	order() {
		if (this.screen !== 'mission' || this.currentId === null) return;
		if (this.isRevealed(this.currentId)) return;
		if (!this.isOrdered(this.currentId)) this.ordered = [...this.ordered, this.currentId];
		this.revealTick += 1;
		this.help = false;
	}

	/** What a result is worth after supervisor help: nothing with the solution, capped when ordered. */
	private counted(result: MissionResult): MissionResult {
		if (this.isRevealed(result.id)) return { ...result, stars: 0, skipped: true };
		if (this.isOrdered(result.id) && result.stars > ORDERED_MAX_STARS)
			return { ...result, stars: ORDERED_MAX_STARS };
		return result;
	}

	/** Supervisor: jump straight to a mission from the map, a mission or the complete screen. */
	goTo(id: string) {
		if (this.screen === 'mission' && this.currentId === id) return;
		this.backToMap();
		this.open(id);
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

	/** A different mission means the other kid taps; reopening the same one keeps the roles. */
	private nextTurn(id: string) {
		if (id === this.lastTurnId) return;
		this.lastTurnId = id;
		this.turns += 1;
	}

	/** Which of the two kids taps in this mission (1 or 2); null when playing alone. */
	get driver(): 1 | 2 | null {
		if (!this.duo) return null;
		return this.turns % 2 === 1 ? 1 : 2;
	}

	setPilot(name: string, duo = false) {
		if (this.screen !== 'pilot') return;
		this.pilotName = name;
		this.duo = duo;
		this.turns = 0;
		this.lastTurnId = null;
		this.screen = 'map';
	}

	open(id: string) {
		if (this.screen !== 'map' && this.screen !== 'complete') return;
		if (!this.missions.some((m) => m.id === id)) return;
		this.currentId = id;
		this.openedAt = this.now();
		this.nextTurn(id);
		this.screen = 'mission';
	}

	/** Stores a solved mission (best stars win) without leaving it — the kid may still tap "Karte". */
	record(result: MissionResult) {
		if (this.screen !== 'mission' || result.id !== this.currentId) return;
		result = this.counted(result);
		this.help = false;
		const previous = this.results[result.id];
		const keep = previous !== undefined && !previous.skipped && previous.stars >= result.stars;
		this.results = { ...this.results, [result.id]: keep ? previous : result };
	}

	complete(result: MissionResult) {
		if (this.screen !== 'mission' || result.id !== this.currentId) return;
		this.record(result);
		this.lastResult = this.counted(result);
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
		// Help is asked for in a mission; on the map nobody could switch it off again.
		this.help = false;
		this.screen = 'map';
	}

	backToMap() {
		if (this.screen === 'mission' || this.screen === 'complete') {
			this.help = false;
			this.screen = 'map';
		}
	}

	continue() {
		if (this.screen !== 'complete') return;
		const next = this.nextAfter(this.currentId);
		if (next === null) {
			this.screen = 'map';
			return;
		}
		this.currentId = next;
		this.openedAt = this.now();
		this.nextTurn(next);
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
		this.help = false;
		this.openedAt = 0;
		this.revealed = [];
		this.ordered = [];
		this.revealTick = 0;
		this.startedAt = 0;
		return summary;
	}
}
