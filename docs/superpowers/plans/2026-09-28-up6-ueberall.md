# UP6 "Überall" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app shippable on every target: polish the deferred minors that matter at an event, kiosk fullscreen from config, per-platform features, real icons/favicon, a strict CSP verified in a production build, an in-repo Playwright E2E suite, CI (GitLab checks + GitHub release builds incl. Android and updater), desktop self-update from the admin screen, version 1.0.0 and documentation.

**Architecture:** No new subsystems. Platform differences stay behind `src/lib/platform/` (`init()` asks Rust for `platform_info`). The E2E suite ports the scratchpad browser scripts to `@playwright/test`. CI is declarative (`.gitlab-ci.yml`, `.github/workflows/release.yml`).

**Tech Stack:** Tauri 2 (+ plugin-updater, plugin-process), SvelteKit 2, Svelte 5, @playwright/test 1.63, GitLab CI, GitHub Actions (tauri-action), rsvg-convert.

**Spec:** `docs/superpowers/specs/2026-09-28-codinglab-revamp-design.md` (3.5 kiosk/admin, 4.1 platform rule, 5 platforms/build, 6 testing) · **Roadmap:** `docs/superpowers/plans/2026-09-28-codinglab-revamp-roadmap.md`

## Global Constraints

- App identifier `at.htlvillach.codinglab`, `mainBinaryName` `codinglab`, updater public key unchanged; version becomes `1.0.0` in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`.
- The product name is decided by the user at the end — do not rename anything in this plan; keep "CodingLab" as working name.
- No new `invoke` outside `src/lib/platform/`; no `unwrap()`/`expect()` outside tests.
- Visitor texts: German *Einfache Sprache*, tap targets ≥ 56 px.
- Only local commits on `main` (unsigned allowed until the user is home — `git -c commit.gpgsign=false`), message ends with blank line + `Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU`; `npm run format` before each commit.

**Rulings (made while writing this plan):**
- CI: `origin` is GitLab, the old release pipeline was GitHub Actions + GitHub Releases (updater URLs pointed there). Both are provided: GitLab CI for checks/tests/web+Linux artifacts, GitHub Actions for signed multi-OS release builds. Cost if wrong: one unused pipeline file.
- Android/iOS: no Android SDK on this machine; the Android job is CI-only and unverified locally; iOS is not built (no Apple account). Cost if wrong: the first CI run may need fixes.
- Updater endpoint: `https://github.com/137-Trimethylxanthin/HTL-Vill-Codinglab/releases/latest/download/latest.json` (where tauri-action uploads `latest.json`). Cost if wrong: one URL in `tauri.conf.json`.

## Review Focus

1. **Production build (custom protocol origin)** — Pyodide must load under `tauri://localhost` / `http://tauri.localhost` with the strict CSP. Pinned by Task 5's release-binary check.
2. **Phone target without file access** — the certificate button must not appear where saving cannot work (mobile). Pinned by web/tauri platform `init()` tests (Task 3).
3. **Fullscreen kiosk toggled off in admin** — the operator can leave fullscreen without restarting, and it persists. Pinned by config tests (Task 2) and manual check (Task 5).
4. **Update offered during a visit** — updates are only started from the PIN-protected admin screen, never automatically mid-session. Pinned by Task 7 (no auto-check).
5. **E2E suite flakiness** — every test waits for the 350 ms settle guard and uses the fake clock for idle; the suite passes twice in a row. Pinned by Task 6 Step 4.

---

### Task 1: Polish — the deferred minors that matter at an event

**Files:**
- Modify: `src/lib/session/kiosk.ts`, `src/lib/session/session.svelte.ts`, `src/lib/config/station.svelte.ts`, `src-tauri/src/secrets.rs`, `src-tauri/src/emails.rs`, `src/lib/screens/Finale.svelte`, `src/lib/screens/OnScreenKeyboard.svelte`, `src/lib/i18n/de.ts`, `src/routes/+page.svelte`
- Test: `src/lib/session/kiosk.test.ts`, `src/lib/session/session.test.ts`, `src/lib/config/station.test.ts`, `src-tauri/src/secrets.rs`, `src-tauri/src/emails.rs`

**Interfaces:**
- Produces: `Session.startedAtMs` getter; `configKey(config: PublicConfig): string` in `station.svelte.ts`; `DEFAULT_PUBLIC_CONFIG.hasPin = false`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/session/kiosk.test.ts` inside `describe('isBlockedKey', …)`:

```ts
	it('blocks ctrl+shift browser shortcuts too', () => {
		for (const k of ['W', 'N', 'T', 'P', '+']) {
			expect(isBlockedKey(key(k, { ctrlKey: true, shiftKey: true })), k).toBe(true);
		}
		expect(isBlockedKey(key('A', { ctrlKey: true, shiftKey: true }))).toBe(false);
	});
```

Add to `src/lib/session/session.test.ts` inside the describe:

```ts
	it('exposes when the visit started', () => {
		const { s } = atMap();
		expect(s.startedAtMs).toBe(1000);
		s.reset('quit');
		expect(s.startedAtMs).toBe(0);
	});
