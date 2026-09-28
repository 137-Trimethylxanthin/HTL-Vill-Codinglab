import type { Dir } from '$lib/missions/schema';
import type { DroneEvent } from '$lib/sim/world';

export interface Pose {
	x: number;
	y: number;
	/** Degrees, continuous (may exceed 360 or go negative). */
	heading: number;
	flying: boolean;
	carrying: boolean;
}

export interface Frame {
	pose: Pose;
	line: number;
	kind: DroneEvent['kind'];
	ms: number;
	/** Photo frames: was a panel below the drone? */
	hit?: boolean;
	/** Sensor frames: was there an obstacle ahead? */
	ahead?: boolean;
}

const DURATION: Record<DroneEvent['kind'], number> = {
	takeoff: 550,
	land: 550,
	move: 380,
	turn: 300,
	pickup: 450,
	drop: 450,
	photo: 400,
	sense: 320,
	crash: 700
};

const HEADING: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 };

export function headingOf(dir: Dir): number {
	return HEADING[dir];
}

export function startPose(start: { x: number; y: number; dir: Dir }): Pose {
	return { x: start.x, y: start.y, heading: headingOf(start.dir), flying: false, carrying: false };
}

function turnTo(current: number, dir: Dir): number {
	const normalized = ((current % 360) + 360) % 360;
	const delta = ((headingOf(dir) - normalized + 540) % 360) - 180;
	return current + delta;
}

export function buildTimeline(
	start: { x: number; y: number; dir: Dir },
	events: DroneEvent[]
): Frame[] {
	let pose = startPose(start);
	return events.map((event) => {
		const frame: Partial<Frame> = {};
		switch (event.kind) {
			case 'takeoff':
				pose = { ...pose, flying: true };
				break;
			case 'land':
				pose = { ...pose, flying: false };
				break;
			case 'move':
				pose = { ...pose, x: event.x, y: event.y };
				break;
			case 'turn':
				pose = { ...pose, heading: turnTo(pose.heading, event.dir) };
				break;
			case 'pickup':
				pose = { ...pose, carrying: true };
				break;
			case 'drop':
				pose = { ...pose, carrying: false };
				break;
			case 'photo':
				frame.hit = event.hit;
				break;
			case 'sense':
				frame.ahead = event.ahead;
				break;
			case 'crash':
				break;
		}
		return { ...frame, pose, line: event.line, kind: event.kind, ms: DURATION[event.kind] };
	});
}
