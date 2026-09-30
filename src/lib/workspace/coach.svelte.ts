/** Decides when the coach shows which hint. Hints get more concrete each time. */
export class CoachState {
	hint = $state<string | null>(null);
	private level = 0;
	private fails = 0;
	private done = false;
	private timer: ReturnType<typeof setTimeout> | undefined;

	constructor(
		private readonly hints: string[],
		private readonly idleMs = 20000
	) {
		this.arm();
	}

	activity() {
		if (!this.done) this.arm();
	}

	/** While the drone flies the visitor is busy watching: no idle hints until the next activity. */
	pause() {
		clearTimeout(this.timer);
	}

	failed() {
		if (this.done) return;
		this.fails += 1;
		if (this.fails >= 2) {
			this.fails = 0;
			this.show();
		}
		this.arm();
	}

	succeeded() {
		this.done = true;
		this.hint = null;
		clearTimeout(this.timer);
	}

	request() {
		this.show();
		if (!this.done) this.arm();
	}

	dismiss() {
		this.hint = null;
	}

	dispose() {
		clearTimeout(this.timer);
	}

	private show() {
		if (this.hints.length === 0) return;
		this.hint = this.hints[Math.min(this.level, this.hints.length - 1)];
		this.level += 1;
	}

	private arm() {
		clearTimeout(this.timer);
		this.timer = setTimeout(() => {
			this.show();
			this.arm();
		}, this.idleMs);
	}
}
