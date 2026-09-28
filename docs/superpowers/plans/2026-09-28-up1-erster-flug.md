# UP1 "Erster Flug" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the old app with a new Tauri 2 + SvelteKit project in which mission 1.1 is playable end-to-end: tap blocks → live Python → real Python runs in Pyodide → the drone animates → goal is checked and stars are shown.

**Architecture:** A SvelteKit SPA (static adapter, SSR off) inside a minimal Tauri 2 shell (Rust `lib.rs` entry so mobile works later). The engine is split into pure, unit-tested TypeScript modules: `blocks` (program tree → Python), `missions` (schema, goal, stars), `sim` (drone world rules), `runtime` (Pyodide in a Web Worker, drone Python module, timeout), `stage` (event trace → animation frames, Svelte springs). A thin `workspace` UI wires them together.

**Tech Stack:** Tauri 2.x, SvelteKit 2 + Svelte 5 runes, TypeScript, Vite 8, Tailwind CSS v4, shadcn-svelte, @lucide/svelte, zod 4, Pyodide 314.x, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-codinglab-revamp-design.md` · **Roadmap:** `docs/superpowers/plans/2026-09-28-codinglab-revamp-roadmap.md`

## Global Constraints

- Tauri 2 (latest 2.x); app identifier stays `at.htlvillach.codinglab`; `mainBinaryName` stays `codinglab`; keep the updater `pubkey` and `endpoints` in `tauri.conf.json` unchanged.
- Nothing from the old frontend is retained (`src/`, `static/`, `src-tauri/python/` are deleted).
- Svelte 5 runes only (`$state`, `$derived`, `$props`); no Svelte 4 stores or `export let`.
- UI text is German, "du"-form, max ~12 words per sentence; all UI strings live in `src/lib/i18n/de.ts` (mission texts live in mission JSON).
- No typing required in the mission workspace; tap targets ≥ 56 px.
- Pyodide assets are bundled locally (served from `/pyodide/`), never loaded from a CDN.
- Safety limits: max 500 drone events per run, 2 s wall-clock timeout per run.
- Python tracebacks are never shown to the user; they are mapped to one-line German messages.
- No `unwrap()`/`expect()` in Rust except the single `run()` startup `expect` Tauri requires; no `panic = "abort"`.
- Only local commits; never push. Every commit message ends with the line `Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU` (after a blank line). Commits are GPG-signed; if signing times out, stop and ask the user to unlock the key — never pass `--no-gpg-sign`.
- Run `npm run format` before every commit so prettier (tabs, single quotes) owns formatting.

## Review Focus

1. **Svelte `$state` proxies sent to the worker** — `postMessage` throws `DataCloneError` on proxies; the runner must only receive plain data (the code string and the mission object imported from JSON). Task 8 passes `$state.snapshot` where state is involved and its manual check includes a real run.
2. **Pressing Start twice or editing the program during a run** — a second Start while running must be ignored, and editing the program mid-run must stop playback and reset the drone, not leave two animations fighting. Pinned by `Player` token logic (Task 7) and the workspace guard (Task 8, manual check).
3. **Pyodide fails to load** (missing `static/pyodide`, corrupted install) — the user must see a friendly German message instead of a blank screen or an endless spinner. Pinned by the client test "rejects ready when the worker reports failure" (Task 6) and the page error state (Task 8).
4. **A kid taps 50 blocks** — the program is capped at 30 blocks, the list scrolls inside its panel, and the page layout does not grow. Pinned by the `appendBlock` cap test (Task 2) and the manual layout check (Task 8).
5. **Stepper pushed past its range / odd numbers reaching Python** — block parameters are clamped to the registry range; the world rejects non-integer or out-of-range steps with `badNumber` instead of misbehaving. Pinned by `setParam` clamp test (Task 2) and world `badNumber` test (Task 4).

---

## File Structure

```
package.json, package-lock.json          new (from sv scaffold, edited)
vite.config.ts                           SvelteKit + Tailwind + Vitest + Tauri dev server + Pyodide settings
tsconfig.json, eslint.config.js, prettier.config.js, .prettierignore, .npmrc   from scaffold
components.json                          shadcn-svelte config (generated)
.gitignore                               rewritten
scripts/copy-pyodide.mjs                 copies Pyodide runtime files to static/pyodide/ (gitignored)
src/app.html, src/app.d.ts               from scaffold
src/routes/layout.css                    Tailwind v4 + shadcn tokens + CodingLab tokens + kiosk base
src/routes/+layout.svelte                imports CSS, renders children
src/routes/+layout.ts                    ssr = false (SPA)
src/routes/+page.svelte                  boots the Python runner, shows mission 1.1
src/lib/utils.ts, src/lib/components/ui/button/*   shadcn (generated)
src/lib/i18n/de.ts                       all German UI strings
src/lib/blocks/types.ts                  BlockType, BlockNode
src/lib/blocks/registry.ts               per-block Python call, param range, container flag
src/lib/blocks/generator.ts              toPython(), countBlocks()
src/lib/blocks/edit.ts                   createBlock, appendBlock, removeBlock, setParam
src/lib/missions/schema.ts               zod schema, Mission type, parseMission()
src/lib/missions/goal.ts                 isGoalReached()
src/lib/missions/stars.ts                calcStars()
src/lib/missions/index.ts                SHOWCASE mission list
src/lib/missions/showcase/1.1.json       mission "Erster Flug"
src/lib/sim/world.ts                     World class: rules, events, stops
src/lib/sim/result.ts                    RunResult, PyError
src/lib/runtime/drone.py                 the Python `drone` module kids import
src/lib/runtime/errors.ts                friendlyPyError()
src/lib/runtime/execute.ts               createExecutor(pyodide) — runs code against a World
src/lib/runtime/protocol.ts              worker message types
src/lib/runtime/worker.ts                Web Worker: loads Pyodide, runs requests
src/lib/runtime/client.ts                PythonRunner: ready(), run() with timeout, respawn
src/lib/stage/timeline.ts                buildTimeline(): events → animation frames
src/lib/stage/player.svelte.ts           Player: springs + playback with cancel token
src/lib/stage/DroneStage.svelte          SVG map + drone
src/lib/workspace/highlight.ts           tiny Python tokenizer for the Python view
src/lib/workspace/icons.ts               BlockType → lucide icon
src/lib/workspace/BlockTile.svelte       one block (icon, label, stepper, remove)
src/lib/workspace/BlockPalette.svelte    tap-to-add palette
src/lib/workspace/ProgramList.svelte     the program (recursive render)
src/lib/workspace/PythonView.svelte      highlighted, line-highlighting code view
src/lib/workspace/MissionWorkspace.svelte  wires everything for one mission
src-tauri/Cargo.toml                     trimmed deps, lib target for mobile
src-tauri/src/main.rs, src-tauri/src/lib.rs  minimal Tauri entry
src-tauri/tauri.conf.json                rewritten
src-tauri/capabilities/default.json      core:default only
```

Tests sit next to their modules as `*.test.ts`.

---

### Task 1: Clean slate and new scaffold

**Files:**
- Delete: `src/`, `static/`, `src-tauri/python/`, `src-tauri/capabilities/desktop.json`, `src-tauri/capabilities/migrated.json`, `src-tauri/gen/`, `updates/`, `.github/workflows/publish.yml`, `svelte.config.js`, `jsconfig.json`, `package.json`, `package-lock.json`
- Create: everything listed under "from scaffold" above, `src/routes/+layout.ts`, `src/lib/i18n/de.ts`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`
- Modify: `src-tauri/Cargo.toml`, `src-tauri/src/main.rs`, `src-tauri/tauri.conf.json`, `src-tauri/.gitignore`, `.gitignore`, `src/routes/layout.css`, `vite.config.ts`, `package.json`

**Interfaces:**
- Produces: `t` (German strings object) from `$lib/i18n/de`; shadcn `Button` from `$lib/components/ui/button/index.js`; `cn()` from `$lib/utils`; Tailwind colour utilities `bg-drone`, `text-drone-foreground`, `bg-sky`; npm scripts `dev`, `build`, `check`, `lint`, `format`, `test`, `tauri`.

- [ ] **Step 1: Delete the old app**

```bash
cd /home/maki/Documents/code/programmier-trainer
git rm -r -q src static src-tauri/python src-tauri/capabilities/desktop.json src-tauri/capabilities/migrated.json src-tauri/gen updates .github/workflows/publish.yml svelte.config.js jsconfig.json package.json package-lock.json
rm -rf node_modules .svelte-kit build src-tauri/target
```

- [ ] **Step 2: Scaffold SvelteKit in a temp dir and copy it in**

```bash
SCRATCH=$(mktemp -d)
npx -y sv@latest create "$SCRATCH/app" --template minimal --types ts \
  --add prettier eslint "tailwindcss=plugins:none" "vitest=usages:unit" "sveltekit-adapter=adapter:static" \
  --no-download-check --no-install
cp -r "$SCRATCH/app/src" "$SCRATCH/app/static" .
cp "$SCRATCH/app/package.json" "$SCRATCH/app/vite.config.ts" "$SCRATCH/app/tsconfig.json" \
   "$SCRATCH/app/eslint.config.js" "$SCRATCH/app/prettier.config.js" "$SCRATCH/app/.prettierignore" "$SCRATCH/app/.npmrc" .
rm -rf src/lib/vitest-examples src/lib/index.ts
```

- [ ] **Step 3: Rewrite `.gitignore`**

```gitignore
node_modules
/build
/.svelte-kit
/package
/static/pyodide/
/src-tauri/target
.DS_Store
.env
.env.*
!.env.example
vite.config.js.timestamp-*
vite.config.ts.timestamp-*
*.log
.vscode/*
```

Append to `.prettierignore` (keeps prettier away from vendored and Rust files):

```gitignore
/static/pyodide/
/src-tauri/
/docs/
```

Append to `src-tauri/.gitignore`:

```gitignore
/gen/schemas
```

- [ ] **Step 4: Edit `package.json`**

Set `"name": "codinglab"`, `"version": "0.9.0"`, and add these scripts next to the generated ones (keep the generated `dev`, `build`, `preview`, `prepare`, `check`, `check:watch`, `lint`, `format`, `test:unit`, `test`):

```json
"tauri": "tauri"
```

Then install:

```bash
npm install
npm install @tauri-apps/api zod @lucide/svelte
npm install -D @tauri-apps/cli
```

- [ ] **Step 5: Initialise shadcn-svelte and add Button**

The init command prompts for a preset; run it inside `script` and accept the defaults:

```bash
(for i in $(seq 1 12); do sleep 3; printf '\r'; done) | script -qec "npx -y shadcn-svelte@latest init --base-color neutral --css src/routes/layout.css --components-alias '\$lib/components' --lib-alias '\$lib' --utils-alias '\$lib/utils' --hooks-alias '\$lib/hooks' --ui-alias '\$lib/components/ui'" /dev/null
npx shadcn-svelte@latest add button -y
test -f components.json && test -f src/lib/components/ui/button/index.ts && echo OK
```

Expected: `OK`. If `components.json` is missing, run `npx shadcn-svelte@latest init …` (same flags) interactively and accept the defaults.

- [ ] **Step 6: Add CodingLab tokens and kiosk base to `src/routes/layout.css`**

In the generated `:root` block change `--radius: 0.625rem;` to `--radius: 1rem;`. Then append at the end of the file:

```css
:root {
	--drone: oklch(0.72 0.19 45);
	--drone-foreground: oklch(0.99 0 0);
	--sky: oklch(0.95 0.03 230);
}

.dark {
	--drone: oklch(0.76 0.17 50);
	--drone-foreground: oklch(0.15 0 0);
	--sky: oklch(0.25 0.03 240);
}

@theme inline {
	--color-drone: var(--drone);
	--color-drone-foreground: var(--drone-foreground);
	--color-sky: var(--sky);
}

@layer base {
	html,
	body {
		height: 100%;
		overscroll-behavior: none;
	}
	body {
		user-select: none;
		-webkit-user-select: none;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}
}
```

(Final palette and fonts are chosen in UP2.)

- [ ] **Step 7: Replace `vite.config.ts`**

```ts
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
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					testTimeout: 30000,
					hookTimeout: 60000
				}
			}
		]
	}
});
```

- [ ] **Step 8: SPA layout files**

`src/routes/+layout.ts`:

```ts
export const ssr = false;
export const prerender = false;
```

`src/routes/+layout.svelte`:

```svelte
<script lang="ts">
	import './layout.css';

	let { children } = $props();
</script>

{@render children()}
```

`src/routes/+page.svelte` (temporary, replaced in Task 8):

```svelte
<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { t } from '$lib/i18n/de';
</script>

<main class="grid h-full place-items-center bg-sky">
	<Button class="h-16 bg-drone px-10 text-2xl text-drone-foreground">{t.app.name}</Button>
</main>
```

Delete `src/lib/assets/favicon.svg` if the scaffold created it and remove any reference to it.

- [ ] **Step 9: German strings `src/lib/i18n/de.ts`**

```ts
export const de = {
	app: {
		name: 'CodingLab',
		loading: 'Drohne startet …',
		loadFailed: 'Python konnte nicht geladen werden. Bitte App neu starten.'
	},
	workspace: {
		palette: 'Befehle',
		program: 'Dein Programm',
		python: 'Python',
		start: 'Start',
		reset: 'Zurück',
		emptyProgram: 'Tippe auf einen Befehl, um ihn hinzuzufügen.',
		remove: 'Entfernen',
		more: 'Mehr',
		less: 'Weniger',
		success: 'Geschafft!',
		full: 'Dein Programm ist voll.'
	},
	blocks: {
		takeoff: 'Abheben',
		land: 'Landen',
		forward: 'Vorwärts',
		turn_left: 'Links drehen',
		turn_right: 'Rechts drehen',
		pick_up: 'Paket nehmen',
		drop: 'Paket abgeben',
		photo: 'Foto',
		repeat: 'Wiederhole'
	},
	stops: {
		edge: 'Hoppla – hier ist die Karte zu Ende!',
		building: 'Autsch! Da steht ein Gebäude.',
		notFlying: 'Die Drohne muss zuerst abheben.',
		alreadyFlying: 'Die Drohne fliegt schon.',
		noParcel: 'Hier liegt kein Paket.',
		notCarrying: 'Du hast kein Paket dabei.',
		wrongDropSpot: 'Hier ist kein Abgabeplatz.',
		badNumber: 'Diese Zahl passt hier nicht.',
		unknownCommand: 'Diesen Befehl kennt die Drohne nicht.',
		tooManySteps: 'Deine Drohne fliegt endlos im Kreis!',
		timeout: 'Dein Programm läuft zu lange.'
	},
	pyErrors: {
		SyntaxError: 'Da stimmt die Schreibweise nicht.',
		IndentationError: 'Die Einrückung passt nicht.',
		NameError: 'Diesen Namen kenne ich nicht.',
		TypeError: 'Ein Befehl hat einen falschen Wert bekommen.',
		ZeroDivisionError: 'Durch 0 teilen geht nicht.',
		default: 'Da ist etwas schiefgelaufen.'
	},
	outcome: {
		stillFlying: 'Fast! Vergiss nicht zu landen.',
		missed: 'Knapp daneben – versuch es nochmal.'
	}
} as const;

export const t = de;
export type StopCode = keyof typeof de.stops;
```

- [ ] **Step 10: Minimal Tauri backend**

`src-tauri/Cargo.toml` (replace whole file):

```toml
[package]
name = "codinglab"
version = "0.9.0"
description = "CodingLab – HTL Villach"
authors = ["Sitter Max", "Rechberger Simon"]
edition = "2024"

[lib]
name = "codinglab_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"

[profile.release]
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

`src-tauri/src/main.rs` (replace whole file):

```rust
// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    codinglab_lib::run();
}
```

`src-tauri/src/lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running CodingLab");
}
```

`src-tauri/capabilities/default.json`:

```json
{
	"$schema": "../gen/schemas/desktop-schema.json",
	"identifier": "default",
	"description": "Permissions for the main window",
	"windows": ["main"],
	"permissions": ["core:default"]
}
```

`src-tauri/tauri.conf.json` (replace whole file; copy the `pubkey` and `endpoints` values verbatim from the old file before overwriting):

```json
{
	"$schema": "https://schema.tauri.app/config/2",
	"productName": "codinglab",
	"mainBinaryName": "codinglab",
	"version": "0.9.0",
	"identifier": "at.htlvillach.codinglab",
	"build": {
		"beforeDevCommand": "npm run dev",
		"beforeBuildCommand": "npm run build",
		"devUrl": "http://localhost:5173",
		"frontendDist": "../build"
	},
	"app": {
		"windows": [
			{
				"label": "main",
				"title": "CodingLab – HTL Villach",
				"width": 1280,
				"height": 800,
				"minWidth": 1024,
				"minHeight": 700,
				"resizable": true,
				"fullscreen": false
			}
		],
		"security": { "csp": null }
	},
	"bundle": {
		"active": true,
		"targets": "all",
		"copyright": "2026 HTL Villach",
		"shortDescription": "Programmier eine Drohne – mit echtem Python.",
		"icon": [
			"icons/32x32.png",
			"icons/128x128.png",
			"icons/128x128@2x.png",
			"icons/icon.icns",
			"icons/icon.ico"
		]
	},
	"plugins": {
		"updater": {
			"pubkey": "<copy from old tauri.conf.json>",
			"endpoints": ["<copy from old tauri.conf.json>"]
		}
	}
}
```

(CSP is tightened in UP6; `createUpdaterArtifacts` returns in UP6 with CI signing.)

- [ ] **Step 11: Verify everything builds**

```bash
npm run format
npm run check
npm run lint
npm run build
(cd src-tauri && cargo check)
```

Expected: `svelte-check found 0 errors`, lint clean, `build/index.html` exists, `cargo check` finishes without errors. `npm test` is not run yet (no tests exist; vitest exits non-zero without files).

- [ ] **Step 12: Verify the desktop window**

Run: `npm run tauri dev`
Expected: a window titled "CodingLab – HTL Villach" shows a light-blue page with one big orange "CodingLab" button. Close it.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: replace old app with new Tauri 2 + SvelteKit scaffold

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 2: Block model and Python generator

**Files:**
- Create: `src/lib/blocks/types.ts`, `src/lib/blocks/registry.ts`, `src/lib/blocks/generator.ts`, `src/lib/blocks/edit.ts`
- Test: `src/lib/blocks/generator.test.ts`, `src/lib/blocks/edit.test.ts`

**Interfaces:**
- Produces:
  - `BLOCK_TYPES: readonly BlockType[]`, `type BlockType = 'takeoff'|'land'|'forward'|'turn_left'|'turn_right'|'pick_up'|'drop'|'photo'|'repeat'`
  - `interface BlockNode { id: string; type: BlockType; n?: number; children?: BlockNode[] }`
  - `BLOCKS: Record<BlockType, BlockSpec>` with `BlockSpec { call: string; param?: { min: number; max: number; default: number }; container?: boolean }`
  - `PY_HEADER = 'from drone import *'`
  - `toPython(program: BlockNode[]): { code: string; lineOf: Record<string, number>; blockAt: Record<number, string> }`
  - `countBlocks(program: BlockNode[]): number`
  - `MAX_BLOCKS = 30`, `createBlock(type): BlockNode`, `appendBlock(program, type): BlockNode[]`, `removeBlock(program, id): BlockNode[]`, `setParam(program, id, n): BlockNode[]` (all immutable), `findBlock(program, id): BlockNode | undefined`

- [ ] **Step 1: Write the failing tests**

`src/lib/blocks/generator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { countBlocks, PY_HEADER, toPython } from './generator';
import type { BlockNode } from './types';

const b = (id: string, type: BlockNode['type'], extra: Partial<BlockNode> = {}): BlockNode => ({
	id,
	type,
	...extra
});

describe('toPython', () => {
	it('emits only the header for an empty program', () => {
		expect(toPython([]).code).toBe(`${PY_HEADER}\n\n`);
	});

	it('emits one call per block with parameters', () => {
		const out = toPython([b('a', 'takeoff'), b('b', 'forward', { n: 4 }), b('c', 'land')]);
		expect(out.code).toBe(`${PY_HEADER}\n\ntakeoff()\nforward(4)\nland()\n`);
		expect(out.lineOf).toEqual({ a: 3, b: 4, c: 5 });
		expect(out.blockAt).toEqual({ 3: 'a', 4: 'b', 5: 'c' });
	});

	it('uses the registry default when n is missing', () => {
		expect(toPython([b('a', 'forward')]).code).toContain('forward(1)');
	});

	it('emits nested loops with indentation and loop variables', () => {
		const program = [
			b('r', 'repeat', {
				n: 4,
				children: [b('f', 'forward', { n: 2 }), b('r2', 'repeat', { n: 2, children: [b('t', 'turn_left')] })]
			})
		];
		const out = toPython(program);
		expect(out.code).toBe(
			`${PY_HEADER}\n\nfor i in range(4):\n    forward(2)\n    for j in range(2):\n        turn_left()\n`
		);
		expect(out.lineOf).toEqual({ r: 3, f: 4, r2: 5, t: 6 });
	});

	it('emits pass for an empty loop body', () => {
		expect(toPython([b('r', 'repeat', { n: 3, children: [] })]).code).toBe(
			`${PY_HEADER}\n\nfor i in range(3):\n    pass\n`
		);
	});
});

describe('countBlocks', () => {
	it('counts containers and their children', () => {
		expect(
			countBlocks([b('a', 'takeoff'), b('r', 'repeat', { children: [b('f', 'forward'), b('t', 'turn_left')] })])
		).toBe(4);
	});
});
```

`src/lib/blocks/edit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { appendBlock, createBlock, findBlock, MAX_BLOCKS, removeBlock, setParam } from './edit';
import type { BlockNode } from './types';

describe('createBlock', () => {
	it('gives parameter blocks their default and containers an empty body', () => {
		expect(createBlock('forward')).toMatchObject({ type: 'forward', n: 1 });
		expect(createBlock('repeat')).toMatchObject({ type: 'repeat', n: 2, children: [] });
		expect(createBlock('land').n).toBeUndefined();
	});

	it('creates unique ids', () => {
		expect(createBlock('land').id).not.toBe(createBlock('land').id);
	});
});

describe('appendBlock', () => {
	it('appends without mutating', () => {
		const before: BlockNode[] = [];
		const after = appendBlock(before, 'takeoff');
		expect(before).toHaveLength(0);
		expect(after.map((n) => n.type)).toEqual(['takeoff']);
	});

	it(`refuses to grow past ${MAX_BLOCKS} blocks`, () => {
		let program: BlockNode[] = [];
		for (let i = 0; i < MAX_BLOCKS + 5; i++) program = appendBlock(program, 'forward');
		expect(program).toHaveLength(MAX_BLOCKS);
	});
});

describe('removeBlock', () => {
	it('removes top-level and nested blocks', () => {
		const program: BlockNode[] = [
			{ id: 'a', type: 'takeoff' },
			{ id: 'r', type: 'repeat', n: 2, children: [{ id: 'f', type: 'forward', n: 1 }] }
		];
		expect(removeBlock(program, 'a').map((n) => n.id)).toEqual(['r']);
		expect(removeBlock(program, 'f')[1].children).toEqual([]);
	});
});

describe('findBlock', () => {
	it('finds nested blocks and returns undefined for unknown ids', () => {
		const program: BlockNode[] = [{ id: 'r', type: 'repeat', n: 2, children: [{ id: 'f', type: 'forward', n: 3 }] }];
		expect(findBlock(program, 'f')?.n).toBe(3);
		expect(findBlock(program, 'nope')).toBeUndefined();
	});
});

describe('setParam', () => {
	const program: BlockNode[] = [{ id: 'f', type: 'forward', n: 1 }];

	it('sets a value inside the range', () => {
		expect(setParam(program, 'f', 5)[0].n).toBe(5);
	});

	it('clamps to the registry range', () => {
		expect(setParam(program, 'f', 0)[0].n).toBe(1);
		expect(setParam(program, 'f', 99)[0].n).toBe(9);
	});

	it('ignores blocks without a parameter', () => {
		const p: BlockNode[] = [{ id: 'l', type: 'land' }];
		expect(setParam(p, 'l', 3)[0].n).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/blocks`
Expected: FAIL — cannot resolve `./generator` / `./edit`.

- [ ] **Step 3: Implement**

`src/lib/blocks/types.ts`:

```ts
export const BLOCK_TYPES = [
	'takeoff',
	'land',
	'forward',
	'turn_left',
	'turn_right',
	'pick_up',
	'drop',
	'photo',
	'repeat'
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface BlockNode {
	id: string;
	type: BlockType;
	/** Parameter value for blocks that take a number (steps, repetitions). */
	n?: number;
	/** Body of container blocks such as `repeat`. */
	children?: BlockNode[];
}
```

`src/lib/blocks/registry.ts`:

```ts
import type { BlockType } from './types';

