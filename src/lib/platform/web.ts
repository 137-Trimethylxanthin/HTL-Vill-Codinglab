import { HTL_URL } from '$lib/config/defaults';
import type { SessionRecord } from '$lib/history/types';
import { PlatformError, type EditableConfig, type Platform, type PublicConfig } from './types';

const KEY = 'codinglab.station';
const HISTORY_KEY = 'codinglab.history';

interface Stored {
	stationId: string;
	config: EditableConfig;
	pinSalt: string | null;
	pinHash: string | null;
}

const defaults = (): Stored => {
	const stationId = crypto.randomUUID();
	return {
		stationId,
		config: {
			stationName: `Station ${stationId.slice(0, 4).toUpperCase()}`,
			eventCode: '',
			syncEnabled: false,
			idleSeconds: 90,
			fullscreen: true,
			enabledMissions: null,
			qrUrl: HTL_URL,
			nameRetentionDays: 7,
			manualPeers: [],
			smtp: { host: '', port: 587, username: '', from: '', starttls: true }
		},
		pinSalt: null,
		pinHash: null
	};
};

async function sha256(text: string): Promise<string> {
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
	return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const validPin = (pin: string) => /^\d{4,8}$/.test(pin);
const unsupported = () =>
	Promise.reject(new PlatformError('unsupported', 'Im Browser nicht verfügbar.'));

/** Browser build: settings in localStorage, no certificate and no email (no backend). */
export function createWebPlatform(storage: Storage): Platform {
	const read = (): Stored => {
		try {
			const raw = storage.getItem(KEY);
			if (raw) {
				const d = defaults();
				const stored = JSON.parse(raw);
				return { ...d, ...stored, config: { ...d.config, ...stored.config } };
			}
		} catch {
			// broken storage: start fresh
		}
		const fresh = defaults();
		storage.setItem(KEY, JSON.stringify(fresh));
		return fresh;
	};
	const write = (s: Stored) => storage.setItem(KEY, JSON.stringify(s));
	const readHistory = (): SessionRecord[] => {
		try {
			return JSON.parse(storage.getItem(HISTORY_KEY) ?? '[]');
		} catch {
			return [];
		}
	};

	const publicOf = (s: Stored): PublicConfig => ({
		...s.config,
		stationId: s.stationId,
		hasPin: s.pinHash !== null,
		smtpReady: false
	});
	const check = async (s: Stored, pin: string) => {
		if (!s.pinHash || !s.pinSalt)
			throw new PlatformError('pinRequired', 'Bitte zuerst die Admin-PIN eingeben.');
		if ((await sha256(s.pinSalt + pin)) !== s.pinHash)
			throw new PlatformError('wrongPin', 'Die PIN stimmt nicht.');
	};

	return {
		kind: 'web',
		features: { certificate: false, email: false },
		init: async () => {},
		appVersion: async () => __APP_VERSION__,
		checkUpdate: async () => null,
		installUpdate: unsupported,
		getConfig: async () => publicOf(read()),
		verifyPin: async (pin) => {
			const s = read();
			return (
				s.pinHash !== null && s.pinSalt !== null && (await sha256(s.pinSalt + pin)) === s.pinHash
			);
		},
		setPin: async (oldPin, newPin) => {
			const s = read();
			if (s.pinHash) await check(s, oldPin ?? '');
			if (!validPin(newPin)) throw new PlatformError('badPin', 'Die PIN braucht 4 bis 8 Ziffern.');
			s.pinSalt = crypto.randomUUID();
			s.pinHash = await sha256(s.pinSalt + newPin);
			write(s);
		},
		saveConfig: async (pin, config) => {
			const s = read();
			await check(s, pin);
			s.config = {
				...config,
				stationName: config.stationName.trim(),
				eventCode: config.eventCode.trim(),
				qrUrl: config.qrUrl.trim(),
				idleSeconds: Math.min(600, Math.max(30, Math.round(config.idleSeconds))),
				enabledMissions: config.enabledMissions?.length ? config.enabledMissions : null,
				nameRetentionDays: Math.min(365, Math.max(1, Math.round(config.nameRetentionDays))),
				manualPeers: config.manualPeers
					.map((p) => p.trim())
					.filter(Boolean)
					.slice(0, 10)
			};
			write(s);
			return publicOf(s);
		},
		setSmtpPassword: unsupported,
		saveCertificate: unsupported,
		sendCertificate: unsupported,
		testMail: unsupported,
		emailCount: async (pin) => {
			await check(read(), pin);
			return 0;
		},
		exportEmails: unsupported,
		deleteEmails: async (pin) => {
			await check(read(), pin);
			return 0;
		},
		saveSession: async (record) => {
			const list = readHistory();
			if (!list.some((r) => r.id === record.id)) {
				list.push(record);
				storage.setItem(HISTORY_KEY, JSON.stringify(list));
			}
		},
		listRecords: async () => readHistory(),
		peers: async () => [],
		deleteHistory: async (pin) => {
			await check(read(), pin);
			const n = readHistory().length;
			storage.removeItem(HISTORY_KEY);
			return n;
		},
		saveTextFile: async (pin, fileName, contents) => {
			await check(read(), pin);
			if (typeof document === 'undefined') return null;
			const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }));
			const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
			a.click();
			URL.revokeObjectURL(url);
			return fileName;
		}
	};
}
