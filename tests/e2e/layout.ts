import { expect, type Page } from '@playwright/test';
import { openMission, palette, seedStation, toMap } from './helpers';

function measure() {
	let list: Element = document.querySelector('[data-drop-panel] ol[data-drop-slot]')!;
	while (list.parentElement && !/(auto|scroll)/.test(getComputedStyle(list).overflowY))
		list = list.parentElement;
	const small = [...document.querySelectorAll('button, [role="button"]')]
		.map((b) => ({
			label: (b.textContent || b.getAttribute('aria-label') || '').trim(),
			r: b.getBoundingClientRect()
		}))
		.filter(({ r }) => r.width > 0 && (r.width < 56 || r.height < 56))
		.map(({ label, r }) => `${label} ${r.width.toFixed(1)}x${r.height.toFixed(1)}`);
	return {
		listHeight: list.getBoundingClientRect().height,
		small,
		pageScrolls: document.documentElement.scrollWidth > innerWidth
	};
}

/** A long program must never squeeze the program list, and every tap target stays finger-sized. */
export async function checkLongProgram(page: Page, width: number, height: number) {
	await page.setViewportSize({ width, height });
	await seedStation(page);
	await toMap(page);
	await openMission(page, 'Erster Flug');
	for (let i = 0; i < 30; i++) await palette(page, i % 2 ? 'Vorwärts' : 'Abheben').click();
	await expect(page.locator('[data-drop-panel] li[data-block-id]')).toHaveCount(30);
	// New blocks land with a squash animation; measure once the springs have settled.
	await expect(async () => {
		const layout = await page.evaluate(measure);
		expect(layout.listHeight).toBeGreaterThanOrEqual(180);
		expect(layout.small).toEqual([]);
		expect(layout.pageScrolls).toBe(false);
	}).toPass({ timeout: 5_000 });
}