export interface BlockSpec {
	/** Python function name (containers: informational only). */
	call: string;
	param?: { min: number; max: number; default: number };
	container?: boolean;
}

export const BLOCKS: Record<BlockType, BlockSpec> = {
	takeoff: { call: 'takeoff' },
	land: { call: 'land' },
	forward: { call: 'forward', param: { min: 1, max: 9, default: 1 } },
	turn_left: { call: 'turn_left' },
	turn_right: { call: 'turn_right' },
	pick_up: { call: 'pick_up' },
	drop: { call: 'drop' },
	photo: { call: 'photo' },
	repeat: { call: 'range', param: { min: 2, max: 9, default: 2 }, container: true }
};
```

`src/lib/blocks/generator.ts`:

```ts
import { BLOCKS } from './registry';
import type { BlockNode } from './types';

export const PY_HEADER = 'from drone import *';

export interface PythonOutput {
	code: string;
	/** Block id → 1-based Python line. */
	lineOf: Record<string, number>;
	/** 1-based Python line → block id. */
	blockAt: Record<number, string>;
}

const LOOP_VARS = ['i', 'j', 'k'];

export function toPython(program: BlockNode[]): PythonOutput {
	const lines = [PY_HEADER, ''];
	const lineOf: Record<string, number> = {};
	const blockAt: Record<number, string> = {};

	const emit = (nodes: BlockNode[], depth: number) => {
		const indent = '    '.repeat(depth);
		for (const node of nodes) {
			const spec = BLOCKS[node.type];
			const n = node.n ?? spec.param?.default;
			if (spec.container) {
				const loopVar = LOOP_VARS[depth] ?? `i${depth}`;
				lines.push(`${indent}for ${loopVar} in range(${n}):`);
			} else {
				lines.push(`${indent}${spec.call}(${spec.param ? n : ''})`);
			}
			lineOf[node.id] = lines.length;
			blockAt[lines.length] = node.id;
			if (spec.container) {
				const body = node.children ?? [];
				if (body.length === 0) lines.push(`${indent}    pass`);
				else emit(body, depth + 1);
			}
		}
	};

	emit(program, 0);
	return { code: lines.join('\n') + '\n', lineOf, blockAt };
}

