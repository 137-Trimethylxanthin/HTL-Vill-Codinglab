import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string) => {
		if (cmd === 'platform_info') return { mobile: true, os: 'android' };
		throw { code: 'wrongPin', message: 'Die PIN stimmt nicht.' };
	})
}));

vi.mock('@tauri-apps/plugin-updater', () => ({
	check: vi.fn(async () => {
		throw new Error('error sending request for url (https://github.com/…/latest.json)');
	})
}));

import { PlatformError } from './types';
import { createTauriPlatform } from './tauri';

describe('tauri platform', () => {
	it('turns off the certificate on phones after init', async () => {
		const p = createTauriPlatform();
		expect(p.features.certificate).toBe(true);
		await p.init();
		expect(p.features).toEqual({ certificate: false, email: true });
	});

	it('maps backend errors to PlatformError', async () => {
		const p = createTauriPlatform();
		await expect(p.verifyPin('0000')).rejects.toMatchObject({ code: 'wrongPin' });
		await expect(p.verifyPin('0000')).rejects.toBeInstanceOf(PlatformError);
	});

	it('reports an unreachable update server instead of "up to date"', async () => {
		const p = createTauriPlatform();
		await expect(p.checkUpdate()).rejects.toMatchObject({
			code: 'updateUnreachable',
			message: 'Update-Server nicht erreichbar. Internet prüfen.'
		});
	});
});
