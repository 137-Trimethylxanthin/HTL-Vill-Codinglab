import { expect, test, type Page } from '@playwright/test';
import { dragTo, openMission, palette, seedStation, toMap, touchDrag } from './helpers';

test.beforeEach(async ({ page }) => {
	await seedStation(page);
	await toMap(page);
	await openMission(page, 'Runde drehen');
});

const python = (page: Page) => page.locator('pre').innerText();
const loopBody = (page: Page) =>
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

const topLevel = (page: Page) =>
	page.locator('[data-drop-panel] ol[data-drop-slot]').first().locator(':scope > li');

async function middle(page: Page, i: number) {
	const b = (await topLevel(page).nth(i).boundingBox())!;
	return [b.x + 40, b.y + b.height / 2] as const;
}

/** Mouse drag of a program block that rests on the target before letting go. */
async function moveBlock(page: Page, i: number, toY: number) {
	const [x, y] = await middle(page, i);
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + 5, y + 12, { steps: 3 });
	await page.mouse.move(x, toY, { steps: 12 });
	await page.waitForTimeout(400);
	await page.mouse.up();
}

async function threeBlocks(page: Page) {
	await palette(page, 'Abheben').click();
	await palette(page, 'Vorwärts').click();
	await palette(page, 'Landen').click();
	await page.waitForTimeout(600);
}

test('a block lands without the list jumping', async ({ page }) => {
	await threeBlocks(page);
	const [, y0] = await middle(page, 0);
	await moveBlock(page, 2, y0 - 25);
	// Every row is already where it belongs in the first frame after the drop.
	const offsets = await page.evaluate(
		() =>
			new Promise<number[]>((resolve) =>
				requestAnimationFrame(() => {
					const scroller = document.querySelector<HTMLElement>('[data-drop-scroll]')!;
					const top = scroller.getBoundingClientRect().top - scroller.scrollTop;
					resolve(
						[...scroller.querySelectorAll<HTMLElement>(':scope > ol > li')].map((li) =>
							Math.abs(li.getBoundingClientRect().top - top - li.offsetTop)
						)
					);
				})
			)
	);
	expect(Math.max(...offsets)).toBeLessThanOrEqual(1);
	expect(await python(page)).toMatch(/land\(\)\n\d+takeoff\(\)\n\d+forward\(1\)/);
});

test('a just-placed block can be dragged again at once', async ({ page }) => {
	await threeBlocks(page);
	const [, y0] = await middle(page, 0);
	const [, y2] = await middle(page, 2);
	await moveBlock(page, 2, y0 - 25);
	await moveBlock(page, 0, y2 + 25);
	await page.waitForTimeout(500);
	expect(await python(page)).toMatch(/takeoff\(\)\n\d+forward\(1\)\n\d+land\(\)/);
});

test.describe('touch', () => {
	test.use({ hasTouch: true });

	test('a rejected block can be grabbed again while it springs back', async ({ page }) => {
		await palette(page, 'Abheben').click();
		await palette(page, 'Landen').click();
		await page.waitForTimeout(600);
		const takeoff = await middle(page, 0);
		const stage = (await page.locator('svg[role="img"]').boundingBox())!;
		await touchDrag(page, takeoff, [stage.x + 50, stage.y + 50], 50);
		await page.waitForTimeout(100);
		const land = await middle(page, 1);
		await touchDrag(page, takeoff, [land[0], land[1] + 30]);
		await page.waitForTimeout(600);
		expect(await python(page)).toMatch(/land\(\)\n\d+takeoff\(\)/);
	});
});
