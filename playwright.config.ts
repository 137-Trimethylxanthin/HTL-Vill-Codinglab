import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM || undefined;

export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 90_000,
	retries: process.env.CI ? 1 : 0,
	use: { baseURL: 'http://localhost:5173', launchOptions: { executablePath } },
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: true,
		timeout: 120_000
	},
	projects: [
		{ name: 'desktop', use: { viewport: { width: 1280, height: 800 } }, testIgnore: /phone/ },
		{
			name: 'phone',
			use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
			testMatch: /phone/
		}
	]
});
