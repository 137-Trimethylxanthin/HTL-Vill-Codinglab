/**
 * Short synthesized sound effects (WebAudio, no audio files). Quiet by design: a hall full
 * of stations must not turn into noise. Every call is a no-op while sound is off or before
 * the browser allows audio (it needs a first tap).
 */
export type Effect = 'snap' | 'poof' | 'takeoff' | 'land' | 'crash' | 'photo' | 'success' | 'fail';

interface Tone {
	/** Start frequency in Hz, optional glide target. */
	freq: number;
	to?: number;
	/** Start time and duration in seconds. */
	at: number;
	dur: number;
	type?: OscillatorType;
	gain?: number;
}

const MASTER = 0.18;

export const EFFECTS: Record<Effect, Tone[]> = {
	snap: [{ freq: 900, to: 600, at: 0, dur: 0.06, type: 'triangle', gain: 0.8 }],
	poof: [{ freq: 300, to: 80, at: 0, dur: 0.22, type: 'sawtooth', gain: 0.35 }],
	takeoff: [{ freq: 220, to: 660, at: 0, dur: 0.45, type: 'triangle', gain: 0.5 }],
	land: [{ freq: 520, to: 200, at: 0, dur: 0.35, type: 'triangle', gain: 0.5 }],
	crash: [
		{ freq: 140, to: 60, at: 0, dur: 0.25, type: 'square', gain: 0.5 },
		{ freq: 110, to: 50, at: 0.08, dur: 0.25, type: 'square', gain: 0.4 }
	],
	photo: [{ freq: 1800, at: 0, dur: 0.04, type: 'square', gain: 0.3 }],
	success: [
		{ freq: 523, at: 0, dur: 0.14, type: 'triangle' },
		{ freq: 659, at: 0.12, dur: 0.14, type: 'triangle' },
		{ freq: 784, at: 0.24, dur: 0.14, type: 'triangle' },
		{ freq: 1047, at: 0.36, dur: 0.35, type: 'triangle' }
	],
	fail: [
		{ freq: 392, at: 0, dur: 0.18, type: 'triangle', gain: 0.6 },
		{ freq: 311, at: 0.16, dur: 0.3, type: 'triangle', gain: 0.6 }
	]
};

let enabled = true;
let ctx: AudioContext | null = null;

export function setSoundEnabled(on: boolean) {
	enabled = on;
}

function context(): AudioContext | null {
	if (typeof AudioContext === 'undefined') return null;
	try {
		ctx ??= new AudioContext();
	} catch {
		return null;
	}
	if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
	return ctx;
}

export function play(effect: Effect) {
	if (!enabled) return;
	const audio = context();
	if (!audio || audio.state !== 'running') return;
	const now = audio.currentTime;
	for (const tone of EFFECTS[effect]) {
		const osc = audio.createOscillator();
		const env = audio.createGain();
		const start = now + tone.at;
		const end = start + tone.dur;
		osc.type = tone.type ?? 'sine';
		osc.frequency.setValueAtTime(tone.freq, start);
		if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, end);
		// Quick attack, smooth release: no clicks.
		env.gain.setValueAtTime(0.0001, start);
		env.gain.exponentialRampToValueAtTime(MASTER * (tone.gain ?? 1), start + 0.01);
		env.gain.exponentialRampToValueAtTime(0.0001, end);
		osc.connect(env).connect(audio.destination);
		osc.start(start);
		osc.stop(end + 0.02);
	}
}

/** Browsers only start audio after a user gesture: call this from the first tap. */
export function unlockSound() {
	if (enabled) context();
}
