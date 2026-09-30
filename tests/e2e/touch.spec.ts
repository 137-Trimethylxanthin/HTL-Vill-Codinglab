import { expect, test, type Page } from '@playwright/test';
import { openMission, palette, seedStation, toMap, touchDrag } from './helpers';

test.use({ hasTouch: true });

test.beforeEach(async ({ page }) => {
	await seedStation(page);
	await toMap(page);
});

const paletteBox = (page: Page) => page.locator('[data-drop-trash]');

test('a long palette scrolls with a finger and blocks still drag out of it', async ({ page }) => {
	await openMission(page, 'Rettungsflug');
	const box = paletteBox(page);
	const overflow = await box.evaluate((el) => el.scrollHeight - el.clientHeight);
	// 3.2 has ten blocks: more than fit at 1280×800.
	expect(overflow).toBeGreaterThan(0);
	const first = (await palette(page, 'Abheben').boundingBox())!;
	const x = first.x + first.width / 2;
	await touchDrag(page, [x, first.y + first.height], [x, first.y + first.height - 150], 50);
	await expect.poll(() => box.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

	// A sideways drag towards the program still takes a block.
	const block = (await palette(page, 'Vorwärts').boundingBox())!;
	const list = (await page.locator('[data-drop-panel] [data-drop-scroll]').boundingBox())!;
	const from = [block.x + 30, block.y + block.height / 2] as const;
	await touchDrag(page, from, [list.x + list.width / 2, list.y + 40]);
	await page.waitForTimeout(500);
	await expect(page.locator('pre')).toContainText('forward(');
});

test('the block that is running scrolls into view', async ({ page }) => {
	await openMission(page, 'Erster Flug');
	await palette(page, 'Abheben').click();
	for (let i = 0; i < 12; i++) await palette(page, 'Vorwärts').click();
	await palette(page, 'Landen').click();
	const scroller = page.locator('[data-drop-scroll]');
	await scroller.evaluate((el) => (el.scrollTop = 0));
	const overflow = await scroller.evaluate((el) => el.scrollHeight - el.clientHeight);
	expect(overflow).toBeGreaterThan(0);
	await page.getByRole('button', { name: 'Start' }).click();
	// Once the drone reaches the later blocks, the list has followed it down.
	await expect
		.poll(() => scroller.evaluate((el) => el.scrollTop), { timeout: 20_000 })
		.toBeGreaterThan(0);
});
