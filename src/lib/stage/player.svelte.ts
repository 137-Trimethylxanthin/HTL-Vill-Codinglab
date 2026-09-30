import { prefersReducedMotion, Spring } from 'svelte/motion';
import type { Frame, Pose } from './timeline';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const key = (x: number, y: number) => `${x},${y}`;

export class Player {
	readonly x: Spring<number>;
	readonly y: Spring<number>;
	readonly heading: Spring<number>;
	readonly lift: Spring<number>;
	carrying = $state(false);
	line = $state<number | null>(null);
	bump = $state(0);
	playing = $state(false);
	/** Map as the drone changes it (parcels disappear when picked up). */
	rows = $state<string[]>([]);
	visited = $state<string[]>([]);
	photographed = $state<string[]>([]);
	/** Drop spots where the drone has put down a parcel. */
	delivered = $state<string[]>([]);
	flash = $state(0);
	sensing = $state<boolean | null>(null);
	private token = 0;

	constructor(reduced: boolean = prefersReducedMotion.current) {
		const opt = (stiffness: number, damping: number) =>
			reduced ? { stiffness: 1, damping: 1 } : { stiffness, damping };
		this.x = new Spring(0, opt(0.18, 0.55));
		this.y = new Spring(0, opt(0.18, 0.55));
		this.heading = new Spring(0, opt(0.22, 0.6));
		this.lift = new Spring(0, opt(0.12, 0.4));
	}

	reset(pose: Pose, rows: string[]) {
		this.token++;
		this.playing = false;
		this.line = null;
		this.sensing = null;
		this.carrying = pose.carrying;
		this.rows = [...rows];
		this.visited = [key(pose.x, pose.y)];
		this.photographed = [];
		this.delivered = [];
		this.x.set(pose.x, { instant: true });
		this.y.set(pose.y, { instant: true });
		this.heading.set(pose.heading, { instant: true });
		this.lift.set(pose.flying ? 1 : 0, { instant: true });
	}

	/**
	 * Plays the frames. Resolves true if finished, false if cancelled by reset/stop/another play.
	 * `speed` is read before every frame, so the speed button works during a flight.
	 */
	async play(frames: Frame[], speed: () => number = () => 1): Promise<boolean> {
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
			if (frame.kind === 'drop') {
				const here = key(pose.x, pose.y);
				if (!this.delivered.includes(here)) this.delivered = [...this.delivered, here];
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
			await sleep(frame.ms / speed());
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
