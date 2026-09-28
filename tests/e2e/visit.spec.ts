import { expect, test } from '@playwright/test';
import { openMission, seedStation, settle, solveFirstFlight, toMap } from './helpers';

test.beforeEach(async ({ page }) => {
	await seedStation(page);
});

test('a visitor plays to the finale and sees the leaderboard', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await toMap(page);
	await openMission(page, 'Erster Flug');
	await solveFirstFlight(page);
	await page.getByRole('button', { name: 'Weiter' }).click();
	await expect(page.getByText('Perfekt!')).toBeVisible();
	await settle(page);
	await page.getByRole('button', { name: 'Zur Karte' }).click();
	await settle(page);
	await page.getByRole('button', { name: 'Fertig' }).click();
	await expect(page.getByText(/Super,/)).toBeVisible();
	await expect(page.getByText('3 / 21')).toBeVisible();
	await page.getByRole('button', { name: 'Bestenliste' }).click();
	await expect(page.locator('ol li.bg-drone')).toHaveCount(1);
	expect(errors).toEqual([]);
});

test('an idle visitor is reset after the countdown', async ({ page }) => {
	await page.clock.install();
	await toMap(page);
	await page.clock.runFor(90_500);
	await expect(page.getByText('Bist du noch da?')).toBeVisible();
	await page.clock.runFor(10_500);
	await expect(page.getByText('Tippe zum Starten')).toBeVisible();
});

test('a double tap does not skip the map', async ({ page }) => {
	await page.goto('/');
	await page.getByText('Tippe zum Starten').waitFor({ timeout: 60_000 });
	await settle(page);
	await page.mouse.click(640, 400);
	const go = page.getByRole('button', { name: "Los geht's!" });
	await go.waitFor();
	await settle(page);
	await go.dblclick();
	await expect(page.getByText('Level 1')).toBeVisible();
});
