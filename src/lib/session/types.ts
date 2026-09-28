import type { Stars } from '$lib/missions/stars';

export type Screen = 'attract' | 'pilot' | 'map' | 'mission' | 'complete' | 'finale';
export type EndedBy = 'finale' | 'idle' | 'quit';

export interface MissionResult {
	id: string;
	stars: Stars;
	runs: number;
	blocks: number;
	seconds: number;
	skipped: boolean;
	/** Visited cells "x,y" in visiting order (for the flight-path picture). */
	path: string[];
}

export interface SessionSummary {
	pilotName: string;
	startedAt: number;
	finishedAt: number;
	endedBy: EndedBy;
	results: MissionResult[];
	totalStars: number;
}
