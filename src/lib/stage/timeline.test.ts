import { describe, expect, it } from 'vitest';
import { buildTimeline, headingOf, startPose } from './timeline';

const start = { x: 2, y: 4, dir: 'N' as const };

describe('buildTimeline', () => {
	it('starts from the start pose', () => {
		expect(startPose(start)).toEqual({ x: 2, y: 4, heading: 0, flying: false, carrying: false });
	});

	it('produces one frame per event with the resulting pose', () => {
		const frames = buildTimeline(start, [
			{ kind: 'takeoff', line: 3 },
			{ kind: 'move', line: 4, x: 2, y: 3 },
			{ kind: 'land', line: 5 }
		]);
		expect(frames.map((f) => [f.kind, f.line, f.pose.x, f.pose.y, f.pose.flying])).toEqual([
			['takeoff', 3, 2, 4, true],
			['move', 4, 2, 3, true],
			['land', 5, 2, 3, false]
		]);
		expect(frames.every((f) => f.ms > 0)).toBe(true);
	});

	it('turns along the shortest way', () => {
		const frames = buildTimeline(start, [
			{ kind: 'turn', line: 3, dir: 'W' },
			{ kind: 'turn', line: 4, dir: 'N' },
			{ kind: 'turn', line: 5, dir: 'E' },
			{ kind: 'turn', line: 6, dir: 'S' }
		]);
		expect(frames.map((f) => f.pose.heading)).toEqual([-90, 0, 90, 180]);
	});

	it('keeps turning continuously past a full circle', () => {
		const frames = buildTimeline(start, [
			{ kind: 'turn', line: 3, dir: 'E' },
			{ kind: 'turn', line: 3, dir: 'S' },
			{ kind: 'turn', line: 3, dir: 'W' },
			{ kind: 'turn', line: 3, dir: 'N' }
		]);
		expect(frames.at(-1)?.pose.heading).toBe(360);
	});

	it('does not move the drone on a crash', () => {
		const frames = buildTimeline(start, [
			{ kind: 'takeoff', line: 3 },
			{ kind: 'crash', line: 4, x: 2, y: 3, into: 'building' }
		]);
		expect(frames[1].pose).toMatchObject({ x: 2, y: 4 });
	});

	it('tracks carrying', () => {
		const frames = buildTimeline(start, [
			{ kind: 'pickup', line: 3 },
			{ kind: 'drop', line: 4 }
		]);
		expect(frames.map((f) => f.pose.carrying)).toEqual([true, false]);
	});

	it('maps directions to headings', () => {
		expect(['N', 'E', 'S', 'W'].map((d) => headingOf(d as 'N'))).toEqual([0, 90, 180, 270]);
	});
});
