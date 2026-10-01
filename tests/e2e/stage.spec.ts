import { expect, test } from '@playwright/test';
import { dragTo, openMission, palette, seedStation, toMap } from './helpers';

test('a delivered parcel stays on its drop spot', async ({ page }) => {
	await seedStation(page);
	await toMap(page);
	await openMission(page, 'Paketdienst');
	for (const label of ['Abheben', 'Vorwärts', 'Paket nehmen', 'Rechts drehen', 'Vorwärts'])
		await palette(page, label).click();
	await palette(page, 'Paket abgeben').click();
	await palette(page, 'Landen').click();
	const more = page.locator('[data-drop-panel] ol').getByRole('button', { name: 'Mehr' });
	for (let i = 0; i < 2; i++) await more.nth(0).click(); // forward(3)
	for (let i = 0; i < 3; i++) await more.nth(1).click(); // forward(4)
	await expect(page.locator('pre')).toContainText('forward(4)');
	const parcels = page.locator('svg[role="img"] .parcel-drop');
	await expect(parcels).toHaveCount(0);
	await page.getByRole('button', { name: 'Start' }).click();
	await page.getByText('Geschafft').waitFor({ timeout: 30_000 });
	await expect(parcels).toHaveCount(1);
	// A fresh start clears the map again.
	await page.getByRole('button', { name: 'Zurück', exact: true }).click();
	await expect(parcels).toHaveCount(0);
});

test('a running loop counts its rounds', async ({ page }) => {
	await seedStation(page);
	await toMap(page);
	await openMission(page, 'Runde drehen');
	await palette(page, 'Abheben').click();
	await dragTo(
		page,
		palette(page, 'Wiederhole'),
		page.locator('[data-drop-panel] ol[data-drop-slot]').first()
	);
	await dragTo(
		page,
		palette(page, 'Rechts drehen'),
		page.locator('ol[data-drop-slot="body"]:not([data-drop-parent=""])').first()
	);
	await palette(page, 'Landen').click();
	await page.getByRole('button', { name: 'Start' }).click();
	const list = page.locator('[data-drop-panel] ol').first();
	await expect(list.getByText('1/2')).toBeVisible({ timeout: 20_000 });
	await expect(list.getByText('2/2')).toBeVisible({ timeout: 20_000 });
});

test('the block where the drone crashed is marked', async ({ page }) => {
	await seedStation(page);
	await toMap(page);
	await openMission(page, 'Erster Flug');
	await palette(page, 'Abheben').click();
	await palette(page, 'Vorwärts').click();
	const more = page.locator('[data-drop-panel] ol').getByRole('button', { name: 'Mehr' });
	for (let i = 0; i < 8; i++) await more.first().click();
	await page.getByRole('button', { name: 'Start' }).click();
	await expect(page.locator('[data-drop-panel] .ring-destructive')).toHaveCount(1, {
		timeout: 30_000
	});
	await expect(
		page.locator('[data-drop-panel] li[data-block-id]').nth(1).locator('.ring-destructive')
	).toHaveCount(1);
});
