import type { PublicConfig } from '$lib/platform/types';
import type { SessionSummary } from '$lib/session/types';
import type { SessionRecord } from './types';

export function toRecord(
	summary: SessionSummary,
	config: PublicConfig,
	id: string = crypto.randomUUID()
): SessionRecord {
	return {
		id,
		v: 1,
		event: config.eventCode,
		station: config.stationId,
		mode: 'showcase',
		startedAt: new Date(summary.startedAt).toISOString(),
		finishedAt: new Date(summary.finishedAt).toISOString(),
		pilotName: summary.pilotName || null,
		totalStars: summary.totalStars,
		missions: summary.results.map(({ id, stars, runs, blocks, seconds, skipped, path }) => ({
			id,
			stars,
			runs,
			blocks,
			seconds,
			skipped,
			// solved flights keep their path for the wall display's replays
			...(!skipped && stars > 0 && path.length > 0 ? { path } : {})
		})),
		endedBy: summary.endedBy
	};
}
