import { describe, expect, it } from 'vitest';
import { recordsCsv } from './csv';

describe('recordsCsv', () => {
	it('writes one line per session with a header, formula-safe', () => {
		const csv = recordsCsv([
			{
				id: 'a',
				v: 1,
				event: 'TDOT',
				station: 's1',
				mode: 'showcase',
				startedAt: '2026-10-10T10:00:00.000Z',
				finishedAt: '2026-10-10T10:10:00.000Z',
				pilotName: '=cmd',
				totalStars: 4,
				missions: [
					{ id: '1.1', stars: 3, runs: 1, blocks: 3, seconds: 40, skipped: false },
					{ id: '1.2', stars: 0, runs: 0, blocks: 0, seconds: 0, skipped: true }
				],
				endedBy: 'finale'
			}
		]);
		const lines = csv.trim().split('\n');
		expect(lines[0]).toBe('Ende;Station;Event;Pilot;Sterne;Beendet durch;Dauer (s);Missionen');
		expect(lines[1]).toBe(
			"2026-10-10T10:10:00.000Z;s1;TDOT;'=cmd;4;finale;600;1.1:3:40 1.2:übersprungen"
		);
	});
});