export function countBlocks(program: BlockNode[]): number {
	return program.reduce((sum, node) => sum + 1 + countBlocks(node.children ?? []), 0);
}
```

`src/lib/blocks/edit.ts`:

```ts
import { countBlocks } from './generator';
import { BLOCKS } from './registry';
import type { BlockNode, BlockType } from './types';

export const MAX_BLOCKS = 30;

export function createBlock(type: BlockType): BlockNode {
	const spec = BLOCKS[type];
	const node: BlockNode = { id: crypto.randomUUID(), type };
	if (spec.param) node.n = spec.param.default;
	if (spec.container) node.children = [];
	return node;
}

export function appendBlock(program: BlockNode[], type: BlockType): BlockNode[] {
	if (countBlocks(program) >= MAX_BLOCKS) return program;
	return [...program, createBlock(type)];
}

export function removeBlock(program: BlockNode[], id: string): BlockNode[] {
	return program
		.filter((node) => node.id !== id)
		.map((node) => (node.children ? { ...node, children: removeBlock(node.children, id) } : node));
}

export function findBlock(program: BlockNode[], id: string): BlockNode | undefined {
	for (const node of program) {
		if (node.id === id) return node;
		const found = findBlock(node.children ?? [], id);
		if (found) return found;
	}
	return undefined;
}

export function setParam(program: BlockNode[], id: string, n: number): BlockNode[] {
	return program.map((node) => {
		if (node.id === id) {
			const range = BLOCKS[node.type].param;
			if (!range) return node;
			return { ...node, n: Math.min(range.max, Math.max(range.min, Math.round(n))) };
		}
		return node.children ? { ...node, children: setParam(node.children, id, n) } : node;
	});
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/lib/blocks`
Expected: PASS (all tests in both files).

- [ ] **Step 5: Commit**

```bash
npm run format
git add src/lib/blocks
git commit -m "feat(blocks): block model, Python generator and immutable edits

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 3: Mission schema and mission 1.1

**Files:**
- Create: `src/lib/missions/schema.ts`, `src/lib/missions/index.ts`, `src/lib/missions/showcase/1.1.json`
- Test: `src/lib/missions/schema.test.ts`

**Interfaces:**
- Consumes: `BLOCK_TYPES`, `BlockNode` (Task 2)
- Produces:
  - `type Dir = 'N'|'E'|'S'|'W'`
  - `TILE_CHARS = '.BPKDS'` — `.` ground, `B` building, `P` landing pad, `K` parcel, `D` drop zone, `S` solar panel
  - `MissionSchema` (zod), `type Mission = z.infer<typeof MissionSchema>` with fields `id, level, title, goalText, map: { rows: string[]; start: { x; y; dir: Dir } }, blocks: BlockType[], goal: { type: 'landOn' }, stars: { optimalBlocks; maxRunsFor3 }, hints: string[], solution: BlockNode[]`
  - `parseMission(raw: unknown): Mission` (throws `Error` with a readable message)
  - `SHOWCASE: Mission[]`

- [ ] **Step 1: Write the failing test**

`src/lib/missions/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SHOWCASE } from './index';
import { parseMission } from './schema';

const valid = {
	id: '9.9',
	level: 1,
	title: 'Test',
	goalText: 'Lande auf dem Landeplatz.',
	map: { rows: ['..P', '...', '...'], start: { x: 0, y: 2, dir: 'N' } },
	blocks: ['takeoff', 'forward', 'land'],
	goal: { type: 'landOn' },
	stars: { optimalBlocks: 3, maxRunsFor3: 3 },
	hints: ['Heb zuerst ab.'],
	solution: [{ id: 's1', type: 'takeoff' }]
};

describe('parseMission', () => {
	it('accepts a valid mission', () => {
		expect(parseMission(valid).id).toBe('9.9');
	});

	it('rejects rows of different length', () => {
		expect(() => parseMission({ ...valid, map: { ...valid.map, rows: ['..P', '..'] } })).toThrow(/Zeilen/);
	});

	it('rejects unknown tile characters', () => {
		expect(() => parseMission({ ...valid, map: { ...valid.map, rows: ['..X', '...', '...'] } })).toThrow(
			/Feld/
		);
	});

	it('rejects a start outside the map or not on ground', () => {
		expect(() => parseMission({ ...valid, map: { ...valid.map, start: { x: 5, y: 0, dir: 'N' } } })).toThrow(
			/Start/
		);
		expect(() => parseMission({ ...valid, map: { ...valid.map, start: { x: 2, y: 0, dir: 'N' } } })).toThrow(
			/Start/
		);
	});

	it('rejects a solution that uses blocks outside the palette', () => {
		expect(() => parseMission({ ...valid, solution: [{ id: 's1', type: 'photo' }] })).toThrow(/Lösung/);
	});
});

describe('SHOWCASE', () => {
	it('contains mission 1.1 first', () => {
		expect(SHOWCASE[0].id).toBe('1.1');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/missions/schema`
Expected: FAIL — cannot resolve `./schema` / `./index`.

- [ ] **Step 3: Implement**

`src/lib/missions/schema.ts`:

```ts
import { z } from 'zod';
import { BLOCK_TYPES, type BlockNode } from '$lib/blocks/types';

export const TILE_CHARS = '.BPKDS';
export type Dir = 'N' | 'E' | 'S' | 'W';

const BlockNodeSchema: z.ZodType<BlockNode> = z.lazy(() =>
	z.object({
		id: z.string().min(1),
		type: z.enum(BLOCK_TYPES),
		n: z.number().int().optional(),
		children: z.array(BlockNodeSchema).optional()
	})
);

const blockTypesIn = (nodes: BlockNode[]): string[] =>
	nodes.flatMap((node) => [node.type, ...blockTypesIn(node.children ?? [])]);

export const MissionSchema = z
	.object({
		id: z.string().regex(/^\d+\.\d+$/),
		level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
		title: z.string().min(1),
		goalText: z.string().min(1).max(80),
		map: z.object({
			rows: z.array(z.string().min(1)).min(1),
			start: z.object({
				x: z.number().int(),
				y: z.number().int(),
				dir: z.enum(['N', 'E', 'S', 'W'])
			})
		}),
		blocks: z.array(z.enum(BLOCK_TYPES)).min(1),
		goal: z.object({ type: z.literal('landOn') }),
		stars: z.object({
			optimalBlocks: z.number().int().positive(),
			maxRunsFor3: z.number().int().positive()
		}),
		hints: z.array(z.string().min(1)).min(1),
		solution: z.array(BlockNodeSchema).min(1)
	})
	.superRefine((m, ctx) => {
		const { rows, start } = m.map;
		if (rows.some((row) => row.length !== rows[0].length)) {
			ctx.addIssue({ code: 'custom', path: ['map', 'rows'], message: 'Alle Zeilen müssen gleich lang sein.' });
		}
		rows.forEach((row, y) => {
			for (const ch of row) {
				if (!TILE_CHARS.includes(ch)) {
					ctx.addIssue({ code: 'custom', path: ['map', 'rows', y], message: `Unbekanntes Feld "${ch}".` });
				}
			}
		});
		if (rows[start.y]?.[start.x] !== '.') {
			ctx.addIssue({
				code: 'custom',
				path: ['map', 'start'],
				message: 'Start muss auf der Karte auf einem leeren Feld liegen.'
			});
		}
		const outside = blockTypesIn(m.solution).filter((type) => !m.blocks.includes(type as never));
		if (outside.length > 0) {
			ctx.addIssue({
				code: 'custom',
				path: ['solution'],
				message: `Lösung benutzt Blöcke außerhalb der Palette: ${outside.join(', ')}`
			});
		}
	});

export type Mission = z.infer<typeof MissionSchema>;

export function parseMission(raw: unknown): Mission {
	const result = MissionSchema.safeParse(raw);
	if (!result.success) throw new Error(z.prettifyError(result.error));
	return result.data;
}
```

`src/lib/missions/showcase/1.1.json`:

```json
{
	"id": "1.1",
	"level": 1,
	"title": "Erster Flug",
	"goalText": "Flieg zum Landeplatz und lande dort.",
	"map": {
		"rows": ["..P..", "B...B", ".....", ".B...", "....."],
		"start": { "x": 2, "y": 4, "dir": "N" }
	},
	"blocks": ["takeoff", "forward", "land"],
	"goal": { "type": "landOn" },
	"stars": { "optimalBlocks": 3, "maxRunsFor3": 3 },
	"hints": [
		"Eine Drohne muss zuerst abheben.",
		"Der Landeplatz ist 4 Felder vor dir.",
		"Abheben, Vorwärts 4, Landen."
	],
	"solution": [
		{ "id": "s1", "type": "takeoff" },
		{ "id": "s2", "type": "forward", "n": 4 },
		{ "id": "s3", "type": "land" }
	]
}
```

`src/lib/missions/index.ts`:

```ts
import m11 from './showcase/1.1.json';
import { parseMission, type Mission } from './schema';

export const SHOWCASE: Mission[] = [m11].map(parseMission);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/missions/schema`
Expected: PASS. If `npm run check` later complains about the JSON import, add `"resolveJsonModule": true` to `compilerOptions` in `tsconfig.json`.

- [ ] **Step 5: Commit**

```bash
npm run format
git add src/lib/missions
git commit -m "feat(missions): mission schema with validation and mission 1.1

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 4: Drone world simulation

**Files:**
- Create: `src/lib/sim/world.ts`, `src/lib/sim/result.ts`
- Test: `src/lib/sim/world.test.ts`

**Interfaces:**
- Consumes: `Mission`, `Dir` (Task 3); `StopCode` (Task 1)
- Produces:
  - `type DroneEvent = { kind: 'takeoff'|'land'|'pickup'|'drop'; line: number } | { kind: 'move'; line; x; y } | { kind: 'turn'; line; dir: Dir } | { kind: 'photo'; line; hit: boolean } | { kind: 'crash'; line; x; y; into: 'building'|'edge' }`
  - `interface Stop { reason: 'crash'|'error'|'limit'|'timeout'; code: StopCode; line: number }`
  - `interface WorldSnapshot { x; y; dir: Dir; flying: boolean; carrying: boolean; rows: string[]; delivered: number; photographed: string[] }`
  - `class World { constructor(mission: Mission, maxEvents = 500); events: DroneEvent[]; stop: Stop | null; call(name: string, line: number, arg?: unknown): boolean; snapshot(): WorldSnapshot }`
  - `interface PyError { type: string; line: number | null; message: string }`, `interface RunResult { events: DroneEvent[]; final: WorldSnapshot; stop: Stop | null; pyError: PyError | null }`

- [ ] **Step 1: Write the failing test**

`src/lib/sim/world.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseMission } from '$lib/missions/schema';
import { World } from './world';

