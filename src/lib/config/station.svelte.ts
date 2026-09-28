import { HTL_URL } from '$lib/config/defaults';
import type { Platform, PublicConfig } from '$lib/platform/types';

export const DEFAULT_PUBLIC_CONFIG: PublicConfig = {
	stationId: '',
	stationName: 'Station',
	eventCode: '',
	syncEnabled: false,
	idleSeconds: 90,
	enabledMissions: null,
	qrUrl: HTL_URL,
	nameRetentionDays: 7,
	manualPeers: [],
	smtp: { host: '', port: 587, username: '', from: '', starttls: true },
	hasPin: true,
	smtpReady: false
};

/** The station's public settings, shared by all screens. */
export class StationStore {
	config = $state<PublicConfig>(DEFAULT_PUBLIC_CONFIG);
	loaded = $state(false);

	async load(platform: Pick<Platform, 'getConfig'>) {
		try {
			this.config = await platform.getConfig();
		} catch {
			// keep defaults; the kiosk must still start
		}
		this.loaded = true;
	}

	set(config: PublicConfig) {
		this.config = config;
	}
}
