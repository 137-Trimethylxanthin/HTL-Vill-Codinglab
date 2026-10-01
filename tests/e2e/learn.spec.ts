import { expect, test } from '@playwright/test';
import { openMission, palette, seedStation, toMap } from './helpers';

test.beforeEach(async ({ page }) => {
	await seedStation(page);
	await toMap(page);
});

test('a hand guides the first mission and steps back when the kid explores', async ({ page }) => {
	await openMission(page, 'Erster Flug');
	const hand = page.locator('.hand');
	await expect(hand).toHaveClass(/drag/, { timeout: 15_000 });
	await palette(page, 'Abheben').click();
	await palette(page, 'Vorwärts').click();
	await expect(hand).toHaveClass(/tap/, { timeout: 15_000 });
	await palette(page, 'Landen').click();
	await palette(page, 'Landen').click();
	await page.waitForTimeout(1500);
	await expect(hand).toHaveCount(0);
});

test('tapping a block shows what it does with a phantom drone', async ({ page }) => {
	await openMission(page, 'Erster Flug');
	await palette(page, 'Abheben').click();
	await palette(page, 'Vorwärts').click();
	const phantom = page.locator('svg[role="img"] polyline');
	await expect(phantom).toHaveCount(0);
	await page.locator('[data-drop-panel] li[data-block-id]').nth(1).getByText('Vorwärts').click();
	await expect(phantom).toHaveCount(1);
	await expect(phantom).toHaveCount(0, { timeout: 5000 });
});

test('new blocks wear a badge and hints point at a block', async ({ page }) => {
	await openMission(page, 'Um die Ecke');
	await expect(palette(page, 'Rechts drehen').getByText('Neu!')).toBeVisible();
	await expect(palette(page, 'Abheben').getByText('Neu!')).toHaveCount(0);
	await palette(page, 'Rechts drehen').click();
	await expect(palette(page, 'Rechts drehen').getByText('Neu!')).toHaveCount(0);
	await page.getByRole('button', { name: 'Hilf mir' }).click();
	await expect(palette(page, 'Rechts drehen')).toHaveClass(/wiggle/);
});
