import { prefersReducedMotion } from 'svelte/motion';

/** Spring presets used everywhere, so the whole app moves the same way. */
export const SPRINGS = {
	bouncy: { stiffness: 0.12, damping: 0.32 },
	snappy: { stiffness: 0.3, damping: 0.7 },
	gentle: { stiffness: 0.08, damping: 0.8 }
} as const;

export type SpringPreset = keyof typeof SPRINGS;

export function springOptions(
	preset: SpringPreset,
	reduced: boolean = prefersReducedMotion.current
): { stiffness: number; damping: number } {
	return reduced ? { stiffness: 1, damping: 1 } : { ...SPRINGS[preset] };
}
