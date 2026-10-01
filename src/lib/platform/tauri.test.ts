import { describe, expect, it, vi } from 'vitest';

const events = vi.hoisted(() => ({
	handler: null as ((e: { payload: unknown }) => void) | null,
	unlisten: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(async (name: string, handler: (e: { payload: unknown }) => void) => {
		if (name === 'remote-command') events.handler = handler;
		return events.unlisten;
	})
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
		if (cmd === 'platform_info') return { mobile: true, os: 'android' };
		if (cmd === 'send_command' && !(args?.targets as string[]).length)
			throw { code: 'noTargets', message: 'Keine Station ausgewählt.' };
		if (cmd === 'send_command') return [{ stationId: 'B', ok: true, args }];
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
		expect(p.features.master).toBe(true);
		await p.init();
		expect(p.features).toEqual({ certificate: false, email: true, overview: false, master: false });
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

	it('sends commands with pin, targets and command', async () => {
		const p = createTauriPlatform();
		const [result] = await p.sendCommand('2468', ['B'], { kind: 'message', text: 'Hallo' });
		expect(result).toMatchObject({
			stationId: 'B',
			ok: true,
			args: { pin: '2468', targets: ['B'], command: { kind: 'message', text: 'Hallo' } }
		});
	});

	it('reports an empty target list instead of sending to everyone', async () => {
		const p = createTauriPlatform();
		await expect(p.sendCommand('2468', [], { kind: 'reset' })).rejects.toMatchObject({
			code: 'noTargets'
		});
		await expect(p.sendCommand('2468', [], { kind: 'reset' })).rejects.toBeInstanceOf(
			PlatformError
		);
	});

	it('hands remote commands to the handler until unsubscribed', async () => {
		const p = createTauriPlatform();
		const got: unknown[] = [];
		const off = p.onRemoteCommand((cmd) => got.push(cmd));
		await vi.waitFor(() => expect(events.handler).not.toBeNull());
		events.handler?.({ payload: { kind: 'reset' } });
		expect(got).toEqual([{ kind: 'reset' }]);
		off();
		expect(events.unlisten).toHaveBeenCalledOnce();
	});
});
