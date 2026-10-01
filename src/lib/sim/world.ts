import type { StopCode } from '$lib/i18n/de';
import type { Dir, Mission } from '$lib/missions/schema';

export type DroneEvent = (
	| { kind: 'takeoff' | 'land' | 'pickup' | 'drop'; line: number }
	| { kind: 'move'; line: number; x: number; y: number }
	| { kind: 'turn'; line: number; dir: Dir }
	| { kind: 'photo'; line: number; hit: boolean }
	| { kind: 'sense'; line: number; ahead: boolean }
	| { kind: 'crash'; line: number; x: number; y: number; into: 'building' | 'edge' }
) & {
	/** Which drone command produced the event (counts from 1); forward(3) gives 3 events of one call. */
	call?: number;
};

export interface Stop {
	reason: 'crash' | 'error' | 'limit' | 'timeout';
	code: StopCode;
	line: number;
}

export interface WorldSnapshot {
	x: number;
	y: number;
	dir: Dir;
	flying: boolean;
	carrying: boolean;
	rows: string[];
	delivered: number;
	photographed: string[];
	/** Every cell the drone has been over, as "x,y", start included. */
	visited: string[];
}

export const DIRS: Dir[] = ['N', 'E', 'S', 'W'];
const STEP: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const MAX_STEPS_PER_CALL = 99;

export class World {
	readonly events: DroneEvent[] = [];
	stop: Stop | null = null;
	private calls = 0;
	private s: WorldSnapshot;

	constructor(
		mission: Mission,
		private readonly maxEvents = 500
	) {
		const { rows, start } = mission.map;
		this.s = {
			x: start.x,
			y: start.y,
			dir: start.dir,
			flying: false,
			carrying: false,
			rows: [...rows],
			delivered: 0,
			photographed: [],
			visited: [`${start.x},${start.y}`]
		};
	}

	snapshot(): WorldSnapshot {
		return {
			...this.s,
			rows: [...this.s.rows],
			photographed: [...this.s.photographed],
			visited: [...this.s.visited]
		};
	}

	/** Executes one drone command. Returns false when the program must stop. */
	call(name: string, line: number, arg?: unknown): boolean {
		if (this.stop) return false;
		this.calls++;
		switch (name) {
			case 'takeoff':
				if (this.s.flying) return this.fail('error', 'alreadyFlying', line);
				this.s.flying = true;
				return this.push({ kind: 'takeoff', line });
			case 'land':
				if (!this.s.flying) return this.fail('error', 'notFlying', line);
				this.s.flying = false;
				return this.push({ kind: 'land', line });
			case 'forward':
				return this.forward(line, arg);
			case 'turn_left':
			case 'turn_right': {
				const turn = name === 'turn_left' ? 3 : 1;
				this.s.dir = DIRS[(DIRS.indexOf(this.s.dir) + turn) % 4];
				return this.push({ kind: 'turn', line, dir: this.s.dir });
			}
			case 'pick_up':
				if (this.s.carrying || this.tile() !== 'K') return this.fail('error', 'noParcel', line);
				this.s.carrying = true;
				this.setTile('.');
				return this.push({ kind: 'pickup', line });
			case 'drop':
				if (!this.s.carrying) return this.fail('error', 'notCarrying', line);
				if (this.tile() !== 'D') return this.fail('error', 'wrongDropSpot', line);
				this.s.carrying = false;
				this.s.delivered += 1;
				return this.push({ kind: 'drop', line });
			case 'photo': {
				const hit = this.tile() === 'S';
				const key = `${this.s.x},${this.s.y}`;
				if (hit && !this.s.photographed.includes(key)) this.s.photographed.push(key);
				return this.push({ kind: 'photo', line, hit });
			}
			default:
				return this.fail('error', 'unknownCommand', line);
		}
	}

	/** Answers a sensor question. Returns undefined when the program must stop. */
	sense(name: string, line: number): boolean | undefined {
		if (this.stop) return undefined;
		this.calls++;
		if (name !== 'obstacle_ahead') {
			this.fail('error', 'unknownCommand', line);
			return undefined;
		}
		const [dx, dy] = STEP[this.s.dir];
		const tile = this.s.rows[this.s.y + dy]?.[this.s.x + dx];
		const ahead = tile === undefined || tile === 'B';
		return this.push({ kind: 'sense', line, ahead }) ? ahead : undefined;
	}

	private forward(line: number, arg: unknown): boolean {
		if (!this.s.flying) return this.fail('error', 'notFlying', line);
		const steps = arg === undefined ? 1 : arg;
		if (
			typeof steps !== 'number' ||
			!Number.isInteger(steps) ||
			steps < 1 ||
			steps > MAX_STEPS_PER_CALL
		) {
			return this.fail('error', 'badNumber', line);
		}
		const [dx, dy] = STEP[this.s.dir];
		for (let i = 0; i < steps; i++) {
			const x = this.s.x + dx;
			const y = this.s.y + dy;
			const tile = this.s.rows[y]?.[x];
			if (tile === undefined || tile === 'B') {
				const into = tile === 'B' ? 'building' : 'edge';
				this.events.push({ kind: 'crash', line, x, y, into, call: this.calls });
				return this.fail('crash', into, line);
			}
			this.s.x = x;
			this.s.y = y;
			const key = `${x},${y}`;
			if (!this.s.visited.includes(key)) this.s.visited.push(key);
			if (!this.push({ kind: 'move', line, x, y })) return false;
		}
		return true;
	}

	private tile(): string | undefined {
		return this.s.rows[this.s.y]?.[this.s.x];
	}

	private setTile(ch: string) {
		const row = this.s.rows[this.s.y];
		this.s.rows[this.s.y] = row.slice(0, this.s.x) + ch + row.slice(this.s.x + 1);
	}

	private push(event: DroneEvent): boolean {
		if (this.events.length >= this.maxEvents) return this.fail('limit', 'tooManySteps', event.line);
		this.events.push({ ...event, call: this.calls });
		return true;
	}

	private fail(reason: Stop['reason'], code: StopCode, line: number): false {
		this.stop = { reason, code, line };
		return false;
	}
}
