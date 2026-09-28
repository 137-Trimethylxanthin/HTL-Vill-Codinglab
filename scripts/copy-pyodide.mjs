// Copies the Pyodide runtime into static/pyodide so it is bundled offline with the app.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = dirname(fileURLToPath(import.meta.resolve('pyodide')));
const dest = join(dirname(fileURLToPath(import.meta.url)), '..', 'static', 'pyodide');
const SKIP = /\.(md|html|map)$|\.d\.ts$|^package\.json$|^node_modules$/;

rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const name of readdirSync(src)) {
	if (!SKIP.test(name)) cpSync(join(src, name), join(dest, name), { recursive: true });
}
console.log(`pyodide → ${dest}`);
