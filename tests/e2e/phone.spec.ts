import { expect, test } from '@playwright/test';
import { openMission, seedStation, settle, toMap } from './helpers';

test.beforeEach(async ({ page }) => {
	await seedStation(page);
});

test('the name keyboard fits a phone', async ({ page }) => {
	await page.goto('/');
	await page.getByText('Tippe zum Starten').waitFor({ timeout: 60_000 });
	await settle(page);
	await page.mouse.click(195, 500);
	await page.getByRole('button', { name: 'Eigener Name' }).click();
	const offscreen = await page.evaluate(
		() =>
			[...document.querySelectorAll('button')].filter((b) => {
				const r = b.getBoundingClientRect();
				return r.width > 0 && (r.left < 0 || r.right > innerWidth);
			}).length
	);
	expect(offscreen).toBe(0);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the workspace fits a phone', async ({ page }) => {
	await toMap(page);
	await openMission(page, 'Erster Flug');
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	const stage = (await page.locator('svg[role="img"]').boundingBox())!;
	const palette = (await page.locator('[data-drop-trash]').boundingBox())!;
	expect(stage.y).toBeLessThan(palette.y);
});
