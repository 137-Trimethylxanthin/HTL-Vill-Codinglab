import { expect, test } from '@playwright/test';
import { openMission, PIN, seedStation, toMap } from './helpers';

test.beforeEach(async ({ page }) => {
	await seedStation(page);
	await toMap(page);
	await openMission(page, 'Erster Flug');
});

test('a kid can call for help and take it back', async ({ page }) => {
	const help = page.getByRole('button', { name: 'Hilfe', exact: true });
	await help.click();
	await expect(page.getByText('Hilfe kommt!')).toBeVisible();
	await page.waitForTimeout(500);
	await page.getByRole('button', { name: /Hilfe kommt!/ }).click();
	await expect(page.getByText('Hilfe kommt!')).toHaveCount(0);
});

test('a supervisor opens the quick menu and shows the solution', async ({ page }) => {
	const badge = page.locator('header span', { hasText: /^1\.1$/ });
	const box = (await badge.boundingBox())!;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.waitForTimeout(2300);
	await page.mouse.up();
	for (const digit of PIN) await page.getByRole('button', { name: digit, exact: true }).click();
	await page.getByRole('button', { name: 'OK' }).click();
	await page.getByRole('button', { name: /Lösung zeigen/ }).click();
	await expect(page.locator('pre')).toContainText('forward(4)');
	await expect(page.locator('pre')).toContainText('land()');
});
