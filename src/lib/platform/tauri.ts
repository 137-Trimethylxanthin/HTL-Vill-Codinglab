import { invoke } from '@tauri-apps/api/core';
import { PlatformError, type Platform } from './types';

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
	try {
		return await invoke<T>(command, args);
	} catch (e) {
		const err = e as { code?: string; message?: string };
		throw new PlatformError(err?.code ?? 'other', err?.message ?? String(e));
	}
}

export function createTauriPlatform(): Platform {
	return {
		kind: 'tauri',
		features: { certificate: true, email: true },
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
		deleteEmails: (pin) => call('delete_emails', { pin })
	};
}
