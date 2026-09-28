import { expect, test } from '@playwright/test';
import { dragTo, openMission, palette, seedStation, toMap } from './helpers';

test.beforeEach(async ({ page }) => {
	await seedStation(page);
	await toMap(page);
	await openMission(page, 'Runde drehen');
});

const python = (page: import('@playwright/test').Page) => page.locator('pre').innerText();
const loopBody = (page: import('@playwright/test').Page) =>
	page.locator('ol[data-drop-slot="body"]:not([data-drop-parent=""])').first();

test('blocks can be dragged into a loop', async ({ page }) => {
	await palette(page, 'Abheben').click();
	await dragTo(
		page,
		palette(page, 'Wiederhole'),
		page.locator('[data-drop-panel] ol[data-drop-slot]').first()
	);
	await dragTo(page, palette(page, 'Vorwärts'), loopBody(page));
	expect(await python(page)).toMatch(/for i in range\(2\):\n\d+ {4}forward\(1\)/);
});

test('dropping a block on the palette removes it', async ({ page }) => {
	await palette(page, 'Abheben').click();
	await palette(page, 'Landen').click();
	const last = page
		.locator('[data-drop-panel] ol[data-drop-slot]')
		.first()
		.locator(':scope > li[data-block-id]')
		.last();
	const box = (await last.boundingBox())!;
	await page.mouse.move(box.x + 30, box.y + 20);
	await page.mouse.down();
	await page.mouse.move(box.x + 60, box.y + 40, { steps: 4 });
	const target = (await page.locator('[data-drop-trash] h2').boundingBox())!;
	await page.mouse.move(target.x + 20, target.y + 10, { steps: 12 });
	await page.mouse.up();
	await page.waitForTimeout(500);
	expect(await python(page)).not.toContain('land()');
});
