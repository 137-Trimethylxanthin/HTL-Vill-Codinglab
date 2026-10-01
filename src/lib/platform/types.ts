import type { PeerInfo, SessionRecord } from '$lib/history/types';
import type { StationStatus } from '$lib/session/status';

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
	/** Sound effects; missing in settings saved by older versions (treat as on). */
	sound?: boolean;
	/** null = all missions */
	enabledMissions: string[] | null;
	qrUrl: string;
	/** Where the static web build is hosted (…/flug); empty = no take-home replay QR. */
	replayUrl: string;
	/** Wall display: only shows the day's flights, no visitor input. */
	wallMode: boolean;
	/** Master station: sees the fleet and sends commands (desktop app only; missing in older settings). */
	master?: boolean;
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

/** One row of the master's fleet view (src-tauri/src/sync.rs FleetRow). */
export interface FleetRow extends StationStatus {
	stationId: string;
	stationName: string;
	/** Time since the station's frontend last reported. */
	ageMs: number;
	/** Time on the current mission. */
	missionMs: number | null;
	/** Time since the current visitor started, measured by the station itself (use this, not visitSince). */
	visitMs?: number | null;
	idleMs: number;
	offline: boolean;
	stuck: boolean;
	stuckReason: 'fails' | 'long' | 'idle' | null;
	/** Base URL of the peer (http://ip:port); empty for this station. */
	address: string;
	/** The station's own clock when it built the row (ms epoch; 0 = unknown). Skew ≈ row.now − Date.now(). */
	now?: number;
}

/** What the master can ask a station to do (src-tauri/src/remote.rs). Texts: at most 200 characters. */
export type RemoteCommand =
	| { kind: 'reset' }
	| { kind: 'pause'; on: boolean; text?: string }
	| { kind: 'message'; text: string }
	| { kind: 'endHelp' }
	| { kind: 'showSolution' }
	| {
			kind: 'settings';
			/** Missing fields stay unchanged; enabledMissions null = all. idleSeconds is clamped to 30–600. */
			settings: {
				idleSeconds?: number;
				sound?: boolean;
				enabledMissions?: string[] | null;
				wallMode?: boolean;
			};
	  };

/** How sending a command to one station went. */
export interface SendResult {
	stationId: string;
	ok: boolean;
	error?: string;
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
	/** overview: the station serves the supervisor overview; master: it can steer the fleet (desktop app only). */
	features: { certificate: boolean; email: boolean; overview: boolean; master: boolean };
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
	/** Tell the supervisor overview what this station shows. */
	publishStatus(status: StationStatus): Promise<void>;
	/** Base URLs (http://ip:port) where phones in the same network reach this station. */
	lanUrls(): Promise<string[]>;
	/** This station and every peer of its event, for the master view. */
	fleet(): Promise<FleetRow[]>;
	/**
	 * Master only (admin PIN, master on, event code set): sends a command to the given station ids.
	 * At least one id (empty rejects with code 'noTargets'); this station only if its own id is listed.
	 * One result per target; a station whose clock is off by more than 30 s answers "Uhrzeit weicht ab".
	 */
	sendCommand(pin: string, targets: string[], command: RemoteCommand): Promise<SendResult[]>;
	/** Commands from a master (also from this station itself). Returns the unsubscribe function. */
	onRemoteCommand(handler: (command: RemoteCommand) => void): () => void;
	deleteHistory(pin: string): Promise<number>;
	saveTextFile(pin: string, fileName: string, contents: string): Promise<string | null>;
}

export const editableOf = (c: PublicConfig): EditableConfig => ({
	stationName: c.stationName,
	eventCode: c.eventCode,
	syncEnabled: c.syncEnabled,
	idleSeconds: c.idleSeconds,
	fullscreen: c.fullscreen,
	sound: c.sound !== false,
	enabledMissions: c.enabledMissions,
	qrUrl: c.qrUrl,
	replayUrl: c.replayUrl ?? '',
	wallMode: c.wallMode === true,
	master: c.master === true,
	nameRetentionDays: c.nameRetentionDays,
	manualPeers: [...c.manualPeers],
	smtp: { ...c.smtp }
});
