import { test } from '@playwright/test';
import { checkLongProgram } from './layout';

test('30 blocks at the smallest window (1024×700)', ({ page }) =>
	checkLongProgram(page, 1024, 700));
test('30 blocks at 1280×800', ({ page }) => checkLongProgram(page, 1280, 800));
