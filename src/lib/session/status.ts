import type { Screen } from './types';

/** What a station tells supervisors about itself. No visitor names (privacy). */
export interface StationStatus {
	screen: Screen;
	missionId: string | null;
	missionTitle: string | null;
	/** When the current mission was opened (ms epoch), or null. */
	since: number | null;
	/** Last tap or key press (ms epoch). */
	lastActivity: number;
	/** Start presses in the current mission. */
	runs: number;
	help: boolean;
	solved: number;
}

export interface StatusSource {
	screen: Screen;
	current: { id: string; title: string } | null;
	openedAt: number;
	help: boolean;
	solvedCount: number;
}

/** The status without the activity time (that alone is not worth a push). */
export function buildStatus(
	session: StatusSource,
	runs: number
): Omit<StationStatus, 'lastActivity'> {
	const inMission = session.screen === 'mission' || session.screen === 'complete';
	const mission = inMission ? session.current : null;
	return {
		screen: session.screen,
		missionId: mission?.id ?? null,
		missionTitle: mission?.title ?? null,
		since: mission && session.openedAt > 0 ? session.openedAt : null,
		runs: session.screen === 'mission' ? runs : 0,
		help: session.help,
		solved: session.solvedCount
	};
}

export const STATUS_DEBOUNCE_MS = 1_000;
export const STATUS_HEARTBEAT_MS = 10_000;

/** Sends the status shortly after it changes (debounced) and regularly as a heartbeat. */
export class StatusPublisher {
	private latest: Omit<StationStatus, 'lastActivity'> | null = null;
	private lastKey = '';
	private lastActivity: number;
	private debounce: ReturnType<typeof setTimeout> | undefined;
	private heartbeat: ReturnType<typeof setInterval> | undefined;

	constructor(
		private readonly send: (status: StationStatus) => Promise<void>,
		private readonly now: () => number = () => Date.now()
	) {
		this.lastActivity = now();
	}

	update(status: Omit<StationStatus, 'lastActivity'>) {
		this.latest = status;
		const key = JSON.stringify(status);
		if (key === this.lastKey) return;
		this.lastKey = key;
		clearTimeout(this.debounce);
		this.debounce = setTimeout(() => this.flush(), STATUS_DEBOUNCE_MS);
	}

	activity() {
		this.lastActivity = this.now();
	}

	start() {
		clearInterval(this.heartbeat);
		this.heartbeat = setInterval(() => this.flush(), STATUS_HEARTBEAT_MS);
	}

	stop() {
		clearTimeout(this.debounce);
		clearInterval(this.heartbeat);
	}

	private flush() {
		clearTimeout(this.debounce);
		if (!this.latest) return;
		// A missing backend must never disturb the visitor.
		void this.send({ ...this.latest, lastActivity: this.lastActivity }).catch(() => {});
	}
}