```

Add to `src/lib/config/station.test.ts`:

```ts
import { configKey } from './station.svelte';

describe('configKey', () => {
	it('changes only when settings change', () => {
		const a = { ...DEFAULT_PUBLIC_CONFIG };
		expect(configKey(a)).toBe(configKey({ ...a }));
		expect(configKey(a)).not.toBe(configKey({ ...a, idleSeconds: 30 }));
	});

	it('defaults to "no PIN yet" so a failed load still allows setup', () => {
		expect(DEFAULT_PUBLIC_CONFIG.hasPin).toBe(false);
	});
});
```

Add to the tests in `src-tauri/src/secrets.rs`:

```rust
    #[cfg(unix)]
    #[test]
    fn is_never_readable_by_others_even_briefly() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        write_secret(dir.path(), "x", "1").unwrap();
        write_secret(dir.path(), "x", "2").unwrap();
        let mode = std::fs::metadata(dir.path().join("x")).unwrap().permissions().mode();
        assert_eq!(mode & 0o077, 0);
    }
```

Add to the tests in `src-tauri/src/emails.rs`:

```rust
    #[cfg(unix)]
    #[test]
    fn email_file_is_private() {
        use std::os::unix::fs::PermissionsExt;
        let dir = tempfile::tempdir().unwrap();
        EmailStore::new(dir.path()).append(&entry("Lea", "lea@example.org")).unwrap();
        let mode = std::fs::metadata(dir.path().join("emails.jsonl")).unwrap().permissions().mode();
        assert_eq!(mode & 0o077, 0);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/session src/lib/config; (cd src-tauri && cargo test 2>&1 | grep -E "test result|FAILED" | head -3)`
Expected: FAIL (Ctrl+Shift keys pass through, `startedAtMs` undefined, `configKey` missing, `hasPin` true, file modes 0644).

- [ ] **Step 3: Implement**

`src/lib/session/kiosk.ts` — replace the Ctrl+Shift line in `isBlockedKey` with:

```ts
	if (ctrl && e.shiftKey && ((DEVTOOLS.has(k) && !dev) || k === 'r' || k === 'delete')) return true;
```

(the function then continues to `return ctrl && CTRL_BLOCKED.has(k);`, which also covers Ctrl+Shift+W/N/T/P/+; `a` is not in the set).

`src/lib/session/session.svelte.ts` — add after `get maxStars()`:

```ts
	get startedAtMs(): number {
		return this.startedAt;
	}
```

`src/lib/config/station.svelte.ts` — set `hasPin: false` in `DEFAULT_PUBLIC_CONFIG` and add:

```ts
/** Compare settings cheaply (admin closed without changes must not reset the visitor). */
export function configKey(config: PublicConfig): string {
	return JSON.stringify(config);
}
```

`src-tauri/src/secrets.rs` — replace `write_secret` with a version that creates the file private from the start:

```rust
pub fn write_secret(dir: &Path, name: &str, value: &str) -> AppResult<()> {
    use std::io::Write;
    std::fs::create_dir_all(dir)?;
    let mut options = std::fs::OpenOptions::new();
    options.write(true).create(true).truncate(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(dir.join(name))?;
    file.write_all(value.as_bytes())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(dir.join(name), std::fs::Permissions::from_mode(0o600))?;
    }
    Ok(())
}
```

`src-tauri/src/emails.rs` — in `append`, build the `OpenOptions` like above (`#[cfg(unix)] options.mode(0o600)`), i.e.:

```rust
        let mut options = std::fs::OpenOptions::new();
        options.create(true).append(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options.open(&self.path)?;
```

`src/lib/screens/Finale.svelte` — QR fallback: change the QR `onMount` to `qrDataUrl(config.qrUrl || HTL_URL).then((url) => (qr = url), () => (qr = ''));` and render the URL as text when `qr` is empty:

```svelte
			{#if qr}<img src={qr} alt={config.qrUrl || HTL_URL} class="size-full" />{:else}<p
					class="text-center font-mono text-lg break-all">{config.qrUrl || HTL_URL}</p
				>{/if}
```

and in `openBoard` use the real start: `startedAt: session.startedAtMs || Date.now() - 1,`.

`src/lib/screens/OnScreenKeyboard.svelte` — email mode extras become `['@', '.', '-', '_', '+']`.

`src/lib/i18n/de.ts` — promo sentence: `'Du steuerst hier echte Maschinen.'` instead of `'Du lernst, echte Maschinen zu steuern.'`.

`src/routes/+page.svelte` — only reset the visitor when the admin changed settings: import `configKey`, keep `let lastConfig = '';`, set `lastConfig = configKey(station.config)` at the end of `applyConfig()`, and in the admin `onClose` call `if (configKey(station.config) !== lastConfig) applyConfig();` instead of `applyConfig()` unconditionally.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test && (cd src-tauri && cargo test 2>&1 | grep "test result" | head -1)`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run check && npm run lint
npm run format
git add -A
git -c commit.gpgsign=false commit -m "fix: kiosk shortcuts, private secret files, QR fallback and gentler admin close

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 2: Kiosk fullscreen from the station config

**Files:**
- Modify: `src-tauri/src/config.rs`, `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`, `src/lib/platform/types.ts`, `src/lib/platform/web.ts`, `src/lib/config/station.svelte.ts`, `src/lib/admin/AdminScreen.svelte`, `src/lib/i18n/de.ts`
- Test: `src-tauri/src/config.rs`, `src/lib/platform/web.test.ts`

**Interfaces:**
- Produces: `StationConfig.fullscreen: bool` (default true) / `EditableConfig.fullscreen: boolean`; the main window follows it at startup and after `save_config`.

- [ ] **Step 1: Write the failing tests**

Rust (config tests):

```rust
    #[test]
    fn is_fullscreen_by_default_and_can_be_turned_off() {
        let mut cfg = StationConfig::default();
        assert!(cfg.fullscreen);
        let mut e = cfg.editable();
        e.fullscreen = false;
        cfg.apply(e);
        assert!(!cfg.fullscreen);
    }
```

TS (`web.test.ts`, inside the describe):

```ts
	it('stores the fullscreen choice', async () => {
		const storage = new MemoryStorage();
		const p = createWebPlatform(storage);
		await p.setPin(null, '2468');
		const cfg = await p.getConfig();
		expect(cfg.fullscreen).toBe(true);
		const saved = await p.saveConfig('2468', { ...cfg, fullscreen: false });
		expect(saved.fullscreen).toBe(false);
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `(cd src-tauri && cargo test config 2>&1 | grep -E "^error" | head -2); npm test -- src/lib/platform/web`
Expected: FAIL — field missing.

- [ ] **Step 3: Implement**

Rust `config.rs`: add `pub fullscreen: bool,` to `StationConfig` and `EditableConfig` (after `idle_seconds`), default `fullscreen: true,`, `editable()` copies it, `apply()` sets `self.fullscreen = e.fullscreen;`.

Rust `commands.rs` — add a helper and call it at the end of `save_config` (before returning), giving the command an `app: AppHandle` parameter:

```rust
pub fn apply_window(app: &AppHandle, cfg: &StationConfig) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_fullscreen(cfg.fullscreen);
    }
}
```

(`save_config` becomes `pub fn save_config(app: AppHandle, state: State<'_, AppState>, pin: String, config: EditableConfig)` and calls `apply_window(&app, &cfg);` after saving.)

Rust `lib.rs` — at the end of `setup`, before `Ok(())`: `if let Ok(cfg) = config_for_window.lock() { commands::apply_window(app.handle(), &cfg); }` where `config_for_window` is a clone of the `Arc<Mutex<StationConfig>>` taken before it is moved into `AppState` (on mobile `set_fullscreen` is a no-op error that is ignored).

TS: add `fullscreen: boolean;` to `EditableConfig` (after `idleSeconds`), `fullscreen: c.fullscreen,` to `editableOf`, `fullscreen: true,` to the web defaults and to `DEFAULT_PUBLIC_CONFIG`.

`de.ts` `admin` section: `fullscreen: 'Vollbild (Kiosk-Modus)',`.

`AdminScreen.svelte`, Station section, after the idle field:

```svelte
				<label class="flex items-center gap-3 text-lg"
					><input type="checkbox" class="size-6" bind:checked={form.fullscreen} />{t.admin.fullscreen}</label
				>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `(cd src-tauri && cargo test 2>&1 | grep "test result" | head -1); npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run check && npm run lint
npm run format
git add -A
git -c commit.gpgsign=false commit -m "feat(kiosk): fullscreen follows the station config

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 3: Per-platform features

**Files:**
- Modify: `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`, `src/lib/platform/types.ts`, `src/lib/platform/tauri.ts`, `src/lib/platform/web.ts`, `src/routes/+page.svelte`
- Test: `src/lib/platform/web.test.ts`, `src/lib/platform/tauri.test.ts`

**Interfaces:**
- Produces: Tauri command `platform_info() -> { mobile: bool, os: string }`; `Platform.init(): Promise<void>` — after it, `features.certificate` is `false` on mobile (no file save there yet), `true` on desktop; web unchanged (both false).

- [ ] **Step 1: Write the failing tests**

`src/lib/platform/tauri.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(async (cmd: string) => {
		if (cmd === 'platform_info') return { mobile: true, os: 'android' };
		throw { code: 'wrongPin', message: 'Die PIN stimmt nicht.' };
	})
}));

import { PlatformError } from './types';
import { createTauriPlatform } from './tauri';

describe('tauri platform', () => {
	it('turns off the certificate on phones after init', async () => {
		const p = createTauriPlatform();
		expect(p.features.certificate).toBe(true);
		await p.init();
		expect(p.features).toEqual({ certificate: false, email: true });
	});

	it('maps backend errors to PlatformError', async () => {
		const p = createTauriPlatform();
		await expect(p.verifyPin('0000')).rejects.toMatchObject({ code: 'wrongPin' });
		await expect(p.verifyPin('0000')).rejects.toBeInstanceOf(PlatformError);
	});
});
```

Add to `web.test.ts` inside the describe:

```ts
	it('has a no-op init', async () => {
		const p = createWebPlatform(new MemoryStorage());
		await p.init();
		expect(p.features).toEqual({ certificate: false, email: false });
	});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/platform`
Expected: FAIL — `init` missing.

- [ ] **Step 3: Implement**

`types.ts`: add `init(): Promise<void>;` to `Platform`.

`tauri.ts`: make `features` a mutable object and add `init`:

```ts
export function createTauriPlatform(): Platform {
	const features = { certificate: true, email: true };
	return {
		kind: 'tauri',
		features,
		init: async () => {
			const info = await call<{ mobile: boolean; os: string }>('platform_info').catch(() => null);
			if (info?.mobile) features.certificate = false;
		},
		// … the existing methods unchanged …
	};
}
```

`web.ts`: add `init: async () => {},`.

Rust `commands.rs`:

```rust
#[derive(serde::Serialize)]
pub struct PlatformInfo {
    pub mobile: bool,
    pub os: &'static str,
}

#[tauri::command]
pub fn platform_info() -> PlatformInfo {
    PlatformInfo { mobile: cfg!(mobile), os: std::env::consts::OS }
}
```

and register `commands::platform_info` in `lib.rs`.

`+page.svelte`: in `onMount`, run `platform.init()` before loading the station: `platform.init().then(() => station.load(platform)).then(() => { … })`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test && (cd src-tauri && cargo build 2>&1 | tail -1)`
Expected: PASS / builds.

- [ ] **Step 5: Commit**

```bash
npm run check && npm run lint
npm run format
git add -A
git -c commit.gpgsign=false commit -m "feat(platform): per-platform features via platform_info

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 4: App icon, favicon

**Files:**
- Create: `src-tauri/icons/source.svg`, `static/favicon.png`
- Modify: generated `src-tauri/icons/*`, `src/app.html`

- [ ] **Step 1: Draw the icon**

`src-tauri/icons/source.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" rx="224" fill="#2a4a9e"/>
  <g transform="translate(512 540)">
    <g stroke="#0f172a" stroke-width="56" stroke-linecap="round">
      <line x1="-210" y1="-210" x2="210" y2="210"/>
      <line x1="210" y1="-210" x2="-210" y2="210"/>
    </g>
    <g fill="#e2e8f0" fill-opacity="0.85">
      <circle cx="-210" cy="-210" r="118"/><circle cx="210" cy="-210" r="118"/>
      <circle cx="-210" cy="210" r="118"/><circle cx="210" cy="210" r="118"/>
    </g>
    <g fill="#334155">
      <rect x="-310" y="-218" width="200" height="16" rx="8"/><rect x="110" y="-218" width="200" height="16" rx="8"/>
      <rect x="-310" y="202" width="200" height="16" rx="8"/><rect x="110" y="202" width="200" height="16" rx="8"/>
    </g>
    <rect x="-130" y="-130" width="260" height="260" rx="72" fill="#f97316"/>
    <circle cx="0" cy="-70" r="30" fill="#ffffff"/>
  </g>
</svg>
```

- [ ] **Step 2: Generate icons and favicon**

```bash
rsvg-convert -w 1024 -h 1024 src-tauri/icons/source.svg -o /tmp/codinglab-icon.png
npx tauri icon /tmp/codinglab-icon.png
rsvg-convert -w 64 -h 64 src-tauri/icons/source.svg -o static/favicon.png
```

In `src/app.html` add inside `<head>`: `<link rel="icon" href="%sveltekit.assets%/favicon.png" />`.

- [ ] **Step 3: Verify**

Look at `src-tauri/icons/128x128.png` (Read tool). `npm run dev` + headless Chromium: no 404 in the console any more (`/favicon.png` 200).

- [ ] **Step 4: Commit**

```bash
npm run format
git add -A
git -c commit.gpgsign=false commit -m "feat: drone app icon and favicon

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 5: Strict CSP, updater artifacts, version 1.0.0, production build check

**Files:**
- Modify: `src-tauri/tauri.conf.json`, `package.json`, `src-tauri/Cargo.toml`

- [ ] **Step 1: Configure**

In `src-tauri/tauri.conf.json`:
- `"version": "1.0.0"`
- `app.security.csp`: `"default-src 'self' ipc: http://ipc.localhost; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self' ipc: http://ipc.localhost"`
- `bundle.createUpdaterArtifacts`: `true`
- `plugins.updater.endpoints`: `["https://github.com/137-Trimethylxanthin/HTL-Vill-Codinglab/releases/latest/download/latest.json"]`

Set `"version": "1.0.0"` in `package.json` and `version = "1.0.0"` in `src-tauri/Cargo.toml`.

- [ ] **Step 2: Build a release binary (no bundle)**

```bash
npm run tauri build -- --no-bundle 2>&1 | tail -5
```

Expected: `src-tauri/target/release/codinglab` exists. (Bundling with updater artifacts needs `TAURI_SIGNING_PRIVATE_KEY`, which only CI has.)

- [ ] **Step 3: Run it with a scratch data dir and a known PIN**

Create a PIN hash for `2468` with a one-off test in `src-tauri/src/admin.rs`:

```rust
    #[test]
    #[ignore = "prints a PIN hash for manual checks: cargo test print_pin_hash -- --ignored --nocapture"]
    fn print_pin_hash() {
        println!("{}", hash_pin("2468").unwrap());
    }
```

Then:

```bash
SCRATCH_DATA=<scratchpad>/xdg-data
mkdir -p "$SCRATCH_DATA/at.htlvillach.codinglab"
(cd src-tauri && cargo test print_pin_hash -- --ignored --nocapture 2>/dev/null | grep '^\$argon2') > "$SCRATCH_DATA/at.htlvillach.codinglab/admin.pin"
XDG_DATA_HOME="$SCRATCH_DATA" src-tauri/target/release/codinglab &
```

Take a window screenshot (Hyprland: `hyprctl clients -j` for geometry, `grim -g`). Expected: the attract screen ("Tippe zum Starten") — it only appears after Python reported ready, so Pyodide loaded under the production origin with the strict CSP, and the window is fullscreen (config default). Stop the process afterwards. If Python fails ("Python konnte nicht geladen werden"), find the blocked directive (run the same binary with `WEBKIT_INSPECTOR_SERVER` or temporarily `"csp": null`) and adjust the CSP; record a ruling.

- [ ] **Step 4: Commit**

```bash
npm run format
git add -A
git -c commit.gpgsign=false commit -m "chore: version 1.0.0, strict CSP, updater artifacts

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 6: Playwright E2E suite in the repo

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/helpers.ts`, `tests/e2e/visit.spec.ts`, `tests/e2e/blocks.spec.ts`, `tests/e2e/admin.spec.ts`, `tests/e2e/phone.spec.ts`
- Modify: `package.json` (`e2e` script, dev dependency), `vite.config.ts` (exclude `tests/e2e` from vitest), `.gitignore` (`/test-results`, `/playwright-report`)

**Interfaces:**
- Produces: `npm run e2e` (starts `npm run dev` on 5173 if not running).

- [ ] **Step 1: Setup**

```bash
npm install -D @playwright/test@1.63.0
```

`package.json` scripts: `"e2e": "playwright test"`.

`.gitignore`: add `/test-results` and `/playwright-report`.

`vite.config.ts` test project: `exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', 'tests/e2e/**']` (the include only covers `src/**` already, so this is belt and braces).

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM || undefined;

export default defineConfig({
	testDir: 'tests/e2e',
	timeout: 90_000,
	retries: process.env.CI ? 1 : 0,
	use: { baseURL: 'http://localhost:5173', launchOptions: { executablePath } },
	webServer: { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true, timeout: 120_000 },
	projects: [
		{ name: 'desktop', use: { viewport: { width: 1280, height: 800 } }, testIgnore: /phone/ },
		{ name: 'phone', use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } }, testMatch: /phone/ }
	]
});
```

`tests/e2e/helpers.ts`:

```ts
import { createHash } from 'node:crypto';
import type { Locator, Page } from '@playwright/test';

export const PIN = '2468';

/** PIN 2468 pre-set in the web platform's storage (skips the forced first-start setup). */
export async function seedStation(page: Page, overrides: Record<string, unknown> = {}) {
	const salt = 'seed-salt';
	const pinHash = createHash('sha256').update(salt + PIN).digest('hex');
	const stored = {
		stationId: '00000000-0000-4000-8000-000000000000',
		config: {
			stationName: 'Station TEST',
			eventCode: '',
			syncEnabled: false,
			idleSeconds: 90,
			fullscreen: true,
			enabledMissions: null,
			qrUrl: 'https://www.htl-villach.at',
			nameRetentionDays: 7,
			manualPeers: [],
			smtp: { host: '', port: 587, username: '', from: '', starttls: true },
			...overrides
		},
		pinSalt: salt,
		pinHash
	};
	await page.addInitScript((value) => {
		if (!localStorage.getItem('codinglab.station')) localStorage.setItem('codinglab.station', value);
	}, JSON.stringify(stored));
}

/** Screens ignore taps for 350 ms after they appear (double-tap guard). */
export const settle = (page: Page) => page.waitForTimeout(400);

export async function toMap(page: Page) {
	await page.goto('/');
	await page.getByText('Tippe zum Starten').waitFor({ timeout: 60_000 });
	await settle(page);
	await page.mouse.click(page.viewportSize()!.width / 2, page.viewportSize()!.height / 2);
	await page.getByRole('button', { name: "Los geht's!" }).waitFor();
	await settle(page);
	await page.getByRole('button', { name: "Los geht's!" }).click();
	await page.getByText('Level 1').waitFor();
	await settle(page);
}

export async function openMission(page: Page, title: string) {
	await page.locator('main section button', { hasText: title }).click();
	await page.locator('[data-drop-trash]').waitFor();
	await settle(page);
}

export const palette = (page: Page, label: string) => page.locator('[data-drop-trash] button', { hasText: label });

async function center(loc: Locator) {
	const r = (await loc.boundingBox())!;
	return [r.x + r.width / 2, r.y + r.height / 2] as const;
}

/** Drag like a person: move, then keep aiming at the target while the layout settles. */
export async function dragTo(page: Page, from: Locator, to: Locator) {
	const [ax, ay] = await center(from);
	await page.mouse.move(ax, ay);
	await page.mouse.down();
	await page.mouse.move(ax + 20, ay + 10, { steps: 4 });
	for (let k = 0; k < 4; k++) {
		const [bx, by] = await center(to);
		await page.mouse.move(bx, by, { steps: k === 0 ? 14 : 4 });
		await page.waitForTimeout(250);
	}
	await page.mouse.up();
	await page.waitForTimeout(500);
}

export async function solveFirstFlight(page: Page) {
	await palette(page, 'Abheben').click();
	await palette(page, 'Vorwärts').click();
	await palette(page, 'Landen').click();
	const more = page.locator('[data-drop-panel] ol').getByRole('button', { name: 'Mehr' }).first();
	for (let i = 0; i < 3; i++) await more.click();
	await page.getByRole('button', { name: 'Start' }).click();
	await page.getByText('Geschafft').waitFor({ timeout: 30_000 });
}
```

- [ ] **Step 2: Specs**

`tests/e2e/visit.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { openMission, seedStation, settle, solveFirstFlight, toMap } from './helpers';

test.beforeEach(async ({ page }) => {
	await seedStation(page);
});

test('a visitor plays to the finale and sees the leaderboard', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(String(e)));
	await toMap(page);
	await openMission(page, 'Erster Flug');
	await solveFirstFlight(page);
	await page.getByRole('button', { name: 'Weiter' }).click();
	await expect(page.getByText('Perfekt!')).toBeVisible();
	await settle(page);
	await page.getByRole('button', { name: 'Zur Karte' }).click();
	await settle(page);
	await page.getByRole('button', { name: 'Fertig' }).click();
	await expect(page.getByText(/Super,/)).toBeVisible();
	await expect(page.getByText('3 / 21')).toBeVisible();
	await page.getByRole('button', { name: 'Bestenliste' }).click();
	await expect(page.locator('ol li.bg-drone')).toHaveCount(1);
	expect(errors).toEqual([]);
});

test('an idle visitor is reset after the countdown', async ({ page }) => {
	await page.clock.install();
	await toMap(page);
	await page.clock.runFor(90_500);
	await expect(page.getByText('Bist du noch da?')).toBeVisible();
	await page.clock.runFor(10_500);
	await expect(page.getByText('Tippe zum Starten')).toBeVisible();
});

test('a double tap does not skip the map', async ({ page }) => {
	await page.goto('/');
	await page.getByText('Tippe zum Starten').waitFor({ timeout: 60_000 });
	await settle(page);
	await page.mouse.click(640, 400);
	const go = page.getByRole('button', { name: "Los geht's!" });
	await go.waitFor();
	await settle(page);
	await go.dblclick();
	await expect(page.getByText('Level 1')).toBeVisible();
});
```

`tests/e2e/blocks.spec.ts`:

```ts
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
	await dragTo(page, palette(page, 'Wiederhole'), page.locator('[data-drop-panel] ol[data-drop-slot]').first());
	await dragTo(page, palette(page, 'Vorwärts'), loopBody(page));
	expect(await python(page)).toMatch(/for i in range\(2\):\n\d+ {4}forward\(1\)/);
});

