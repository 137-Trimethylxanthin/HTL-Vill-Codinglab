import { defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	clearScreen: false,
	server: {
		port: 5173,
		strictPort: true,
		host: host || false,
		hmr: host ? { protocol: 'ws', host, port: 5174 } : undefined,
		watch: { ignored: ['**/src-tauri/**'] }
	},
	optimizeDeps: { exclude: ['pyodide'] },
	worker: { format: 'es' },
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'tests/e2e/**'],
					testTimeout: 30000,
					hookTimeout: 60000
				}
			}
		]
	}
});
