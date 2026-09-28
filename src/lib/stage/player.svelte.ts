import { Spring } from 'svelte/motion';
import type { Frame, Pose } from './timeline';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Player {
	x = new Spring(0, { stiffness: 0.18, damping: 0.55 });
	y = new Spring(0, { stiffness: 0.18, damping: 0.55 });
	heading = new Spring(0, { stiffness: 0.22, damping: 0.6 });
	lift = new Spring(0, { stiffness: 0.12, damping: 0.4 });
	carrying = $state(false);
	line = $state<number | null>(null);
	bump = $state(0);
	playing = $state(false);
	private token = 0;

	reset(pose: Pose) {
		this.token++;
		this.playing = false;
		this.line = null;
		this.carrying = pose.carrying;
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
			this.line = frame.line;
			if (frame.kind === 'crash') this.bump++;
			this.x.target = frame.pose.x;
			this.y.target = frame.pose.y;
			this.heading.target = frame.pose.heading;
			this.lift.target = frame.pose.flying ? 1 : 0;
			this.carrying = frame.pose.carrying;
			await sleep(frame.ms / speed);
		}
		if (token !== this.token) return false;
		this.playing = false;
		this.line = null;
		return true;
	}

	stop() {
		this.token++;
		this.playing = false;
		this.line = null;
	}
}
