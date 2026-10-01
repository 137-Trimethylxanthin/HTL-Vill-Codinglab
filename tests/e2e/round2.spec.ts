import { expect, test, type Page } from '@playwright/test';
import { openMission, palette, seedStation, settle, toMap } from './helpers';

const more = (page: Page) =>
	page.locator('[data-drop-panel] ol').getByRole('button', { name: 'Mehr' }).first();

async function firstFlight(page: Page, steps: number) {
	await palette(page, 'Abheben').click();
	await palette(page, 'Vorwärts').click();
	for (let i = 1; i < steps; i++) await more(page).click();
	await palette(page, 'Landen').click();
}

test.describe('in a mission', () => {
	test.beforeEach(async ({ page }) => {
		await seedStation(page);
		await toMap(page);
	});

	test('the drone says which block made it crash', async ({ page }) => {
		await openMission(page, 'Erster Flug');
		await firstFlight(page, 9);
		await page.getByRole('button', { name: 'Start' }).click();
		await expect(page.getByText(/Das war Block 2: „Vorwärts 9“/)).toBeVisible({ timeout: 30_000 });
	});

	test('step by step lights up each line until the drone lands', async ({ page }) => {
		await openMission(page, 'Erster Flug');
		await expect(page.getByText('Für Erwachsene:')).toBeVisible();
		await firstFlight(page, 4);
		await page.getByRole('button', { name: 'Schritt für Schritt' }).click();
		const next = page.getByRole('button', { name: 'Nächster Schritt' });
		await expect(next).toBeEnabled({ timeout: 20_000 });
		await expect(page.locator('pre .bg-drone\\/40')).toContainText('takeoff()');
		for (let i = 0; i < 5; i++) {
			await expect(next).toBeEnabled();
			await next.click();
		}
		await expect(page.getByText('Geschafft')).toBeVisible({ timeout: 10_000 });
	});

	test('a predict mission asks where the drone lands first', async ({ page }) => {
		await openMission(page, 'Um die Ecke');
		await palette(page, 'Abheben').click();
		await palette(page, 'Landen').click();
		await page.getByRole('button', { name: 'Start' }).click();
		await expect(page.getByText('Wo landet die Drohne?')).toBeVisible();
		// The drone lands where it took off: guess the start cell (0,4).
		await page.getByRole('button', { name: '0,4', exact: true }).dispatchEvent('pointerdown');
		await expect(page.getByText(/Richtig vorhergesagt/)).toBeVisible({ timeout: 30_000 });
	});
});

test('two kids take turns', async ({ page }) => {
	await seedStation(page);
	await page.goto('/');
	await page.getByText('Tippe zum Starten').waitFor({ timeout: 60_000 });
	await settle(page);
	await page.mouse.click(640, 400);
	await page.getByRole('button', { name: /Zu zweit spielen/ }).click();
	await page.getByRole('button', { name: "Los geht's!" }).click();
	await page.getByText('Level 1').waitFor();
	await settle(page);
	await openMission(page, 'Erster Flug');
	await expect(page.getByText('Los geht’s zu zweit!')).toBeVisible();
	await expect(page.getByText('Spieler 1 tippt').first()).toBeVisible();
});

test('step-by-step buttons fit the smallest window', async ({ page }) => {
	await page.setViewportSize({ width: 1024, height: 700 });
	await seedStation(page);
	await toMap(page);
	await openMission(page, 'Erster Flug');
	await palette(page, 'Abheben').click();
	await page.getByRole('button', { name: 'Schritt für Schritt' }).click();
	await expect(page.getByRole('button', { name: 'Nächster Schritt' })).toBeVisible({
		timeout: 20_000
	});
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
