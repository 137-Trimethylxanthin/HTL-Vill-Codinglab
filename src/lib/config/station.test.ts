import { describe, expect, it } from 'vitest';
import { createWebPlatform } from '$lib/platform/web';
import { configKey, DEFAULT_PUBLIC_CONFIG, StationStore } from './station.svelte';

const storage = () => {
	const data = new Map<string, string>();
	return {
		length: 0,
		clear: () => data.clear(),
		key: () => null,
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v),
		removeItem: (k: string) => void data.delete(k)
	} as Storage;
};

describe('StationStore', () => {
	it('starts with defaults and loads the platform config', async () => {
		const store = new StationStore();
		expect(store.config).toEqual(DEFAULT_PUBLIC_CONFIG);
		expect(store.loaded).toBe(false);
		await store.load(createWebPlatform(storage()));
		expect(store.loaded).toBe(true);
		expect(store.config.stationId).toHaveLength(36);
	});

	it('keeps defaults when loading fails', async () => {
		const store = new StationStore();
		await store.load({ getConfig: () => Promise.reject(new Error('down')) } as never);
		expect(store.loaded).toBe(true);
		expect(store.config.idleSeconds).toBe(90);
	});
});

describe('configKey', () => {
	it('changes only when settings change', () => {
		const a = { ...DEFAULT_PUBLIC_CONFIG };
		expect(configKey(a)).toBe(configKey({ ...a }));
		expect(configKey(a)).not.toBe(configKey({ ...a, idleSeconds: 30 }));
	});

	it('defaults to "no PIN yet" so a failed load still allows setup', () => {
		expect(DEFAULT_PUBLIC_CONFIG.hasPin).toBe(false);
	});
});
