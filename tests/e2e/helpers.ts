import { createHash } from 'node:crypto';
import type { Locator, Page } from '@playwright/test';

export const PIN = '2468';

/** PIN 2468 pre-set in the web platform's storage (skips the forced first-start setup). */
export async function seedStation(page: Page, overrides: Record<string, unknown> = {}) {
	const salt = 'seed-salt';
	const pinHash = createHash('sha256')
		.update(salt + PIN)
		.digest('hex');
	const stored = {
		stationId: '00000000-0000-4000-8000-000000000000',
		config: {
			stationName: 'Station TEST',
			eventCode: '',
			syncEnabled: false,
			idleSeconds: 90,
			fullscreen: true,
			sound: true,
			enabledMissions: null,
			qrUrl: 'https://www.htl-villach.at',
			nameRetentionDays: 7,
			manualPeers: [],
			smtp: { host: '', port: 587, username: '', from: '', starttls: true },
			...overrides
		},
		pinSalt: salt,
		pinHash
	};
	await page.addInitScript((value) => {
		if (!localStorage.getItem('codinglab.station'))
			localStorage.setItem('codinglab.station', value);
	}, JSON.stringify(stored));
}

/** Screens ignore taps for 350 ms after they appear (double-tap guard). */
export const settle = (page: Page) => page.waitForTimeout(400);

export async function toMap(page: Page) {
	await page.goto('/');
	await page.getByText('Tippe zum Starten').waitFor({ timeout: 60_000 });
	await settle(page);
	await page.mouse.click(page.viewportSize()!.width / 2, page.viewportSize()!.height / 2);
	await page.getByRole('button', { name: "Los geht's!" }).waitFor();
	await settle(page);
	await page.getByRole('button', { name: "Los geht's!" }).click();
	await page.getByText('Level 1').waitFor();
	await settle(page);
}

export async function openMission(page: Page, title: string) {
	await page.locator('main section button', { hasText: title }).click();
	await page.locator('[data-drop-trash]').waitFor();
	await settle(page);
}

export const palette = (page: Page, label: string) =>
	page.locator('[data-drop-trash] button', { hasText: label });

async function center(loc: Locator) {
	const r = (await loc.boundingBox())!;
	return [r.x + r.width / 2, r.y + r.height / 2] as const;
}

/** Drag like a person: move, then keep aiming at the target while the layout settles. */
export async function dragTo(page: Page, from: Locator, to: Locator) {
	const [ax, ay] = await center(from);
	await page.mouse.move(ax, ay);
	await page.mouse.down();
	await page.mouse.move(ax + 20, ay + 10, { steps: 4 });
	for (let k = 0; k < 4; k++) {
		const [bx, by] = await center(to);
		await page.mouse.move(bx, by, { steps: k === 0 ? 14 : 4 });
		await page.waitForTimeout(250);
	}
	await page.mouse.up();
	await page.waitForTimeout(500);
}

export async function solveFirstFlight(page: Page) {
	await palette(page, 'Abheben').click();
	await palette(page, 'Vorwärts').click();
	await palette(page, 'Landen').click();
	const more = page.locator('[data-drop-panel] ol').getByRole('button', { name: 'Mehr' }).first();
	for (let i = 0; i < 3; i++) await more.click();
	await page.getByRole('button', { name: 'Start' }).click();
	await page.getByText('Geschafft').waitFor({ timeout: 30_000 });
}

/** A one-finger touch drag (Playwright's touchscreen only taps). Needs `hasTouch`. */
export async function touchDrag(
	page: Page,
	from: readonly [number, number],
	to: readonly [number, number],
	hold = 200
) {
	const cdp = await page.context().newCDPSession(page);
	const at = (x: number, y: number) => [{ x, y, id: 1 }];
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(...from) });
	for (let i = 1; i <= 15; i++) {
		const x = from[0] + ((to[0] - from[0]) * i) / 15;
		const y = from[1] + ((to[1] - from[1]) * i) / 15;
		await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(x, y) });
		await page.waitForTimeout(16);
	}
	await page.waitForTimeout(hold);
	await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	await cdp.detach();
}
