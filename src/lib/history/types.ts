export interface MissionStat {
	id: string;
	stars: number;
	runs: number;
	blocks: number;
	seconds: number;
	skipped: boolean;
}

/** One visit (spec 4.6). Immutable except that the name is removed after the retention. */
export interface SessionRecord {
	id: string;
	v: 1;
	event: string;
	station: string;
	mode: 'showcase' | 'lern';
	startedAt: string;
	finishedAt: string;
	pilotName: string | null;
	totalStars: number;
	missions: MissionStat[];
	endedBy: 'finale' | 'idle' | 'quit';
}

export interface PeerInfo {
	station: string;
	name: string;
	address: string;
	lastSeenMs: number;
	lastOkMs: number | null;
}
