import { describe, expect, it } from 'vitest';
import type { SessionRecord } from '$lib/history/types';
import type { EditableConfig } from './types';
import { PlatformError } from './types';
import { createWebPlatform } from './web';

class MemoryStorage {
	private data = new Map<string, string>();
	get length() {
		return this.data.size;
	}
	clear() {
		this.data.clear();
	}
	getItem(key: string) {
		return this.data.get(key) ?? null;
	}
	key(i: number) {
		return [...this.data.keys()][i] ?? null;
	}
	removeItem(key: string) {
		this.data.delete(key);
	}
	setItem(key: string, value: string) {
		this.data.set(key, value);
	}
}

const code = async (p: Promise<unknown>) => {
	try {
		await p;
		return 'ok';
	} catch (e) {
		return e instanceof PlatformError ? e.code : String(e);
	}
};

describe('web platform', () => {
	it('reports a version and never offers updates', async () => {
		const p = createWebPlatform(new MemoryStorage());
		expect(await p.appVersion()).toMatch(/^\d+\.\d+\.\d+/);
		expect(await p.checkUpdate()).toBeNull();
	});

	it('has a no-op init', async () => {
		const p = createWebPlatform(new MemoryStorage());
		await p.init();
		expect(p.features).toEqual({ certificate: false, email: false, overview: false });
	});

	it('stores the fullscreen choice', async () => {
		const storage = new MemoryStorage();
		const p = createWebPlatform(storage);
		await p.setPin(null, '2468');
		const cfg = await p.getConfig();
		expect(cfg.fullscreen).toBe(true);
		const saved = await p.saveConfig('2468', { ...cfg, fullscreen: false });
		expect(saved.fullscreen).toBe(false);
	});

	it('starts with defaults and no PIN', async () => {
		const p = createWebPlatform(new MemoryStorage());
		const cfg = await p.getConfig();
		expect(cfg.hasPin).toBe(false);
		expect(cfg.idleSeconds).toBe(90);
		expect(cfg.stationId).toHaveLength(36);
		expect(p.features).toEqual({ certificate: false, email: false, overview: false });
	});

	it('sets and checks the PIN', async () => {
		const storage = new MemoryStorage();
		const p = createWebPlatform(storage);
		expect(await code(p.setPin(null, '12'))).toBe('badPin');
		await p.setPin(null, '2468');
		expect(await p.verifyPin('2468')).toBe(true);
		expect(await p.verifyPin('0000')).toBe(false);
		expect(await code(p.setPin('0000', '1357'))).toBe('wrongPin');
		await p.setPin('2468', '1357');
		expect(await createWebPlatform(storage).verifyPin('1357')).toBe(true);
	});

	it('saves config only with the right PIN', async () => {
		const storage = new MemoryStorage();
		const p = createWebPlatform(storage);
		const cfg = await p.getConfig();
		const edited: EditableConfig = { ...cfg, idleSeconds: 5, stationName: '  Halle A ' };
		expect(await code(p.saveConfig('2468', edited))).toBe('pinRequired');
		await p.setPin(null, '2468');
		expect(await code(p.saveConfig('0000', edited))).toBe('wrongPin');
		const saved = await p.saveConfig('2468', edited);
		expect(saved.idleSeconds).toBe(30);
		expect(saved.stationName).toBe('Halle A');
		expect((await createWebPlatform(storage).getConfig()).stationName).toBe('Halle A');
	});

	it('does not offer certificate or email', async () => {
		const p = createWebPlatform(new MemoryStorage());
		expect(await code(p.sendCertificate('a@b.at', false, {} as never))).toBe('unsupported');
		expect(await code(p.saveCertificate({} as never))).toBe('unsupported');
	});
	it('has retention and manual peers in its config', async () => {
		const p = createWebPlatform(new MemoryStorage());
		const cfg = await p.getConfig();
		expect(cfg.nameRetentionDays).toBe(7);
		expect(cfg.manualPeers).toEqual([]);
	});
	it('stores session records locally', async () => {
		const storage = new MemoryStorage();
		const p = createWebPlatform(storage);
		const record: SessionRecord = {
			id: 'r1',
			v: 1,
			event: '',
			station: 's',
			mode: 'showcase',
			startedAt: '2026-10-10T10:00:00.000Z',
			finishedAt: '2026-10-10T10:10:00.000Z',
			pilotName: 'Lea',
			totalStars: 3,
			missions: [],
			endedBy: 'finale'
		};
		await p.saveSession(record);
		await p.saveSession(record);
		expect(await createWebPlatform(storage).listRecords()).toHaveLength(1);
		expect(await p.peers()).toEqual([]);
		await p.setPin(null, '2468');
		expect(await p.deleteHistory('2468')).toBe(1);
		expect(await p.listRecords()).toHaveLength(0);
	});

	it('has no supervisor overview, but accepts status quietly', async () => {
		const p = createWebPlatform(new MemoryStorage());
		await expect(
			p.publishStatus({
				screen: 'map',
				missionId: null,
				missionTitle: null,
				since: null,
				lastActivity: 0,
				runs: 0,
				help: false,
				solved: 0
			})
		).resolves.toBeUndefined();
		expect(await p.lanUrls()).toEqual([]);
	});
});
