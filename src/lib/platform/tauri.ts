import { invoke } from '@tauri-apps/api/core';
import { t } from '$lib/i18n/de';
import { PlatformError, type Platform, type RemoteCommand } from './types';

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
	try {
		return await invoke<T>(command, args);
	} catch (e) {
		const err = e as { code?: string; message?: string };
		throw new PlatformError(err?.code ?? 'other', err?.message ?? String(e));
	}
}

export function createTauriPlatform(): Platform {
	const features = { certificate: true, email: true, overview: true, master: true };
	return {
		kind: 'tauri',
		features,
		init: async () => {
			const info = await call<{ mobile: boolean; os: string }>('platform_info').catch(() => null);
			// Phones have no place to save the PDF yet, and serve no overview (desktop-only server).
			if (info?.mobile) {
				features.certificate = false;
				features.overview = false;
				features.master = false;
			}
		},
		appVersion: async () => (await import('@tauri-apps/api/app')).getVersion(),
		checkUpdate: async () => {
			const { check } = await import('@tauri-apps/plugin-updater');
			// No network or no published release must not read as "up to date".
			const update = await check().catch(() => {
				throw new PlatformError('updateUnreachable', t.admin.updateUnreachable);
			});
			return update?.version ?? null;
		},
		installUpdate: async () => {
			const { check } = await import('@tauri-apps/plugin-updater');
			const { relaunch } = await import('@tauri-apps/plugin-process');
			const update = await check();
			if (!update) return;
			await update.downloadAndInstall();
			await relaunch();
		},
		getConfig: () => call('get_config'),
		verifyPin: (pin) => call('verify_pin', { pin }),
		setPin: (oldPin, newPin) => call('set_pin', { oldPin, newPin }),
		saveConfig: (pin, config) => call('save_config', { pin, config }),
		setSmtpPassword: (pin, password) => call('set_smtp_password', { pin, password }),
		saveCertificate: (data) => call('save_certificate', { data }),
		sendCertificate: (email, consent, data) => call('send_certificate', { email, consent, data }),
		testMail: (pin, to) => call('test_mail', { pin, to }),
		emailCount: (pin) => call('email_count', { pin }),
		exportEmails: (pin) => call('export_emails', { pin }),
		deleteEmails: (pin) => call('delete_emails', { pin }),
		saveSession: (record) => call('save_session', { record }),
		listRecords: () => call('list_records'),
		peers: () => call('peers'),
		publishStatus: (status) => call('publish_status', { status }),
		lanUrls: () => call('lan_urls'),
		fleet: () => call('fleet'),
		sendCommand: (pin, targets, command) => call('send_command', { pin, targets, command }),
		onRemoteCommand: (handler) => {
			let unlisten: (() => void) | null = null;
			let stopped = false;
			void import('@tauri-apps/api/event')
				.then(({ listen }) =>
					listen<RemoteCommand>('remote-command', (event) => handler(event.payload))
				)
				.then((off) => {
					if (stopped) off();
					else unlisten = off;
				})
				.catch(() => {});
			return () => {
				stopped = true;
				unlisten?.();
			};
		},
		deleteHistory: (pin) => call('delete_history', { pin }),
		saveTextFile: (pin, fileName, contents) => call('save_text_file', { pin, fileName, contents })
	};
}
