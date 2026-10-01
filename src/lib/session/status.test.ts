import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	buildStatus,
	STATUS_DEBOUNCE_MS,
	STATUS_HEARTBEAT_MS,
	StatusPublisher,
	type StationStatus,
	type StatusSource
} from './status';

const source = (extra: Partial<StatusSource> = {}): StatusSource => ({
	screen: 'mission',
	current: { id: '2.1', title: 'Runde drehen' },
	openedAt: 5000,
	help: false,
	solvedCount: 2,
	...extra
});

describe('buildStatus', () => {
	it('describes the open mission', () => {
		expect(buildStatus(source({ help: true }), 3)).toEqual({
			screen: 'mission',
			missionId: '2.1',
			missionTitle: 'Runde drehen',
			since: 5000,
			runs: 3,
			help: true,
			solved: 2
		});
	});

	it('has no mission on the map, even if one was open before', () => {
		expect(buildStatus(source({ screen: 'map' }), 3)).toMatchObject({
			missionId: null,
			missionTitle: null,
			since: null,
			runs: 0
		});
	});

	it('carries no visitor name', () => {
		const status = buildStatus({ ...source(), pilotName: 'Lea' } as StatusSource, 0);
		expect(JSON.stringify(status)).not.toContain('Lea');
	});
});

describe('StatusPublisher', () => {
	let sent: StationStatus[];
	let time: number;
	let publisher: StatusPublisher;
	const status = buildStatus(source(), 0);

	beforeEach(() => {
		vi.useFakeTimers();
		sent = [];
		time = 1000;
		publisher = new StatusPublisher(
			async (s) => {
				sent.push(s);
			},
			() => time
		);
	});

	afterEach(() => {
		publisher.stop();
		vi.useRealTimers();
	});

	it('sends a change once, after a short pause', () => {
		publisher.update(status);
		publisher.update({ ...status, runs: 1 });
		vi.advanceTimersByTime(STATUS_DEBOUNCE_MS - 1);
		expect(sent).toHaveLength(0);
		vi.advanceTimersByTime(1);
		expect(sent).toEqual([{ ...status, runs: 1, lastActivity: 1000 }]);
	});

	it('does not send an unchanged status again', () => {
		publisher.update(status);
		vi.advanceTimersByTime(STATUS_DEBOUNCE_MS);
		publisher.update({ ...status });
		vi.advanceTimersByTime(STATUS_DEBOUNCE_MS);
		expect(sent).toHaveLength(1);
	});

	it('sends a heartbeat with the latest activity', () => {
		publisher.start();
		publisher.update(status);
		vi.advanceTimersByTime(STATUS_DEBOUNCE_MS);
		time = 4000;
		publisher.activity();
		vi.advanceTimersByTime(STATUS_HEARTBEAT_MS);
		expect(sent.at(-1)?.lastActivity).toBe(4000);
		expect(sent.length).toBeGreaterThanOrEqual(2);
	});

	it('ignores a failing backend', async () => {
		const send = vi.fn(() => Promise.reject(new Error('offline')));
		const failing = new StatusPublisher(send);
		failing.update(status);
		vi.advanceTimersByTime(STATUS_DEBOUNCE_MS);
		await Promise.resolve();
		failing.stop();
		expect(send).toHaveBeenCalledOnce();
	});

	it('sends nothing after stop', () => {
		publisher.start();
		publisher.update(status);
		publisher.stop();
		vi.advanceTimersByTime(STATUS_HEARTBEAT_MS * 2);
		expect(sent).toHaveLength(0);
	});
});
