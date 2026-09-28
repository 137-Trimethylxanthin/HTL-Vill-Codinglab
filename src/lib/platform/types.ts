import type { PeerInfo, SessionRecord } from '$lib/history/types';

export interface SmtpSettings {
	host: string;
	port: number;
	username: string;
	from: string;
	starttls: boolean;
}

export interface EditableConfig {
	stationName: string;
	eventCode: string;
	syncEnabled: boolean;
	idleSeconds: number;
	fullscreen: boolean;
	/** null = all missions */
	enabledMissions: string[] | null;
	qrUrl: string;
	nameRetentionDays: number;
	manualPeers: string[];
	smtp: SmtpSettings;
}

export interface PublicConfig extends EditableConfig {
	stationId: string;
	hasPin: boolean;
	smtpReady: boolean;
}

export interface CertificateData {
	pilotName: string;
	totalStars: number;
	maxStars: number;
	missions: { id: string; title: string; stars: number }[];
	date: string;
	qrUrl: string;
	map: { rows: string[]; path: string[] } | null;
}

export class PlatformError extends Error {
	constructor(
		readonly code: string,
		message: string
	) {
		super(message);
	}
}

/** Everything the frontend needs from the device. The only place that knows about Tauri. */
export interface Platform {
	kind: 'tauri' | 'web';
	features: { certificate: boolean; email: boolean };
	/** Ask the backend what this device can do; call once before use. */
	init(): Promise<void>;
	appVersion(): Promise<string>;
	/** The newer version on offer, or null. */
	checkUpdate(): Promise<string | null>;
	/** Download, install and restart. */
	installUpdate(): Promise<void>;
	getConfig(): Promise<PublicConfig>;
	verifyPin(pin: string): Promise<boolean>;
	setPin(oldPin: string | null, newPin: string): Promise<void>;
	saveConfig(pin: string, config: EditableConfig): Promise<PublicConfig>;
	setSmtpPassword(pin: string, password: string): Promise<void>;
	saveCertificate(data: CertificateData): Promise<string | null>;
	sendCertificate(email: string, consent: boolean, data: CertificateData): Promise<void>;
	testMail(pin: string, to: string): Promise<void>;
	emailCount(pin: string): Promise<number>;
	exportEmails(pin: string): Promise<string | null>;
	deleteEmails(pin: string): Promise<number>;
	saveSession(record: SessionRecord): Promise<void>;
	listRecords(): Promise<SessionRecord[]>;
	peers(): Promise<PeerInfo[]>;
	deleteHistory(pin: string): Promise<number>;
	saveTextFile(pin: string, fileName: string, contents: string): Promise<string | null>;
}

export const editableOf = (c: PublicConfig): EditableConfig => ({
	stationName: c.stationName,
	eventCode: c.eventCode,
	syncEnabled: c.syncEnabled,
	idleSeconds: c.idleSeconds,
	fullscreen: c.fullscreen,
	enabledMissions: c.enabledMissions,
	qrUrl: c.qrUrl,
	nameRetentionDays: c.nameRetentionDays,
	manualPeers: [...c.manualPeers],
	smtp: { ...c.smtp }
});