test('dropping a block on the palette removes it', async ({ page }) => {
	await palette(page, 'Abheben').click();
	await palette(page, 'Landen').click();
	const last = page.locator('[data-drop-panel] ol[data-drop-slot]').first().locator(':scope > li[data-block-id]').last();
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
```

`tests/e2e/admin.spec.ts`:

```ts
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
	for (const title of ['3.1 · Nebel', '3.2 · Rettungsflug']) await page.locator('label', { hasText: title }).locator('input').uncheck();
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
```

`tests/e2e/phone.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { openMission, seedStation, settle, toMap } from './helpers';

test.beforeEach(async ({ page }) => {
	await seedStation(page);
});

test('the name keyboard fits a phone', async ({ page }) => {
	await page.goto('/');
	await page.getByText('Tippe zum Starten').waitFor({ timeout: 60_000 });
	await settle(page);
	await page.mouse.click(195, 500);
	await page.getByRole('button', { name: 'Eigener Name' }).click();
	const offscreen = await page.evaluate(() =>
		[...document.querySelectorAll('button')].filter((b) => {
			const r = b.getBoundingClientRect();
			return r.width > 0 && (r.left < 0 || r.right > innerWidth);
		}).length
	);
	expect(offscreen).toBe(0);
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('the workspace fits a phone', async ({ page }) => {
	await toMap(page);
	await openMission(page, 'Erster Flug');
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
	const stage = (await page.locator('svg[role="img"]').boundingBox())!;
	const palette = (await page.locator('[data-drop-trash]').boundingBox())!;
	expect(stage.y).toBeLessThan(palette.y);
});
```

- [ ] **Step 3: Run**

```bash
PLAYWRIGHT_CHROMIUM=$HOME/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome npm run e2e
```

Expected: all specs pass in both projects.

- [ ] **Step 4: Run again (flakiness check)**

Same command a second time. Expected: all pass again. Fix any timing-dependent test by waiting for a visible state instead of fixed timeouts.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git -c commit.gpgsign=false commit -m "test(e2e): Playwright suite for visit, blocks, admin and phone

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 7: Updater in admin, CI pipelines

**Files:**
- Modify: `src-tauri/Cargo.toml`, `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `package.json`, `src/lib/platform/types.ts`, `src/lib/platform/tauri.ts`, `src/lib/platform/web.ts`, `src/lib/admin/AdminScreen.svelte`, `src/lib/i18n/de.ts`
- Create: `.gitlab-ci.yml`, `.github/workflows/release.yml`
- Test: `src/lib/platform/web.test.ts`

**Interfaces:**
- Produces: `Platform.appVersion(): Promise<string>`, `Platform.checkUpdate(): Promise<string | null>` (new version or null), `Platform.installUpdate(): Promise<void>` (downloads, installs, relaunches); web: version from `package.json` via `import.meta.env`, no updates.

- [ ] **Step 1: Failing test**

Add to `web.test.ts` inside the describe:

```ts
	it('reports a version and never offers updates', async () => {
		const p = createWebPlatform(new MemoryStorage());
		expect(await p.appVersion()).toMatch(/^\d+\.\d+\.\d+/);
		expect(await p.checkUpdate()).toBeNull();
	});
```

Run: `npm test -- src/lib/platform/web` → FAIL.

- [ ] **Step 2: Implement**

```bash
npm install @tauri-apps/plugin-updater @tauri-apps/plugin-process
```

`src-tauri/Cargo.toml` (desktop-only section already exists for the updater): ensure

```toml
[target.'cfg(not(any(target_os = "android", target_os = "ios")))'.dependencies]
tauri-plugin-updater = "2"
tauri-plugin-process = "2"
```

`lib.rs` — after `.plugin(tauri_plugin_dialog::init())`:

```rust
        .setup(|app| {
            #[cfg(desktop)]
            {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
                app.handle().plugin(tauri_plugin_process::init())?;
            }
            // … existing setup body …
```

(merge into the existing `setup` closure — plugins first, then the state).

`capabilities/default.json` stays unchanged. Add a second capability file `src-tauri/capabilities/desktop.json` for the desktop-only plugins, so mobile builds do not reference them:

```json
{
	"$schema": "../gen/schemas/desktop-schema.json",
	"identifier": "desktop",
	"platforms": ["linux", "macOS", "windows"],
	"windows": ["main"],
	"permissions": ["updater:default", "process:allow-restart"]
}
```

`vite.config.ts`: `define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0') }` and in `src/app.d.ts` `declare const __APP_VERSION__: string;`.

`types.ts` Platform additions:

```ts
	appVersion(): Promise<string>;
	checkUpdate(): Promise<string | null>;
	installUpdate(): Promise<void>;
```

`web.ts`:

```ts
		appVersion: async () => __APP_VERSION__,
		checkUpdate: async () => null,
		installUpdate: unsupported,
```

`tauri.ts`:

```ts
		appVersion: async () => (await import('@tauri-apps/api/app')).getVersion(),
		checkUpdate: async () => {
			const { check } = await import('@tauri-apps/plugin-updater');
			const update = await check().catch(() => null);
			return update?.version ?? null;
		},
		installUpdate: async () => {
			const { check } = await import('@tauri-apps/plugin-updater');
			const { relaunch } = await import('@tauri-apps/plugin-process');
			const update = await check();
			if (!update) return;
			await update.downloadAndInstall();
			await relaunch();
		},
```

`de.ts` `admin`: `version: (v: string) => \`Version ${v}\``, `checkUpdate: 'Nach Updates suchen'`, `noUpdate: 'Die App ist aktuell.'`, `updateFound: (v: string) => \`Update ${v} verfügbar.\``, `installUpdate: 'Update installieren'`.

`AdminScreen.svelte`: a section at the end with the version (`platform.appVersion()` loaded in `openSettings`), "Nach Updates suchen" (sets a status via `platform.checkUpdate()`), and — when a version was found — "Update installieren" (`platform.installUpdate()`); only on `platform.kind === 'tauri'`.

- [ ] **Step 3: CI files**

`.gitlab-ci.yml`:

```yaml
stages: [check, test, build]

default:
  image: node:22
  cache:
    key: npm
    paths: [.npm/]
  before_script:
    - npm ci --cache .npm --prefer-offline

lint:
  stage: check
  script:
    - npm run check
    - npm run lint

unit:
  stage: test
  script:
    - npm test

rust:
  stage: test
  image: rust:1
  before_script:
    - apt-get update && apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf nodejs npm
    - npm ci
    - rustup component add clippy
  script:
    - cd src-tauri && cargo test && cargo clippy --all-targets -- -D warnings

e2e:
  stage: test
  image: mcr.microsoft.com/playwright:v1.63.0-noble
  script:
    - npx playwright test
  artifacts:
    when: on_failure
    paths: [playwright-report/]

web:
  stage: build
  script:
    - npm run build
  artifacts:
    paths: [build/]
    expire_in: 30 days

linux:
  stage: build
  image: rust:1
  before_script:
    - apt-get update && apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf nodejs npm
    - npm ci
  script:
    - npm run tauri build -- --no-bundle
  artifacts:
    paths: [src-tauri/target/release/codinglab]
    expire_in: 30 days
```

`.github/workflows/release.yml`:

```yaml
name: release

on:
  workflow_dispatch:
  push:
    branches: [release]

jobs:
  desktop:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: ubuntu-22.04
          - platform: windows-latest
          - platform: macos-latest
            args: --target universal-apple-darwin
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - if: matrix.platform == 'ubuntu-22.04'
        run: sudo apt-get update && sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
      - uses: actions/setup-node@v4
        with: { node-version: lts/*, cache: npm }
      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}
      - uses: swatinem/rust-cache@v2
        with: { workspaces: './src-tauri -> target' }
      - run: npm ci
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
          TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
        with:
          tagName: v__VERSION__
          releaseName: CodingLab v__VERSION__
          releaseDraft: true
          includeUpdaterJson: true
          args: ${{ matrix.args }}

  android:
    runs-on: ubuntu-22.04
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: lts/*, cache: npm }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '17' }
      - uses: android-actions/setup-android@v3
      - run: sdkmanager "ndk;27.0.12077973"
      - uses: dtolnay/rust-toolchain@stable
        with: { targets: 'aarch64-linux-android,armv7-linux-androideabi,i686-linux-android,x86_64-linux-android' }
      - run: npm ci
      - run: npx tauri android init
        env: { NDK_HOME: '${{ env.ANDROID_HOME }}/ndk/27.0.12077973' }
      - run: npx tauri android build --apk
        env: { NDK_HOME: '${{ env.ANDROID_HOME }}/ndk/27.0.12077973' }
      - uses: actions/upload-artifact@v4
        with:
          name: android-apk
          path: src-tauri/gen/android/app/build/outputs/apk/**/*.apk
```

- [ ] **Step 4: Verify**

```bash
npm test
(cd src-tauri && cargo build 2>&1 | tail -1 && cargo clippy --all-targets 2>&1 | grep -cE "^(warning|error)")
npm run check && npm run lint
```

Expected: pass, builds, 0 clippy findings. Validate YAML syntax: `python3 -c "import yaml,sys; [yaml.safe_load(open(f)) for f in ['.gitlab-ci.yml','.github/workflows/release.yml']]"`.

- [ ] **Step 5: Commit**

```bash
npm run format
git add -A
git -c commit.gpgsign=false commit -m "feat(release): admin updater, GitLab CI and GitHub release builds incl. Android

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

### Task 8: Documentation

**Files:**
- Modify: `README.md` (replace)
- Create: `docs/BETRIEB.md` (operator guide), `docs/MISSIONEN.md` (how to add missions)
- Modify: `docs/superpowers/plans/2026-09-28-codinglab-revamp-roadmap.md` (mark UP6 done)

- [ ] **Step 1: Write the docs**

`README.md` — sections: what CodingLab is (2 sentences), screenshot line, requirements (Rust, Node 22+), `npm install`, `npm run tauri dev`, `npm run dev` (browser), tests (`npm test`, `cargo test`, `npm run e2e`), builds (`npm run tauri build`, web `npm run build`), project layout (one line per `src/lib/*` folder and `src-tauri/src/*` module), links to `docs/BETRIEB.md` and `docs/MISSIONEN.md`, license/credits (Noto Sans license file).

`docs/BETRIEB.md` (German, for the open day): first start and PIN; opening admin (Ctrl+Shift+A, hold "HTL VILLACH" 3 s); **set an event code on every station of the same event** (stations only share results with the same code; without a code any CodingLab on the network can send results); fullscreen toggle; idle time; mission selection; SMTP setup + test mail; certificates are saved in the app data folder (`~/.local/share/at.htlvillach.codinglab/certificates` on Linux, `%APPDATA%\at.htlvillach.codinglab\certificates` on Windows) — print them from there; email export (CSV) and deleting; Logbuch; name retention; manual peers for phones/tablets; updating; what to do when a station freezes (restart; nothing is lost).

`docs/MISSIONEN.md`: mission JSON fields (from the schema), tile characters, the "complete everything, then land" goal rule, stars, hints in Einfache Sprache, how the reference solution is checked by `npm test`, adding the file to `src/lib/missions/index.ts`.

- [ ] **Step 2: Commit**

```bash
npm run format
git add -A
git -c commit.gpgsign=false commit -m "docs: README, operator guide and mission guide

Claude-Session: https://claude.ai/code/session_017xQ3M6V9aXLpfdmRQgnmbU"
```

---

## Update point UP6 — what to show the user

Version 1.0.0: `npm run tauri dev` or the release binary; icons; fullscreen kiosk; admin updater; `npm run e2e`; CI pipelines ready (need secrets: `TAURI_SIGNING_PRIVATE_KEY`, Android signing later). Then: final product name + rename (user decision), English translation, Phase 2 Lern mode.