const mission = (rows: string[], start = { x: 0, y: rows.length - 1, dir: 'N' as const }) =>
	parseMission({
		id: '9.9',
		level: 1,
		title: 'T',
		goalText: 'T',
		map: { rows, start },
		blocks: ['takeoff'],
		goal: { type: 'landOn' },
		stars: { optimalBlocks: 1, maxRunsFor3: 1 },
		hints: ['h'],
		solution: [{ id: 's', type: 'takeoff' }]
	});

describe('World', () => {
	it('takes off, moves step by step and lands', () => {
		const w = new World(mission(['P', '.', '.']));
		expect(w.call('takeoff', 1)).toBe(true);
		expect(w.call('forward', 2, 2)).toBe(true);
		expect(w.call('land', 3)).toBe(true);
		expect(w.events).toEqual([
			{ kind: 'takeoff', line: 1 },
			{ kind: 'move', line: 2, x: 0, y: 1 },
			{ kind: 'move', line: 2, x: 0, y: 0 },
			{ kind: 'land', line: 3 }
		]);
		expect(w.snapshot()).toMatchObject({ x: 0, y: 0, flying: false });
		expect(w.stop).toBeNull();
	});

	it('turns left and right', () => {
		const w = new World(mission(['.']));
		w.call('turn_left', 1);
		expect(w.snapshot().dir).toBe('W');
		w.call('turn_right', 2);
		w.call('turn_right', 3);
		expect(w.snapshot().dir).toBe('E');
	});

	it('refuses to move before takeoff', () => {
		const w = new World(mission(['.', '.']));
		expect(w.call('forward', 4, 1)).toBe(false);
		expect(w.stop).toEqual({ reason: 'error', code: 'notFlying', line: 4 });
	});

	it('crashes into buildings and stops', () => {
		const w = new World(mission(['.', 'B', '.']));
		w.call('takeoff', 1);
		expect(w.call('forward', 2, 2)).toBe(false);
		expect(w.events.at(-1)).toEqual({ kind: 'crash', line: 2, x: 0, y: 1, into: 'building' });
		expect(w.stop).toEqual({ reason: 'crash', code: 'building', line: 2 });
		expect(w.snapshot()).toMatchObject({ x: 0, y: 2 });
	});

	it('crashes at the map edge', () => {
		const w = new World(mission(['.']));
		w.call('takeoff', 1);
		expect(w.call('forward', 2, 1)).toBe(false);
		expect(w.stop?.code).toBe('edge');
	});

	it('rejects bad numbers', () => {
		for (const bad of [0, -1, 1.5, '2', 100]) {
			const fresh = new World(mission(['.', '.']));
			fresh.call('takeoff', 1);
			expect(fresh.call('forward', 2, bad)).toBe(false);
			expect(fresh.stop?.code).toBe('badNumber');
		}
	});

	it('picks up a parcel and drops it on a drop zone', () => {
		const w = new World(mission(['D', 'K', '.']));
		w.call('takeoff', 1);
		w.call('forward', 2, 1);
		expect(w.call('pick_up', 3)).toBe(true);
		expect(w.snapshot()).toMatchObject({ carrying: true, rows: ['D', '.', '.'] });
		w.call('forward', 4, 1);
		expect(w.call('drop', 5)).toBe(true);
		expect(w.snapshot()).toMatchObject({ carrying: false, delivered: 1 });
	});

	it('photographs panels once each', () => {
		const w = new World(mission(['S', '.']));
		w.call('takeoff', 1);
		w.call('photo', 2);
		w.call('forward', 3, 1);
		w.call('photo', 4);
		w.call('photo', 5);
		expect(w.events.filter((e) => e.kind === 'photo').map((e) => (e as { hit: boolean }).hit)).toEqual([
			false,
			true,
			true
		]);
		expect(w.snapshot().photographed).toEqual(['0,0']);
	});

	it('stops when the event limit is reached', () => {
		const w = new World(mission(['.']), 5);
		let ok = true;
		let calls = 0;
		while (ok && calls < 100) {
			ok = w.call('turn_left', 1);
			calls++;
		}
		expect(w.events).toHaveLength(5);
		expect(w.stop).toEqual({ reason: 'limit', code: 'tooManySteps', line: 1 });
	});

	it('ignores every call after a stop', () => {
		const w = new World(mission(['.']));
		w.call('land', 1);
		expect(w.call('takeoff', 2)).toBe(false);
		expect(w.events).toHaveLength(0);
	});

	it('rejects unknown commands', () => {
		const w = new World(mission(['.']));
		expect(w.call('explode', 1)).toBe(false);
		expect(w.stop?.code).toBe('unknownCommand');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/sim`
Expected: FAIL — cannot resolve `./world`.

- [ ] **Step 3: Implement**

`src/lib/sim/world.ts`:

```ts
import type { StopCode } from '$lib/i18n/de';
import type { Dir, Mission } from '$lib/missions/schema';

export type DroneEvent =
	| { kind: 'takeoff' | 'land' | 'pickup' | 'drop'; line: number }
	| { kind: 'move'; line: number; x: number; y: number }
	| { kind: 'turn'; line: number; dir: Dir }
	| { kind: 'photo'; line: number; hit: boolean }
	| { kind: 'crash'; line: number; x: number; y: number; into: 'building' | 'edge' };

export interface Stop {
	reason: 'crash' | 'error' | 'limit' | 'timeout';
	code: StopCode;
	line: number;
}

export interface WorldSnapshot {
	x: number;
	y: number;
	dir: Dir;
	flying: boolean;
	carrying: boolean;
	rows: string[];
	delivered: number;
	photographed: string[];
}

export const DIRS: Dir[] = ['N', 'E', 'S', 'W'];
const STEP: Record<Dir, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const MAX_STEPS_PER_CALL = 99;

export class World {
	readonly events: DroneEvent[] = [];
	stop: Stop | null = null;
	private s: WorldSnapshot;

	constructor(
		mission: Mission,
		private readonly maxEvents = 500
	) {
		const { rows, start } = mission.map;
		this.s = {
			x: start.x,
			y: start.y,
			dir: start.dir,
			flying: false,
			carrying: false,
			rows: [...rows],
			delivered: 0,
			photographed: []
		};
	}

	snapshot(): WorldSnapshot {
		return { ...this.s, rows: [...this.s.rows], photographed: [...this.s.photographed] };
	}

	/** Executes one drone command. Returns false when the program must stop. */
	call(name: string, line: number, arg?: unknown): boolean {
		if (this.stop) return false;
		switch (name) {
			case 'takeoff':
				if (this.s.flying) return this.fail('error', 'alreadyFlying', line);
				this.s.flying = true;
				return this.push({ kind: 'takeoff', line });
			case 'land':
				if (!this.s.flying) return this.fail('error', 'notFlying', line);
				this.s.flying = false;
				return this.push({ kind: 'land', line });
			case 'forward':
				return this.forward(line, arg);
			case 'turn_left':
			case 'turn_right': {
				const turn = name === 'turn_left' ? 3 : 1;
				this.s.dir = DIRS[(DIRS.indexOf(this.s.dir) + turn) % 4];
				return this.push({ kind: 'turn', line, dir: this.s.dir });
			}
			case 'pick_up':
				if (this.s.carrying || this.tile() !== 'K') return this.fail('error', 'noParcel', line);
				this.s.carrying = true;
				this.setTile('.');
				return this.push({ kind: 'pickup', line });
			case 'drop':
				if (!this.s.carrying) return this.fail('error', 'notCarrying', line);
				if (this.tile() !== 'D') return this.fail('error', 'wrongDropSpot', line);
				this.s.carrying = false;
				this.s.delivered += 1;
				return this.push({ kind: 'drop', line });
			case 'photo': {
				const hit = this.tile() === 'S';
				const key = `${this.s.x},${this.s.y}`;
				if (hit && !this.s.photographed.includes(key)) this.s.photographed.push(key);
				return this.push({ kind: 'photo', line, hit });
			}
			default:
				return this.fail('error', 'unknownCommand', line);
		}
	}

	private forward(line: number, arg: unknown): boolean {
		if (!this.s.flying) return this.fail('error', 'notFlying', line);
		const steps = arg === undefined ? 1 : arg;
		if (typeof steps !== 'number' || !Number.isInteger(steps) || steps < 1 || steps > MAX_STEPS_PER_CALL) {
			return this.fail('error', 'badNumber', line);
		}
		const [dx, dy] = STEP[this.s.dir];
		for (let i = 0; i < steps; i++) {
			const x = this.s.x + dx;
			const y = this.s.y + dy;
			const tile = this.s.rows[y]?.[x];
			if (tile === undefined || tile === 'B') {
				const into = tile === 'B' ? 'building' : 'edge';
				this.events.push({ kind: 'crash', line, x, y, into });
				return this.fail('crash', into, line);
			}
			this.s.x = x;
			this.s.y = y;
			if (!this.push({ kind: 'move', line, x, y })) return false;
		}
		return true;
	}

	private tile(): string | undefined {
		return this.s.rows[this.s.y]?.[this.s.x];
	}

	private setTile(ch: string) {
		const row = this.s.rows[this.s.y];
		this.s.rows[this.s.y] = row.slice(0, this.s.x) + ch + row.slice(this.s.x + 1);
	}

	private push(event: DroneEvent): boolean {
		if (this.events.length >= this.maxEvents) return this.fail('limit', 'tooManySteps', event.line);
		this.events.push(event);
		return true;
	}

	private fail(reason: Stop['reason'], code: StopCode, line: number): false {
		this.stop = { reason, code, line };
		return false;
	}
}
```

`src/lib/sim/result.ts`:

```ts
import type { DroneEvent, Stop, WorldSnapshot } from './world';

export interface PyError {
	type: string;
	line: number | null;
	message: string;
}

export interface RunResult {
	events: DroneEvent[];
	final: WorldSnapshot;
	stop: Stop | null;
	pyError: PyError | null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/sim`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
npm run format
git add src/lib/sim
git commit -m "feat(sim): drone world rules with events, crashes and limits

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 5: Goal checking and stars

**Files:**
- Create: `src/lib/missions/goal.ts`, `src/lib/missions/stars.ts`
- Test: `src/lib/missions/goal.test.ts`

**Interfaces:**
- Consumes: `Mission` (Task 3), `RunResult`, `World` (Task 4)
- Produces:
  - `isGoalReached(mission: Mission, result: RunResult): boolean`
  - `calcStars(input: { reached: boolean; blockCount: number; runs: number }, rules: Mission['stars']): 0 | 1 | 2 | 3`

- [ ] **Step 1: Write the failing test**

`src/lib/missions/goal.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { World } from '$lib/sim/world';
import type { RunResult } from '$lib/sim/result';
import { SHOWCASE } from './index';
import { isGoalReached } from './goal';
import { calcStars } from './stars';

const m11 = SHOWCASE[0];

function runCommands(commands: [string, number?][]): RunResult {
	const world = new World(m11);
	commands.forEach(([name, arg], i) => world.call(name, i + 3, arg));
	return { events: world.events, final: world.snapshot(), stop: world.stop, pyError: null };
}

describe('isGoalReached (landOn)', () => {
	it('is true when landed on the pad', () => {
		expect(isGoalReached(m11, runCommands([['takeoff'], ['forward', 4], ['land']]))).toBe(true);
	});

	it('is false when still flying above the pad', () => {
		expect(isGoalReached(m11, runCommands([['takeoff'], ['forward', 4]]))).toBe(false);
	});

	it('is false when landed elsewhere', () => {
		expect(isGoalReached(m11, runCommands([['takeoff'], ['forward', 2], ['land']]))).toBe(false);
	});

	it('is false after a stop or a Python error', () => {
		const ok = runCommands([['takeoff'], ['forward', 4], ['land']]);
		expect(isGoalReached(m11, { ...ok, stop: { reason: 'timeout', code: 'timeout', line: 0 } })).toBe(false);
		expect(isGoalReached(m11, { ...ok, pyError: { type: 'NameError', line: 3, message: 'x' } })).toBe(false);
	});
});

describe('calcStars', () => {
	const rules = { optimalBlocks: 3, maxRunsFor3: 3 };

	it('gives 0 when the goal was not reached', () => {
		expect(calcStars({ reached: false, blockCount: 3, runs: 1 }, rules)).toBe(0);
	});

	it('gives 3 for an optimal program in few runs', () => {
		expect(calcStars({ reached: true, blockCount: 3, runs: 3 }, rules)).toBe(3);
	});

	it('gives 2 for an optimal program with many runs or up to 2 extra blocks', () => {
		expect(calcStars({ reached: true, blockCount: 3, runs: 4 }, rules)).toBe(2);
		expect(calcStars({ reached: true, blockCount: 5, runs: 1 }, rules)).toBe(2);
	});

	it('gives 1 for longer programs', () => {
		expect(calcStars({ reached: true, blockCount: 6, runs: 1 }, rules)).toBe(1);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/missions/goal`
Expected: FAIL — cannot resolve `./goal`.

- [ ] **Step 3: Implement**

`src/lib/missions/goal.ts`:

```ts
import type { RunResult } from '$lib/sim/result';
import type { Mission } from './schema';

export function isGoalReached(mission: Mission, result: RunResult): boolean {
	if (result.stop || result.pyError) return false;
	const { final } = result;
	switch (mission.goal.type) {
		case 'landOn':
			return !final.flying && mission.map.rows[final.y]?.[final.x] === 'P';
	}
}
```

`src/lib/missions/stars.ts`:

```ts
import type { Mission } from './schema';

export type Stars = 0 | 1 | 2 | 3;

export function calcStars(
	input: { reached: boolean; blockCount: number; runs: number },
	rules: Mission['stars']
): Stars {
	if (!input.reached) return 0;
	if (input.blockCount <= rules.optimalBlocks && input.runs <= rules.maxRunsFor3) return 3;
	if (input.blockCount <= rules.optimalBlocks + 2) return 2;
	return 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/missions`
Expected: PASS (schema + goal tests).

- [ ] **Step 5: Commit**

```bash
npm run format
git add src/lib/missions
git commit -m "feat(missions): goal checking and star calculation

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 6: Python runtime (Pyodide executor, worker, runner)

**Files:**
- Create: `src/lib/runtime/drone.py`, `src/lib/runtime/errors.ts`, `src/lib/runtime/execute.ts`, `src/lib/runtime/protocol.ts`, `src/lib/runtime/worker.ts`, `src/lib/runtime/client.ts`, `scripts/copy-pyodide.mjs`
- Modify: `package.json` (dependency + `predev`/`prebuild` scripts)
- Test: `src/lib/runtime/execute.test.ts`, `src/lib/runtime/client.test.ts`, `src/lib/missions/solutions.test.ts`

**Interfaces:**
- Consumes: `World`, `RunResult`, `PyError` (Task 4); `Mission`, `SHOWCASE` (Task 3); `toPython`, `countBlocks` (Task 2); `isGoalReached` (Task 5); `t` (Task 1)
- Produces:
  - `friendlyPyError(e: unknown): PyError`
  - `interface PyodideLike`, `createExecutor(py: PyodideLike): { run(code: string, mission: Mission, maxEvents?: number): RunResult }`
  - `type WorkerRequest = { id: number; code: string; mission: Mission; maxEvents: number }`, `type WorkerResponse = { type: 'ready' } | { type: 'failed'; message: string } | { type: 'result'; id: number; result: RunResult }`
  - `class PythonRunner { constructor(factory?: WorkerFactory, timeoutMs = 2000, maxEvents = 500); ready(): Promise<void>; run(code: string, mission: Mission): Promise<RunResult>; dispose(): void }`
  - `timeoutResult(mission: Mission): RunResult`

- [ ] **Step 1: Install Pyodide and add the copy script**

```bash
npm install pyodide
```

`scripts/copy-pyodide.mjs`:

```js
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
```

Add to `package.json` scripts:

```json
"predev": "node scripts/copy-pyodide.mjs",
"prebuild": "node scripts/copy-pyodide.mjs"
```

Run: `node scripts/copy-pyodide.mjs && ls static/pyodide`
Expected: lists `pyodide.asm.wasm`, `pyodide.mjs`, `python_stdlib.zip`, `pyodide-lock.json` (among others).

- [ ] **Step 2: Write the failing tests**

`src/lib/runtime/execute.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPyodide } from 'pyodide';
import { SHOWCASE } from '$lib/missions';
import { createExecutor, type Executor } from './execute';

const m11 = SHOWCASE[0];
const HEADER = 'from drone import *\n\n';
let executor: Executor;

beforeAll(async () => {
	executor = createExecutor(await loadPyodide());
});

describe('executor', () => {
	it('runs a program and reports events with Python line numbers', () => {
		const result = executor.run(`${HEADER}takeoff()\nforward(4)\nland()\n`, m11);
		expect(result.stop).toBeNull();
		expect(result.pyError).toBeNull();
		expect(result.events.map((e) => [e.kind, e.line])).toEqual([
			['takeoff', 3],
			['move', 4],
			['move', 4],
			['move', 4],
			['move', 4],
			['land', 5]
		]);
		expect(result.final).toMatchObject({ x: 2, y: 0, flying: false });
	});

	it('stops the program when the drone crashes', () => {
		const result = executor.run(`${HEADER}takeoff()\nforward(9)\nland()\n`, m11);
		expect(result.stop).toEqual({ reason: 'crash', code: 'edge', line: 4 });
		expect(result.events.some((e) => e.kind === 'land')).toBe(false);
	});

	it('cannot be caught by try/except', () => {
		const code = `${HEADER}try:\n    forward(1)\nexcept Exception:\n    pass\nland()\n`;
		const result = executor.run(code, m11);
		expect(result.stop?.code).toBe('notFlying');
		expect(result.events).toHaveLength(0);
	});

	it('stops endless loops through the event limit', () => {
		const result = executor.run(`${HEADER}while True:\n    turn_left()\n`, m11, 50);
		expect(result.stop).toEqual({ reason: 'limit', code: 'tooManySteps', line: 4 });
		expect(result.events).toHaveLength(50);
	});

	it('maps Python exceptions to a friendly error with line number', () => {
		const result = executor.run(`${HEADER}takeoff()\nforward(1/0)\n`, m11);
		expect(result.stop).toBeNull();
		expect(result.pyError).toEqual({ type: 'ZeroDivisionError', line: 4, message: 'Durch 0 teilen geht nicht.' });
	});

	it('reports syntax errors', () => {
		const result = executor.run(`${HEADER}for i in range(2)\n    takeoff()\n`, m11);
		expect(result.pyError?.type).toBe('SyntaxError');
		expect(result.pyError?.line).toBe(3);
	});

	it('does not leak state between runs', () => {
		executor.run(`${HEADER}takeoff()\nx = 5\n`, m11);
		const second = executor.run(`${HEADER}print(x)\n`, m11);
		expect(second.pyError?.type).toBe('NameError');
		const third = executor.run(`${HEADER}takeoff()\n`, m11);
		expect(third.stop).toBeNull();
	});
});
```

`src/lib/runtime/client.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SHOWCASE } from '$lib/missions';
import { PythonRunner, type WorkerLike } from './client';
import type { WorkerRequest, WorkerResponse } from './protocol';

class FakeWorker implements WorkerLike {
	onmessage: ((e: { data: WorkerResponse }) => void) | null = null;
	sent: WorkerRequest[] = [];
	terminated = false;
	postMessage(msg: WorkerRequest) {
		this.sent.push(msg);
	}
	terminate() {
		this.terminated = true;
	}
	emit(data: WorkerResponse) {
		this.onmessage?.({ data });
	}
}

const m11 = SHOWCASE[0];

afterEach(() => {
	vi.useRealTimers();
});

describe('PythonRunner', () => {
	it('resolves ready when the worker reports ready', async () => {
		const worker = new FakeWorker();
		const runner = new PythonRunner(() => worker);
		worker.emit({ type: 'ready' });
		await expect(runner.ready()).resolves.toBeUndefined();
	});

	it('rejects ready when the worker reports failure', async () => {
		const worker = new FakeWorker();
		const runner = new PythonRunner(() => worker);
		worker.emit({ type: 'failed', message: 'boom' });
		await expect(runner.ready()).rejects.toThrow('boom');
	});

	it('returns the result for the matching request id', async () => {
		const worker = new FakeWorker();
		const runner = new PythonRunner(() => worker);
		worker.emit({ type: 'ready' });
		const pending = runner.run('code', m11);
		await vi.waitFor(() => expect(worker.sent).toHaveLength(1));
		const result = { events: [], final: {} as never, stop: null, pyError: null };
		worker.emit({ type: 'result', id: worker.sent[0].id, result });
		await expect(pending).resolves.toBe(result);
	});

	it('terminates and respawns the worker on timeout', async () => {
		vi.useFakeTimers();
		const workers: FakeWorker[] = [];
		const runner = new PythonRunner(() => {
			const w = new FakeWorker();
			workers.push(w);
			return w;
		}, 2000);
		workers[0].emit({ type: 'ready' });
		const pending = runner.run('while True: pass', m11);
		await vi.advanceTimersByTimeAsync(2000);
		const result = await pending;
		expect(result.stop).toEqual({ reason: 'timeout', code: 'timeout', line: 0 });
		expect(result.final).toMatchObject({ x: 2, y: 4 });
		expect(workers[0].terminated).toBe(true);
		expect(workers).toHaveLength(2);
	});
});
```

`src/lib/missions/solutions.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest';
import { loadPyodide } from 'pyodide';
import { countBlocks, toPython } from '$lib/blocks/generator';
import { createExecutor, type Executor } from '$lib/runtime/execute';
import { isGoalReached } from './goal';
import { SHOWCASE } from './index';

let executor: Executor;

beforeAll(async () => {
	executor = createExecutor(await loadPyodide());
});

describe.each(SHOWCASE.map((m) => [m.id, m] as const))('mission %s', (_id, mission) => {
	it('is solved by its reference solution', () => {
		const result = executor.run(toPython(mission.solution).code, mission);
		expect(result.stop).toBeNull();
		expect(result.pyError).toBeNull();
		expect(isGoalReached(mission, result)).toBe(true);
	});

	it('has a solution within optimalBlocks', () => {
		expect(countBlocks(mission.solution)).toBeLessThanOrEqual(mission.stars.optimalBlocks);
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/lib/runtime src/lib/missions/solutions`
Expected: FAIL — cannot resolve `./execute` / `./client`.

- [ ] **Step 4: Implement the Python module**

`src/lib/runtime/drone.py`:

```python
"""Die Drohne: Jeder Befehl bewegt die Drohne auf der Karte."""

import sys

import _drone_js

_MISSION = "<mission>"


class DroneStop(BaseException):
    """Stoppt das Programm, wenn die Drohne nicht weiterfliegen kann."""


def _line():
    frame = sys._getframe(1)
    while frame is not None and frame.f_code.co_filename != _MISSION:
        frame = frame.f_back
    return frame.f_lineno if frame is not None else 0


def _do(name, *args):
    if not _drone_js.call(name, _line(), *args):
        raise DroneStop()


def takeoff():
    """Hebt ab."""
    _do("takeoff")


def land():
    """Landet auf dem Feld unter der Drohne."""
    _do("land")


def forward(steps=1):
    """Fliegt `steps` Felder nach vorne."""
    _do("forward", steps)


def turn_left():
    """Dreht die Drohne nach links."""
    _do("turn_left")


def turn_right():
    """Dreht die Drohne nach rechts."""
    _do("turn_right")


def pick_up():
    """Nimmt das Paket unter der Drohne auf."""
    _do("pick_up")


def drop():
    """Gibt das Paket ab."""
    _do("drop")


def photo():
    """Macht ein Foto vom Feld unter der Drohne."""
    _do("photo")


__all__ = ["takeoff", "land", "forward", "turn_left", "turn_right", "pick_up", "drop", "photo"]
```

- [ ] **Step 5: Implement errors, executor, protocol, worker and client**

`src/lib/runtime/errors.ts`:

```ts
import { t } from '$lib/i18n/de';
import type { PyError } from '$lib/sim/result';

const MESSAGES: Record<string, string> = t.pyErrors;

export function friendlyPyError(e: unknown): PyError {
	const raw = e instanceof Error ? e.message : String(e);
	const type =
		(e as { type?: string }).type ?? /(\w+(?:Error|Exception))\b/.exec(raw)?.[1] ?? 'Error';
	const lines = [...raw.matchAll(/File "<mission>", line (\d+)/g)];
	const line = lines.length > 0 ? Number(lines[lines.length - 1][1]) : null;
	return { type, line, message: MESSAGES[type] ?? t.pyErrors.default };
}
```

`src/lib/runtime/execute.ts`:

```ts
import droneSource from './drone.py?raw';
import type { Mission } from '$lib/missions/schema';
import type { PyError, RunResult } from '$lib/sim/result';
import { World } from '$lib/sim/world';
import { friendlyPyError } from './errors';

export interface PyodideLike {
	registerJsModule(name: string, module: object): void;
	runPython(code: string, options?: { globals?: unknown; filename?: string }): unknown;
	globals: { get(name: string): unknown; set(name: string, value: unknown): void };
}

export interface Executor {
	run(code: string, mission: Mission, maxEvents?: number): RunResult;
}

export const MISSION_FILENAME = '<mission>';

export function createExecutor(py: PyodideLike): Executor {
	let world: World | null = null;

	py.registerJsModule('_drone_js', {
		call: (name: string, line: number, arg?: unknown) => (world ? world.call(name, line, arg) : false)
	});
	py.globals.set('_drone_src', droneSource);
	py.runPython(
		[
			'import sys, types',
			'_m = types.ModuleType("drone")',
			'exec(_drone_src, _m.__dict__)',
			'sys.modules["drone"] = _m',
			'del _m, _drone_src'
		].join('\n')
	);

	return {
		run(code, mission, maxEvents = 500) {
			const current = new World(mission, maxEvents);
			world = current;
			let pyError: PyError | null = null;
			const scope = (py.globals.get('dict') as () => { destroy?: () => void })();
			try {
				py.runPython(code, { globals: scope, filename: MISSION_FILENAME });
			} catch (e) {
				if (!current.stop) pyError = friendlyPyError(e);
			} finally {
				scope.destroy?.();
				world = null;
			}
			return { events: current.events, final: current.snapshot(), stop: current.stop, pyError };
		}
	};
}
```

If `npm run check` reports that `./drone.py?raw` has no type, add to `src/app.d.ts` (outside `declare global`):

```ts
declare module '*.py?raw' {
	const source: string;
	export default source;
}
```

`src/lib/runtime/protocol.ts`:

```ts
import type { Mission } from '$lib/missions/schema';
import type { RunResult } from '$lib/sim/result';

export type WorkerRequest = { id: number; code: string; mission: Mission; maxEvents: number };

export type WorkerResponse =
	| { type: 'ready' }
	| { type: 'failed'; message: string }
	| { type: 'result'; id: number; result: RunResult };
```

`src/lib/runtime/worker.ts`:

```ts
import { loadPyodide } from 'pyodide';
import { createExecutor } from './execute';
import type { WorkerRequest, WorkerResponse } from './protocol';

const scope = self as unknown as {
	postMessage(msg: WorkerResponse): void;
	onmessage: ((e: MessageEvent<WorkerRequest>) => void) | null;
	location: Location;
};

const executor = loadPyodide({ indexURL: new URL('/pyodide/', scope.location.origin).href }).then(
	(py) => createExecutor(py)
);

executor.then(
	() => scope.postMessage({ type: 'ready' }),
	(err) => scope.postMessage({ type: 'failed', message: String(err) })
);

scope.onmessage = async (event) => {
	const { id, code, mission, maxEvents } = event.data;
	const ready = await executor;
	scope.postMessage({ type: 'result', id, result: ready.run(code, mission, maxEvents) });
};
```

`src/lib/runtime/client.ts`:

```ts
import type { Mission } from '$lib/missions/schema';
import type { RunResult } from '$lib/sim/result';
import { World } from '$lib/sim/world';
import type { WorkerRequest, WorkerResponse } from './protocol';

export interface WorkerLike {
	postMessage(msg: WorkerRequest): void;
	terminate(): void;
	onmessage: ((e: { data: WorkerResponse }) => void) | null;
}

export type WorkerFactory = () => WorkerLike;

export const defaultWorkerFactory: WorkerFactory = () =>
	new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;

export function timeoutResult(mission: Mission): RunResult {
	return {
		events: [],
		final: new World(mission).snapshot(),
		stop: { reason: 'timeout', code: 'timeout', line: 0 },
		pyError: null
	};
}

export class PythonRunner {
	private worker!: WorkerLike;
	private readyPromise!: Promise<void>;
	private nextId = 1;
	private pending = new Map<number, (result: RunResult) => void>();

	constructor(
		private readonly factory: WorkerFactory = defaultWorkerFactory,
		private readonly timeoutMs = 2000,
		private readonly maxEvents = 500
	) {
		this.spawn();
	}

	ready(): Promise<void> {
		return this.readyPromise;
	}

	async run(code: string, mission: Mission): Promise<RunResult> {
		await this.readyPromise;
		const id = this.nextId++;
		return new Promise((resolve) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				this.worker.terminate();
				this.spawn();
				resolve(timeoutResult(mission));
			}, this.timeoutMs);
			this.pending.set(id, (result) => {
				clearTimeout(timer);
				resolve(result);
			});
			this.worker.postMessage({ id, code, mission, maxEvents: this.maxEvents });
		});
	}

	dispose() {
		this.worker.terminate();
		this.pending.clear();
	}

	private spawn() {
		const worker = this.factory();
		this.worker = worker;
		this.readyPromise = new Promise((resolve, reject) => {
			worker.onmessage = ({ data }) => {
				if (data.type === 'ready') resolve();
				else if (data.type === 'failed') reject(new Error(data.message));
				else {
					const done = this.pending.get(data.id);
					this.pending.delete(data.id);
					done?.(data.result);
				}
			};
		});
		this.readyPromise.catch(() => {});
	}
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/lib/runtime src/lib/missions/solutions`
Expected: PASS (7 executor tests, 4 client tests, 2 solution tests). The first Pyodide load takes a few seconds.

- [ ] **Step 7: Run the whole suite and checks**

```bash
npm test
npm run check
npm run lint
```

Expected: all tests pass, 0 type errors, lint clean.

- [ ] **Step 8: Commit**

```bash
npm run format
git add -A
git commit -m "feat(runtime): real Python via Pyodide worker with drone module and limits

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 7: Drone stage (timeline, player, SVG)

**Files:**
- Create: `src/lib/stage/timeline.ts`, `src/lib/stage/player.svelte.ts`, `src/lib/stage/DroneStage.svelte`
- Test: `src/lib/stage/timeline.test.ts`

**Interfaces:**
- Consumes: `DroneEvent`, `Dir` (Tasks 3–4)
- Produces:
  - `interface Pose { x: number; y: number; heading: number; flying: boolean; carrying: boolean }`
  - `interface Frame { pose: Pose; line: number; kind: DroneEvent['kind']; ms: number }`
  - `headingOf(dir: Dir): number`, `startPose(start: { x; y; dir }): Pose`, `buildTimeline(start: { x; y; dir }, events: DroneEvent[]): Frame[]`
  - `class Player { x, y, heading, lift: Spring<number>; carrying: boolean; line: number | null; bump: number; playing: boolean; reset(pose: Pose): void; play(frames: Frame[], speed?: number): Promise<boolean>; stop(): void }` — `play` resolves `true` if it ran to the end, `false` if cancelled
  - `<DroneStage rows={string[]} player={Player} />`

- [ ] **Step 1: Write the failing test**

`src/lib/stage/timeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildTimeline, headingOf, startPose } from './timeline';

const start = { x: 2, y: 4, dir: 'N' as const };

describe('buildTimeline', () => {
	it('starts from the start pose', () => {
		expect(startPose(start)).toEqual({ x: 2, y: 4, heading: 0, flying: false, carrying: false });
	});

	it('produces one frame per event with the resulting pose', () => {
		const frames = buildTimeline(start, [
			{ kind: 'takeoff', line: 3 },
			{ kind: 'move', line: 4, x: 2, y: 3 },
			{ kind: 'land', line: 5 }
		]);
		expect(frames.map((f) => [f.kind, f.line, f.pose.x, f.pose.y, f.pose.flying])).toEqual([
			['takeoff', 3, 2, 4, true],
			['move', 4, 2, 3, true],
			['land', 5, 2, 3, false]
		]);
		expect(frames.every((f) => f.ms > 0)).toBe(true);
	});

	it('turns along the shortest way', () => {
		const frames = buildTimeline(start, [
			{ kind: 'turn', line: 3, dir: 'W' },
			{ kind: 'turn', line: 4, dir: 'N' },
			{ kind: 'turn', line: 5, dir: 'E' },
			{ kind: 'turn', line: 6, dir: 'S' }
		]);
		expect(frames.map((f) => f.pose.heading)).toEqual([-90, 0, 90, 180]);
	});

	it('keeps turning continuously past a full circle', () => {
		const frames = buildTimeline(start, [
			{ kind: 'turn', line: 3, dir: 'E' },
			{ kind: 'turn', line: 3, dir: 'S' },
			{ kind: 'turn', line: 3, dir: 'W' },
			{ kind: 'turn', line: 3, dir: 'N' }
		]);
		expect(frames.at(-1)?.pose.heading).toBe(360);
	});

	it('does not move the drone on a crash', () => {
		const frames = buildTimeline(start, [
			{ kind: 'takeoff', line: 3 },
			{ kind: 'crash', line: 4, x: 2, y: 3, into: 'building' }
		]);
		expect(frames[1].pose).toMatchObject({ x: 2, y: 4 });
	});

	it('tracks carrying', () => {
		const frames = buildTimeline(start, [
			{ kind: 'pickup', line: 3 },
			{ kind: 'drop', line: 4 }
		]);
		expect(frames.map((f) => f.pose.carrying)).toEqual([true, false]);
	});

	it('maps directions to headings', () => {
		expect(['N', 'E', 'S', 'W'].map((d) => headingOf(d as 'N'))).toEqual([0, 90, 180, 270]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/stage`
Expected: FAIL — cannot resolve `./timeline`.

- [ ] **Step 3: Implement the timeline**

`src/lib/stage/timeline.ts`:

```ts
import type { Dir } from '$lib/missions/schema';
import type { DroneEvent } from '$lib/sim/world';

export interface Pose {
	x: number;
	y: number;
	/** Degrees, continuous (may exceed 360 or go negative). */
	heading: number;
	flying: boolean;
	carrying: boolean;
}

export interface Frame {
	pose: Pose;
	line: number;
	kind: DroneEvent['kind'];
	ms: number;
}

const DURATION: Record<DroneEvent['kind'], number> = {
	takeoff: 550,
	land: 550,
	move: 380,
	turn: 300,
	pickup: 450,
	drop: 450,
	photo: 400,
	crash: 700
};

const HEADING: Record<Dir, number> = { N: 0, E: 90, S: 180, W: 270 };

export function headingOf(dir: Dir): number {
	return HEADING[dir];
}

export function startPose(start: { x: number; y: number; dir: Dir }): Pose {
	return { x: start.x, y: start.y, heading: headingOf(start.dir), flying: false, carrying: false };
}

function turnTo(current: number, dir: Dir): number {
	const normalized = ((current % 360) + 360) % 360;
	const delta = ((headingOf(dir) - normalized + 540) % 360) - 180;
	return current + delta;
}

export function buildTimeline(start: { x: number; y: number; dir: Dir }, events: DroneEvent[]): Frame[] {
	let pose = startPose(start);
	return events.map((event) => {
		switch (event.kind) {
			case 'takeoff':
				pose = { ...pose, flying: true };
				break;
			case 'land':
				pose = { ...pose, flying: false };
				break;
			case 'move':
				pose = { ...pose, x: event.x, y: event.y };
				break;
			case 'turn':
				pose = { ...pose, heading: turnTo(pose.heading, event.dir) };
				break;
			case 'pickup':
				pose = { ...pose, carrying: true };
				break;
			case 'drop':
				pose = { ...pose, carrying: false };
				break;
			case 'photo':
			case 'crash':
				break;
		}
		return { pose, line: event.line, kind: event.kind, ms: DURATION[event.kind] };
	});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/stage`
Expected: PASS (7 tests).

- [ ] **Step 5: Implement the player**

`src/lib/stage/player.svelte.ts`:

```ts
import { Spring } from 'svelte/motion';
import type { Frame, Pose } from './timeline';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Player {
	x = new Spring(0, { stiffness: 0.18, damping: 0.55 });
	y = new Spring(0, { stiffness: 0.18, damping: 0.55 });
	heading = new Spring(0, { stiffness: 0.22, damping: 0.6 });
	lift = new Spring(0, { stiffness: 0.12, damping: 0.4 });
	carrying = $state(false);
	line = $state<number | null>(null);
	bump = $state(0);
	playing = $state(false);
	private token = 0;

	reset(pose: Pose) {
		this.token++;
		this.playing = false;
		this.line = null;
		this.carrying = pose.carrying;
		this.x.set(pose.x, { instant: true });
		this.y.set(pose.y, { instant: true });
		this.heading.set(pose.heading, { instant: true });
		this.lift.set(pose.flying ? 1 : 0, { instant: true });
	}

	/** Plays the frames. Resolves true if finished, false if cancelled by reset/stop/another play. */
	async play(frames: Frame[], speed = 1): Promise<boolean> {
		const token = ++this.token;
		this.playing = true;
		for (const frame of frames) {
			if (token !== this.token) return false;
			this.line = frame.line;
			if (frame.kind === 'crash') this.bump++;
			this.x.target = frame.pose.x;
			this.y.target = frame.pose.y;
			this.heading.target = frame.pose.heading;
			this.lift.target = frame.pose.flying ? 1 : 0;
			this.carrying = frame.pose.carrying;
			await sleep(frame.ms / speed);
		}
		if (token !== this.token) return false;
		this.playing = false;
		this.line = null;
		return true;
	}

	stop() {
		this.token++;
		this.playing = false;
		this.line = null;
	}
}
```

- [ ] **Step 6: Implement the SVG stage**

`src/lib/stage/DroneStage.svelte`:

```svelte
<script lang="ts">
	import type { Player } from './player.svelte';

	let { rows, player }: { rows: string[]; player: Player } = $props();

	const CELL = 100;
	const width = $derived(rows[0].length * CELL);
	const height = $derived(rows.length * CELL);
	const cells = $derived(
		rows.flatMap((row, y) => [...row].map((ch, x) => ({ ch, x: x * CELL, y: y * CELL })))
	);
	const lift = $derived(player.lift.current);
	const cx = $derived((player.x.current + 0.5) * CELL);
	const cy = $derived((player.y.current + 0.5) * CELL);
</script>

<svg viewBox="0 0 {width} {height}" class="h-full w-full" role="img" aria-label="Karte mit Drohne">
	<rect {width} {height} rx="24" class="fill-sky" />
	{#each cells as cell (cell.x + ',' + cell.y)}
		<rect x={cell.x + 4} y={cell.y + 4} width={CELL - 8} height={CELL - 8} rx="14" class="fill-white/60" />
		{#if cell.ch === 'B'}
			<rect x={cell.x + 12} y={cell.y + 12} width={CELL - 24} height={CELL - 24} rx="10" class="fill-slate-500" />
			{#each [0, 1] as row (row)}
				{#each [0, 1] as col (col)}
					<rect
						x={cell.x + 26 + col * 30}
						y={cell.y + 26 + row * 30}
						width="18"
						height="18"
						rx="4"
						class="fill-amber-200"
					/>
				{/each}
			{/each}
		{:else if cell.ch === 'P'}
			<circle cx={cell.x + CELL / 2} cy={cell.y + CELL / 2} r="36" class="fill-emerald-500" />
			<text
				x={cell.x + CELL / 2}
				y={cell.y + CELL / 2 + 14}
				text-anchor="middle"
				class="fill-white text-[40px] font-black">H</text
			>
		{:else if cell.ch === 'K'}
			<rect x={cell.x + 30} y={cell.y + 30} width="40" height="40" rx="6" class="fill-amber-600" />
		{:else if cell.ch === 'D'}
			<rect
				x={cell.x + 16}
				y={cell.y + 16}
				width={CELL - 32}
				height={CELL - 32}
				rx="12"
				stroke-width="6"
				stroke-dasharray="12 8"
				class="fill-none stroke-amber-600"
			/>
		{:else if cell.ch === 'S'}
			<rect x={cell.x + 14} y={cell.y + 24} width={CELL - 28} height={CELL - 48} rx="6" class="fill-blue-700" />
		{/if}
	{/each}

	<!-- shadow grows apart from the drone while it flies -->
	<ellipse cx={cx + lift * 10} cy={cy + lift * 14} rx={30 - lift * 6} ry={14 - lift * 3} class="fill-black/20" />

	{#key player.bump}
		<g class:bump={player.bump > 0} style="transform-origin: {cx}px {cy}px">
			<g transform="translate({cx} {cy - lift * 10}) rotate({player.heading.current}) scale({0.8 + lift * 0.25})">
				<rect x="-6" y="-34" width="12" height="68" rx="6" class="fill-slate-800" transform="rotate(45)" />
				<rect x="-6" y="-34" width="12" height="68" rx="6" class="fill-slate-800" transform="rotate(-45)" />
				{#each [[-24, -24], [24, -24], [-24, 24], [24, 24]] as [px, py] (px + ',' + py)}
					<g transform="translate({px} {py})">
						<circle r="15" class="fill-slate-300/70" />
						<rect x="-14" y="-2" width="28" height="4" rx="2" class="fill-slate-700" class:spin={lift > 0.05} />
					</g>
				{/each}
				<rect x="-16" y="-16" width="32" height="32" rx="10" class="fill-drone" />
				<circle cx="0" cy="-10" r="4" class="fill-white" />
				{#if player.carrying}
					<rect x="-10" y="18" width="20" height="16" rx="3" class="fill-amber-600" />
				{/if}
			</g>
		</g>
	{/key}
</svg>

<style>
	.spin {
		animation: spin 0.18s linear infinite;
		transform-box: fill-box;
		transform-origin: center;
	}
	.bump {
		animation: bump 0.5s ease-out;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes bump {
		0%,
		100% {
			transform: translate(0, 0);
		}
		20% {
			transform: translate(-8px, 0) rotate(-6deg);
		}
		40% {
			transform: translate(8px, 0) rotate(6deg);
		}
		60% {
			transform: translate(-5px, 0) rotate(-3deg);
		}
		80% {
			transform: translate(3px, 0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spin,
		.bump {
			animation: none;
		}
	}
</style>
```

- [ ] **Step 7: Check types and commit**

```bash
npm run check
npm test -- src/lib/stage
npm run format
git add src/lib/stage
git commit -m "feat(stage): event timeline, spring player and SVG drone stage

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

Expected before commit: 0 type errors, stage tests pass. (The stage is seen for the first time in Task 8.)

---

### Task 8: Mission workspace and playable mission 1.1

**Files:**
- Create: `src/lib/workspace/highlight.ts`, `src/lib/workspace/icons.ts`, `src/lib/workspace/BlockTile.svelte`, `src/lib/workspace/BlockPalette.svelte`, `src/lib/workspace/ProgramList.svelte`, `src/lib/workspace/PythonView.svelte`, `src/lib/workspace/MissionWorkspace.svelte`
- Modify: `src/routes/+page.svelte` (replace)
- Test: `src/lib/workspace/highlight.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–7 (`toPython`, `countBlocks`, `appendBlock`, `removeBlock`, `setParam`, `findBlock`, `BLOCKS`, `Mission`, `SHOWCASE`, `isGoalReached`, `calcStars`, `PythonRunner`, `RunResult`, `buildTimeline`, `startPose`, `Player`, `DroneStage`, `t`, `Button`)
- Produces:
  - `type TokenKind = 'keyword' | 'number' | 'string' | 'comment' | 'call' | 'text'`, `tokenizeLine(line: string): { kind: TokenKind; text: string }[]`
  - `BLOCK_ICONS: Record<BlockType, Component>`
  - `<MissionWorkspace mission={Mission} runner={PythonRunner} />`

- [ ] **Step 1: Write the failing test**

`src/lib/workspace/highlight.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { tokenizeLine } from './highlight';

describe('tokenizeLine', () => {
	it('marks keywords, calls and numbers', () => {
		expect(tokenizeLine('for i in range(4):')).toEqual([
			{ kind: 'keyword', text: 'for' },
			{ kind: 'text', text: ' i ' },
			{ kind: 'keyword', text: 'in' },
			{ kind: 'text', text: ' ' },
			{ kind: 'call', text: 'range' },
			{ kind: 'text', text: '(' },
			{ kind: 'number', text: '4' },
			{ kind: 'text', text: '):' }
		]);
	});

	it('marks strings and comments', () => {
		expect(tokenizeLine('print("hi") # Gruß')).toEqual([
			{ kind: 'call', text: 'print' },
			{ kind: 'text', text: '(' },
			{ kind: 'string', text: '"hi"' },
			{ kind: 'text', text: ') ' },
			{ kind: 'comment', text: '# Gruß' }
		]);
	});

	it('keeps indentation as text', () => {
		expect(tokenizeLine('    land()')[0]).toEqual({ kind: 'text', text: '    ' });
	});

	it('returns nothing for an empty line', () => {
		expect(tokenizeLine('')).toEqual([]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/workspace`
Expected: FAIL — cannot resolve `./highlight`.

- [ ] **Step 3: Implement the tokenizer**

`src/lib/workspace/highlight.ts`:

```ts
export type TokenKind = 'keyword' | 'number' | 'string' | 'comment' | 'call' | 'text';
export interface Token {
	kind: TokenKind;
	text: string;
}

const KEYWORDS = new Set([
	'from', 'import', 'for', 'in', 'if', 'elif', 'else', 'while', 'def', 'return',
	'pass', 'and', 'or', 'not', 'True', 'False', 'None', 'break', 'continue'
]);

const TOKEN = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)(?=\s*\()|([A-Za-z_]\w*)|([\s\S])/g;

export function tokenizeLine(line: string): Token[] {
	const tokens: Token[] = [];
	const push = (kind: TokenKind, text: string) => {
		const last = tokens[tokens.length - 1];
		if (kind === 'text' && last?.kind === 'text') last.text += text;
		else tokens.push({ kind, text });
	};
	for (const m of line.matchAll(TOKEN)) {
		if (m[1]) push('comment', m[1]);
		else if (m[2]) push('string', m[2]);
		else if (m[3]) push('number', m[3]);
		else if (m[4]) push(KEYWORDS.has(m[4]) ? 'keyword' : 'call', m[4]);
		else if (m[5]) push(KEYWORDS.has(m[5]) ? 'keyword' : 'text', m[5]);
		else push('text', m[6]);
	}
	return tokens;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/workspace`
Expected: PASS (4 tests).

- [ ] **Step 5: Implement the workspace components**

`src/lib/workspace/icons.ts`:

```ts
import type { Component } from 'svelte';
import {
	ArrowUp,
	Camera,
	Package,
	PackageOpen,
	PlaneLanding,
	PlaneTakeoff,
	Repeat,
	RotateCcw,
	RotateCw
} from '@lucide/svelte';
import type { BlockType } from '$lib/blocks/types';

export const BLOCK_ICONS: Record<BlockType, Component> = {
	takeoff: PlaneTakeoff,
	land: PlaneLanding,
	forward: ArrowUp,
	turn_left: RotateCcw,
	turn_right: RotateCw,
	pick_up: Package,
	drop: PackageOpen,
	photo: Camera,
	repeat: Repeat
};
```

`src/lib/workspace/BlockTile.svelte`:

```svelte
<script lang="ts">
	import { Minus, Plus, X } from '@lucide/svelte';
	import { BLOCKS } from '$lib/blocks/registry';
	import type { BlockType } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';
	import { BLOCK_ICONS } from './icons';

	let {
		type,
		n,
		active = false,
		onStep,
		onRemove
	}: {
		type: BlockType;
		n?: number;
		active?: boolean;
		onStep?: (delta: number) => void;
		onRemove?: () => void;
	} = $props();

	const spec = $derived(BLOCKS[type]);
	const Icon = $derived(BLOCK_ICONS[type]);
</script>

<div
	class={cn(
		'flex min-h-14 items-center gap-3 rounded-2xl bg-card px-4 py-2 text-lg font-semibold shadow-md ring-2 ring-transparent transition-all duration-200',
		active && 'scale-[1.03] ring-drone shadow-lg'
	)}
>
	<span class="grid size-10 shrink-0 place-items-center rounded-xl bg-drone text-drone-foreground">
		<Icon class="size-6" />
	</span>
	<span class="grow">{t.blocks[type]}</span>
	{#if spec.param && n !== undefined}
		{#if onStep}
			<div class="flex items-center gap-1">
				<button
					class="grid size-11 place-items-center rounded-xl bg-muted active:scale-90"
					aria-label={t.workspace.less}
					onclick={() => onStep(-1)}
					disabled={n <= spec.param.min}><Minus class="size-5" /></button
				>
				<span class="w-8 text-center text-2xl tabular-nums">{n}</span>
				<button
					class="grid size-11 place-items-center rounded-xl bg-muted active:scale-90"
					aria-label={t.workspace.more}
					onclick={() => onStep(1)}
					disabled={n >= spec.param.max}><Plus class="size-5" /></button
				>
			</div>
		{:else}
			<span class="text-2xl tabular-nums text-muted-foreground">{n}</span>
		{/if}
	{/if}
	{#if onRemove}
		<button
			class="grid size-11 place-items-center rounded-xl text-muted-foreground active:scale-90"
			aria-label={t.workspace.remove}
			onclick={onRemove}><X class="size-5" /></button
		>
	{/if}
</div>
```

`src/lib/workspace/BlockPalette.svelte`:

```svelte
<script lang="ts">
	import { BLOCKS } from '$lib/blocks/registry';
	import type { BlockType } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import BlockTile from './BlockTile.svelte';

	let { blocks, disabled = false, onAdd }: { blocks: BlockType[]; disabled?: boolean; onAdd: (type: BlockType) => void } =
		$props();
</script>

<section class="flex flex-col gap-3">
	<h2 class="text-sm font-bold tracking-wide text-muted-foreground uppercase">{t.workspace.palette}</h2>
	{#each blocks as type (type)}
		<button class="text-left transition-transform active:scale-95 disabled:opacity-50" {disabled} onclick={() => onAdd(type)}>
			<BlockTile {type} n={BLOCKS[type].param?.default} />
		</button>
	{/each}
</section>
```

`src/lib/workspace/ProgramList.svelte`:

```svelte
<script lang="ts">
	import type { BlockNode } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import BlockTile from './BlockTile.svelte';

	let {
		program,
		activeId,
		locked = false,
		onRemove,
		onStep
	}: {
		program: BlockNode[];
		activeId: string | null;
		locked?: boolean;
		onRemove: (id: string) => void;
		onStep: (id: string, delta: number) => void;
	} = $props();
</script>

{#snippet list(nodes: BlockNode[])}
	{#each nodes as node (node.id)}
		<li class="flex flex-col gap-2">
			<BlockTile
				type={node.type}
				n={node.n}
				active={node.id === activeId}
				onStep={locked ? undefined : (delta) => onStep(node.id, delta)}
				onRemove={locked ? undefined : () => onRemove(node.id)}
			/>
			{#if node.children}
				<ul class="ml-8 flex flex-col gap-2 border-l-4 border-drone/40 pl-3">
					{@render list(node.children)}
				</ul>
			{/if}
		</li>
	{/each}
{/snippet}

<section class="flex min-h-0 flex-col gap-3">
	<h2 class="text-sm font-bold tracking-wide text-muted-foreground uppercase">{t.workspace.program}</h2>
	{#if program.length === 0}
		<p class="rounded-2xl border-2 border-dashed p-6 text-center text-lg text-muted-foreground">
			{t.workspace.emptyProgram}
		</p>
	{:else}
		<ol class="flex min-h-0 flex-col gap-2 overflow-y-auto pb-2">
			{@render list(program)}
		</ol>
	{/if}
</section>
```

`src/lib/workspace/PythonView.svelte`:

```svelte
<script lang="ts">
	import { t } from '$lib/i18n/de';
	import { cn } from '$lib/utils';
	import { tokenizeLine, type TokenKind } from './highlight';

	let { code, activeLine }: { code: string; activeLine: number | null } = $props();

	const lines = $derived(code.replace(/\n$/, '').split('\n'));
	const COLORS: Record<TokenKind, string> = {
		keyword: 'text-fuchsia-400',
		call: 'text-sky-300',
		number: 'text-amber-300',
		string: 'text-emerald-300',
		comment: 'text-slate-500',
		text: 'text-slate-100'
	};
</script>

<section class="flex min-h-0 flex-col gap-3">
	<h2 class="text-sm font-bold tracking-wide text-muted-foreground uppercase">{t.workspace.python}</h2>
	<pre class="min-h-0 overflow-auto rounded-2xl bg-slate-900 p-4 font-mono text-lg leading-8"><code
			>{#each lines as line, i (i)}<div
					class={cn('-mx-2 rounded-lg px-2 transition-colors', activeLine === i + 1 && 'bg-drone/40')}
				><span class="mr-4 inline-block w-6 text-right text-slate-500 select-none">{i + 1}</span
				>{#each tokenizeLine(line) as token, j (j)}<span class={COLORS[token.kind]}>{token.text}</span
					>{/each}</div
			>{/each}</code
		></pre>
</section>
```

`src/lib/workspace/MissionWorkspace.svelte`:

```svelte
<script lang="ts">
	import { Play, RotateCcw, Star } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { appendBlock, findBlock, removeBlock, setParam } from '$lib/blocks/edit';
	import { countBlocks, toPython } from '$lib/blocks/generator';
	import type { BlockNode, BlockType } from '$lib/blocks/types';
	import { t } from '$lib/i18n/de';
	import { isGoalReached } from '$lib/missions/goal';
	import type { Mission } from '$lib/missions/schema';
	import { calcStars, type Stars } from '$lib/missions/stars';
	import type { PythonRunner } from '$lib/runtime/client';
	import type { RunResult } from '$lib/sim/result';
	import DroneStage from '$lib/stage/DroneStage.svelte';
	import { Player } from '$lib/stage/player.svelte';
	import { buildTimeline, startPose } from '$lib/stage/timeline';
	import BlockPalette from './BlockPalette.svelte';
	import ProgramList from './ProgramList.svelte';
	import PythonView from './PythonView.svelte';

	let { mission, runner }: { mission: Mission; runner: PythonRunner } = $props();

	let program = $state<BlockNode[]>([]);
	let runs = $state(0);
	let status = $state<'idle' | 'running' | 'success' | 'fail'>('idle');
	let message = $state<string | null>(null);
	let stars = $state<Stars>(0);
	const player = new Player();

	const python = $derived(toPython(program));
	const activeId = $derived(player.line ? (python.blockAt[player.line] ?? null) : null);

	player.reset(startPose(mission.map.start));

	function edit(next: BlockNode[]) {
		if (status === 'running') return;
		program = next;
		if (status !== 'idle') resetStage();
	}

	function resetStage() {
		player.reset(startPose(mission.map.start));
		status = 'idle';
		message = null;
	}

	function outcomeMessage(result: RunResult): string {
		if (result.stop) return t.stops[result.stop.code];
		if (result.pyError) return result.pyError.message;
		return result.final.flying ? t.outcome.stillFlying : t.outcome.missed;
	}

	async function run() {
		if (status === 'running' || program.length === 0) return;
		resetStage();
		status = 'running';
		runs += 1;
		const result = await runner.run(python.code, mission);
		const finished = await player.play(buildTimeline(mission.map.start, result.events));
		if (!finished) return;
		if (isGoalReached(mission, result)) {
			stars = calcStars({ reached: true, blockCount: countBlocks(program), runs }, mission.stars);
			status = 'success';
			message = t.workspace.success;
		} else {
			status = 'fail';
			message = outcomeMessage(result);
		}
	}
</script>

<div class="grid h-full grid-rows-[auto_1fr] gap-4 bg-sky p-4">
	<header class="flex items-center gap-4 rounded-3xl bg-card px-6 py-4 shadow-sm">
		<span class="rounded-xl bg-drone px-3 py-1 text-lg font-black text-drone-foreground">{mission.id}</span>
		<div class="grow">
			<h1 class="text-2xl font-black">{mission.title}</h1>
			<p class="text-lg text-muted-foreground">{mission.goalText}</p>
		</div>
	</header>

	<div class="grid min-h-0 grid-cols-[minmax(14rem,1fr)_minmax(18rem,1.3fr)_minmax(20rem,1.6fr)] gap-4">
		<div class="min-h-0 overflow-y-auto rounded-3xl bg-card/70 p-4">
			<BlockPalette
				blocks={mission.blocks}
				disabled={status === 'running'}
				onAdd={(type: BlockType) => edit(appendBlock(program, type))}
			/>
		</div>

		<div class="grid min-h-0 grid-rows-[1fr_auto] gap-4 rounded-3xl bg-card/70 p-4">
			<ProgramList
				{program}
				{activeId}
				locked={status === 'running'}
				onRemove={(id) => edit(removeBlock(program, id))}
				onStep={(id, delta) => {
					const node = findBlock(program, id);
					if (node?.n !== undefined) edit(setParam(program, id, node.n + delta));
				}}
			/>
			<PythonView code={python.code} activeLine={player.line} />
		</div>

		<div class="grid min-h-0 grid-rows-[1fr_auto] gap-4 rounded-3xl bg-card/70 p-4">
			<div class="min-h-0">
				<DroneStage rows={mission.map.rows} {player} />
			</div>
			<div class="flex flex-col gap-3">
				{#if message}
					<p
						class="rounded-2xl px-4 py-3 text-center text-xl font-bold {status === 'success'
							? 'bg-emerald-500 text-white'
							: 'bg-amber-100 text-amber-900'}"
					>
						{message}
						{#if status === 'success'}
							<span class="mt-1 flex justify-center gap-1">
								{#each [1, 2, 3] as i (i)}
									<Star class="size-8 {i <= stars ? 'fill-yellow-300 text-yellow-300' : 'text-white/50'}" />
								{/each}
							</span>
						{/if}
					</p>
				{/if}
				<div class="flex gap-3">
					<Button
						class="h-16 grow rounded-2xl bg-drone text-2xl font-black text-drone-foreground active:scale-95"
						disabled={status === 'running' || program.length === 0}
						onclick={run}><Play class="size-7" />{t.workspace.start}</Button
					>
					<Button
						variant="secondary"
						class="h-16 rounded-2xl px-6 text-xl active:scale-95"
						disabled={status === 'running'}
						onclick={resetStage}><RotateCcw class="size-6" />{t.workspace.reset}</Button
					>
				</div>
			</div>
		</div>
	</div>
</div>
```

- [ ] **Step 6: Replace the page**

`src/routes/+page.svelte`:

```svelte
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { t } from '$lib/i18n/de';
	import { SHOWCASE } from '$lib/missions';
	import { PythonRunner } from '$lib/runtime/client';
	import MissionWorkspace from '$lib/workspace/MissionWorkspace.svelte';

	let runner = $state<PythonRunner | null>(null);
	let phase = $state<'loading' | 'ready' | 'failed'>('loading');

	onMount(() => {
		const created = new PythonRunner();
		runner = created;
		created.ready().then(
			() => (phase = 'ready'),
			() => (phase = 'failed')
		);
	});

	onDestroy(() => runner?.dispose());
</script>

{#if phase === 'ready' && runner}
	<MissionWorkspace mission={SHOWCASE[0]} {runner} />
{:else}
	<main class="grid h-full place-items-center bg-sky">
		<p class="animate-pulse text-3xl font-black {phase === 'failed' ? 'animate-none text-destructive' : ''}">
			{phase === 'failed' ? t.app.loadFailed : t.app.loading}
		</p>
	</main>
{/if}
```

- [ ] **Step 7: Static checks**

```bash
npm run check
npm run lint
npm test
npm run build
```

Expected: 0 type errors, lint clean, all tests pass, build succeeds (warnings from Pyodide's Node-only code paths are acceptable).

- [ ] **Step 8: Manual verification in the browser**

Run: `npm run dev` and open `http://localhost:5173`.

Check, in order:
1. "Drohne startet …" shows briefly, then the workspace with header "1.1 Erster Flug".
2. Tap "Abheben", "Vorwärts", "Landen": blocks appear in "Dein Programm"; Python shows `from drone import *`, blank line, `takeoff()`, `forward(1)`, `land()`.
3. Use + on "Vorwärts" until 4; the Python line changes to `forward(4)` live; + is disabled at 9, − at 1.
4. Start: the drone lifts (bigger, shadow shifts), propellers spin, flies 4 cells to the pad, lands; the matching block and Python line glow during each step; green "Geschafft!" with 3 stars.
5. Remove "Landen", Start: amber message "Fast! Vergiss nicht zu landen."
6. Set Vorwärts to 5 (with Abheben only): crash animation (wobble) and "Hoppla – hier ist die Karte zu Ende!".
7. While the drone is flying, Start and all edit buttons are disabled; after a run, any edit resets the drone to the start.
8. Tap one palette block 35 times: the program stops growing at 30 and the list scrolls inside its panel; the page itself does not scroll.
9. Browser dev tools console: no errors (in particular no `DataCloneError`).

- [ ] **Step 9: Manual verification in the desktop app**

Run: `npm run tauri dev`
Expected: the same checks 1–4 pass inside the Tauri window. If Python fails to load ("Python konnte nicht geladen werden"), open the webview dev tools (right-click → Inspect in dev builds) and report the console error to the user before changing anything.

- [ ] **Step 10: Commit**

```bash
npm run format
git add -A
git commit -m "feat(workspace): playable mission 1.1 with blocks, live Python and drone stage

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

## Update point UP1 — what to show the user

After Task 8: `npm run tauri dev` (or `npm run dev` in a browser). Mission 1.1 is playable with real Python. Not yet included (later UPs): drag & drop and bouncy motion, final colours/fonts, more missions, coach, session flow, kiosk behaviour, backend features, leaderboard, mobile builds.
