import { Spring } from 'svelte/motion';
import type { Frame, Pose } from './timeline';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const key = (x: number, y: number) => `${x},${y}`;

export class Player {
	x = new Spring(0, { stiffness: 0.18, damping: 0.55 });
	y = new Spring(0, { stiffness: 0.18, damping: 0.55 });
	heading = new Spring(0, { stiffness: 0.22, damping: 0.6 });
	lift = new Spring(0, { stiffness: 0.12, damping: 0.4 });
	carrying = $state(false);
	line = $state<number | null>(null);
	bump = $state(0);
	playing = $state(false);
	/** Map as the drone changes it (parcels disappear when picked up). */
	rows = $state<string[]>([]);
	visited = $state<string[]>([]);
	photographed = $state<string[]>([]);
	flash = $state(0);
	sensing = $state<boolean | null>(null);
	private token = 0;

	reset(pose: Pose, rows: string[]) {
		this.token++;
		this.playing = false;
		this.line = null;
		this.sensing = null;
		this.carrying = pose.carrying;
		this.rows = [...rows];
		this.visited = [key(pose.x, pose.y)];
		this.photographed = [];
		this.x.set(pose.x, { instant: true });
		this.y.set(pose.y, { instant: true });
		this.heading.set(pose.heading, { instant: true });
		this.lift.set(pose.flying ? 1 : 0, { instant: true });
	}

	/** Plays the frames. Resolves true if finished, false if cancelled by reset/stop/another play. */
	async play(frames: Frame[], speed = 1): Promise<boolean> {
		const token = ++this.token;
		this.playing = true;
		for (const frame of frames) {
			if (token !== this.token) return false;
			const { pose } = frame;
			this.line = frame.line;
			this.sensing = frame.kind === 'sense' ? (frame.ahead ?? null) : null;
			if (frame.kind === 'crash') this.bump++;
			if (frame.kind === 'photo') {
				this.flash++;
				const here = key(pose.x, pose.y);
				if (frame.hit && !this.photographed.includes(here)) {
					this.photographed = [...this.photographed, here];
				}
			}
			if (frame.kind === 'pickup') {
				const row = this.rows[pose.y];
				this.rows[pose.y] = row.slice(0, pose.x) + '.' + row.slice(pose.x + 1);
			}
			const here = key(pose.x, pose.y);
			if (!this.visited.includes(here)) this.visited = [...this.visited, here];
			this.x.target = pose.x;
			this.y.target = pose.y;
			this.heading.target = pose.heading;
			this.lift.target = pose.flying ? 1 : 0;
			this.carrying = pose.carrying;
			await sleep(frame.ms / speed);
		}
		if (token !== this.token) return false;
		this.playing = false;
		this.line = null;
		this.sensing = null;
		return true;
	}

	stop() {
		this.token++;
		this.playing = false;
		this.line = null;
		this.sensing = null;
	}
}
