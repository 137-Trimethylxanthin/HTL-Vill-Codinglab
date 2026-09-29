import { expect, test, type Route } from '@playwright/test';
import { seedStation } from './helpers';

test('a splash with the drone shows while Python loads', async ({ page, context }) => {
	await seedStation(page);
	let release: () => void = () => {};
	const gate = new Promise<void>((resolve) => (release = resolve));
	await context.route('**/pyodide/**', async (route: Route) => {
		await gate;
		await route.continue();
	});
	await page.goto('/');
	const splash = page.getByRole('status');
	await expect(splash.getByRole('img', { name: 'Drohne' })).toBeVisible();
	await expect(splash.getByText('HTL Villach')).toBeVisible();
	await expect(splash.getByText('Drohne startet …')).toBeVisible();
	release();
	await expect(page.getByText('Tippe zum Starten')).toBeVisible({ timeout: 60_000 });
	await expect(splash).toHaveCount(0);
});
