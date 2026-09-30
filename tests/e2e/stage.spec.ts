import { expect, test } from '@playwright/test';
import { openMission, palette, seedStation, toMap } from './helpers';

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
