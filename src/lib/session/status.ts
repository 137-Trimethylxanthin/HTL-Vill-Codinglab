import type { BlockNode } from '$lib/blocks/types';
import { compact, type Compact } from '$lib/master/compact';
import type { Screen } from './types';

/** Where the drone is, for the master's live mini-view. */
export interface LivePose {
	x: number;
	y: number;
	heading: number;
	flying: boolean;
	carrying: boolean;
}

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
	/** Failed runs in a row on the current mission (the overview flags a stuck visitor). */
	fails: number;
	help: boolean;
	solved: number;
	/** For the master's mini-view: the visitor's blocks and the drone (mission screen only). */
	program?: Compact[];
	pose?: LivePose;
	/** When the current visitor started (ms epoch), for the master's visit timer. */
	visitSince?: number;
	/** A master paused this station. */
	paused?: boolean;
}

export interface StatusSource {
	screen: Screen;
	current: { id: string; title: string } | null;
	openedAt: number;
	help: boolean;
	solvedCount: number;
	startedAtMs?: number;
}

/** The status without the activity time (that alone is not worth a push). */
export function buildStatus(
	session: StatusSource,
	runs: number,
	fails = 0,
	live: { program: BlockNode[]; pose: LivePose } | null = null,
	paused = false
): Omit<StationStatus, 'lastActivity'> {
	const inMission = session.screen === 'mission' || session.screen === 'complete';
	const mission = inMission ? session.current : null;
	return {
		screen: session.screen,
		missionId: mission?.id ?? null,
		missionTitle: mission?.title ?? null,
		since: mission && session.openedAt > 0 ? session.openedAt : null,
		runs: session.screen === 'mission' ? runs : 0,
		fails: session.screen === 'mission' ? fails : 0,
		help: session.help,
		solved: session.solvedCount,
		...(session.screen === 'mission' && live
			? { program: compact(live.program), pose: live.pose }
			: {}),
		...(session.startedAtMs ? { visitSince: session.startedAtMs } : {}),
		paused
	};
}

export const STATUS_DEBOUNCE_MS = 1_000;
export const STATUS_HEARTBEAT_MS = 10_000;

/**
 * Sends the status shortly after it changes (at most once per STATUS_DEBOUNCE_MS, so a flying
 * drone still shows up live on the master) and regularly as a heartbeat.
 */
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
		// Throttle, not debounce: changes every few hundred ms (a flight) must not starve the send.
		this.debounce ??= setTimeout(() => this.flush(), STATUS_DEBOUNCE_MS);
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
		this.debounce = undefined;
		clearInterval(this.heartbeat);
	}

	private flush() {
		clearTimeout(this.debounce);
		this.debounce = undefined;
		if (!this.latest) return;
		// A missing backend must never disturb the visitor.
		void this.send({ ...this.latest, lastActivity: this.lastActivity }).catch(() => {});
	}
}
