import { IDLE_MS, WARN_MS } from '$lib/config/defaults';

/** After `idleMs` without activity: show a warning with a countdown, then call `onTimeout`. */
export class IdleTimer {
	warning = $state(false);
	remaining = $state(0);
	private running = false;
	private idle: ReturnType<typeof setTimeout> | undefined;
	private tick: ReturnType<typeof setInterval> | undefined;

	constructor(
		private readonly onTimeout: () => void,
		private readonly idleMs = IDLE_MS,
		private readonly warnMs = WARN_MS
	) {}

	start() {
		this.running = true;
		this.warning = false;
		this.arm();
	}

	stop() {
		this.running = false;
		this.clear();
		this.warning = false;
	}

	activity() {
		if (!this.running) return;
		this.warning = false;
		this.arm();
	}

	private arm() {
		this.clear();
		this.idle = setTimeout(() => this.warn(), this.idleMs);
	}

	private warn() {
		this.warning = true;
		this.remaining = Math.ceil(this.warnMs / 1000);
		this.tick = setInterval(() => {
			this.remaining -= 1;
			if (this.remaining <= 0) {
				this.stop();
				this.onTimeout();
			}
		}, 1000);
	}

	private clear() {
		clearTimeout(this.idle);
		clearInterval(this.tick);
	}
}
