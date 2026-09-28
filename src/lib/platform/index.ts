import { createTauriPlatform } from './tauri';
import type { Platform } from './types';
import { createWebPlatform } from './web';

export * from './types';

let platform: Platform | null = null;

export function getPlatform(): Platform {
	platform ??=
		typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
			? createTauriPlatform()
			: createWebPlatform(window.localStorage);
	return platform;
}
