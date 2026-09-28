import { expect, test } from '@playwright/test';
import { PIN, settle, toMap } from './helpers';

async function enterPin(page: import('@playwright/test').Page, pin: string) {
	for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
	await page.getByRole('button', { name: 'OK', exact: true }).click();
}

test('first start forces a PIN, then settings take effect', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('Admin-PIN festlegen')).toBeVisible({ timeout: 60_000 });
	await enterPin(page, PIN);
	await expect(page.getByText('PIN wiederholen')).toBeVisible();
	await enterPin(page, PIN);
	await expect(page.getByRole('button', { name: 'Speichern' }).first()).toBeVisible();
	for (const title of ['3.1 · Nebel', '3.2 · Rettungsflug'])
		await page.locator('label', { hasText: title }).locator('input').uncheck();
	await page.getByRole('banner').getByRole('button', { name: 'Speichern' }).click();
	await expect(page.getByText('Gespeichert.')).toBeVisible();
	await page.getByRole('button', { name: 'Schließen' }).click();
	await settle(page);
	await toMap(page);
	await expect(page.locator('main section button')).toHaveCount(5);
});

test('a wrong PIN is refused', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('Admin-PIN festlegen')).toBeVisible({ timeout: 60_000 });
	await enterPin(page, PIN);
	await enterPin(page, PIN);
	await page.getByRole('button', { name: 'Schließen' }).click();
	await page.keyboard.press('Control+Shift+A');
	await enterPin(page, '0000');
	await expect(page.getByText('Die PIN stimmt nicht.')).toBeVisible();
});
