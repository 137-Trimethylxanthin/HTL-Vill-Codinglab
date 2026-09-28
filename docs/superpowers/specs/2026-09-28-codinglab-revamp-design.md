# CodingLab Revamp — Design Spec (Phase 1: Engine + Showcase Mode)

**Date:** 2026-09-28
**Status:** Approved 2026-09-28 · Revised 2026-09-28: peer-to-peer sync replaces host/client leaderboard; session history + statistics added; product name decided at the end (working name: CodingLab)
**Scope:** Complete rewrite of the CodingLab app. Phase 1 delivers the shared engine and Showcase mode. Phase 2 (Lern mode) is described only as far as the architecture must support it; it gets its own spec.

---

## 1. Goal and audience

**Primary goal:** Promote HTL Villach to 14–15-year-olds (Hauptschule / Gymnasium) at the Tag der offenen Tür. After ~12 minutes a visitor should leave with the feeling *"I programmed a drone in real Python — I could do this here."* The app must also teach the actual basics (sequence, loops, conditions), not just entertain.

**Secondary goal (Phase 2):** Reuse the same app in the first year at HTL as an introductory programming course ("Lern mode") with a more detailed block editor.

**Known constraints from past open days:**
- Visitors type slowly and inaccurately → near-zero typing.
- Visitors don't read long texts → max one short sentence per screen.
- The old app broke on the outside-world parts (VS Code, shell calls, SMTP) → no external tools, robust error handling.

**Success criteria (Phase 1):**
- A visitor with no programming experience completes Level 1–2 (5 missions) in ≤ 10 min without help from staff.
- No typing is required anywhere except the optional name/email fields.
- The app runs a full open day unattended per station: no crash, auto-reset between visitors.
- Setup of a station = install + start. Stations on the same network find each other and share results without any configuration.
- Leaderboard shows results from all stations; a station that loses network keeps working and catches up when it's back; no station is special, any can be switched off.
- Results of every open day are kept as history, so days and years can be compared.

---

## 2. Decisions

| Topic | Decision |
|---|---|
| Framework | Tauri 2 (latest 2.x), kept |
| Platforms | Windows, macOS, Linux, Android, iOS (+ static web build) |
| iOS distribution | Built in CI when an Apple Developer account exists; until then "works, not distributed" |
| Frontend | Full rewrite, nothing retained. SvelteKit 2 (static adapter, SPA) + Svelte 5 runes + TypeScript |
| Styling | Tailwind CSS v4 (CSS-first config), shadcn-svelte components copied into repo and restyled, lucide-svelte icons |
| Code execution | Pyodide (CPython → WebAssembly) in a Web Worker, bundled offline |
| VS Code | Removed entirely |
| Visual output | Drone on a 2D grid map (top-down, stylised) |
| Code input | Drag-and-drop blocks that generate live, real Python |
| Feel | Bouncy, reactive, spring-physics drag & drop and UI |
| Session end | PDF certificate, email (with GDPR consent), shared leaderboard, QR code to HTL site |
| Leaderboard + history | Peer-to-peer "Schwarm" sync: every station stores all session records and exchanges missing ones with peers found via mDNS; no host, no configuration |
| Statistics | Anonymous session history kept permanently; admin "Logbuch" page with per-day/per-year stats and CSV export |
| Product name | Decided at the end of Phase 1; working name "CodingLab" until then |
| Lern-mode progress (Phase 2) | Local per-device student profiles + export (file/QR). No server, no accounts |

---

## 3. User experience — Showcase mode

### 3.1 Screen flow

```
Attract ──tap──▶ Pilot ──▶ Mission map ──▶ Mission ──▶ Mission complete ─┐
   ▲                          ▲                                          │
   │                          └───────────── next mission ◀──────────────┘
   │                                                                     │
   └──── auto-reset ◀──── Finale (certificate · email · leaderboard · QR) ◀┘
```

- **Attract:** looping drone demo flight, big "Tippe zum Starten", HTL Villach logo. Shown on start and after reset.
- **Pilot:** random fun pilot name pre-filled (e.g. "Kapitän Propeller"), large "Los geht's" button. Optional: tap to enter own first name via on-screen keyboard.
- **Mission map:** 3 levels as islands/zones with missions as nodes, stars shown per completed mission. Current mission pulses.
- **Mission:** the main workspace (see 3.3).
- **Mission complete:** confetti, 1–3 stars pop in one by one, one-line praise, "Weiter" button. Between levels: one HTL promo card ("An der HTL Villach programmierst du echte Drohnen, Roboter, …").
- **Finale:** total stars, pilot name, flight-path thumbnail; buttons: Zertifikat (PDF/print/share), Per E-Mail senden, Bestenliste, QR code to HTL site always visible.

A visitor can leave after any level; Finale is reachable from the mission map ("Fertig") once ≥ 1 mission is done.

### 3.2 Missions

| # | Title | Concept | Blocks available | Win condition |
|---|---|---|---|---|
| 1.1 | Erster Flug | Commands | `takeoff` `forward` `land` | Land on the pad |
| 1.2 | Um die Ecke | Order / turning | + `turn_left` `turn_right` | Reach pad around a building |
| 1.3 | Paketdienst | Multi-step | + `pick_up` `drop` | Deliver the parcel |
| 2.1 | Runde drehen | `for` loop | + `repeat(n)` | Fly a square using ≤ 5 blocks |
| 2.2 | Solarpark-Inspektion | Loop + parameters | + `photo` | Photograph 6 panels |
| 3.1 | Nebel | `if` + sensor | + `if obstacle_ahead()` | Reach goal on partly hidden map |
| 3.2 | Finale: Rettungsflug | Everything; edit numbers in Python | all | Rescue mission; stars for shortest program |

- Target ~1.5 min per mission; Level 3 is optional for fast visitors.
- Missions can be skipped (skipped = 0 stars, no penalty otherwise).

**Stars (per mission):** 1 = goal reached; 2 = goal reached within the mission's `optimalBlocks + 2`; 3 = within `optimalBlocks` and ≤ 3 runs. Exact thresholds live in each mission file.

### 3.3 Mission workspace

Layout (landscape / desktop):

```
┌──────────────────────────────────────────────────────────────┐
│  ◀ Karte     Mission 2.1 · Runde drehen          ★★☆   ⚙   │
├───────────────┬──────────────────────────┬───────────────────┤
│  Block palette│   Program (drop zone)    │   Drone stage     │
│  [takeoff]    │   1 takeoff()            │   (grid + drone)  │
│  [forward ↕n] │   2 repeat 4:            │                   │
│  [turn_left]  │   3   forward(2)         │                   │
│  [repeat n]   │   4   turn_left()        │                   │
│               │   5 land()               │   ▶ Start  ↺      │
│               ├──────────────────────────┤                   │
│               │  Python view (live)      │   Coach bubble    │
└───────────────┴──────────────────────────┴───────────────────┘
```

Portrait (phone/tablet): stage on top (~45 %), program + palette below; Python view as a toggle tab.

- **Goal line:** one sentence under the header, e.g. "Fliege ein Quadrat zurück zum Start." Plus an icon/animation of the goal on the stage.
- **Program area:** vertical list of blocks; `repeat`/`if` are containers that other blocks can be dropped into (max. two nesting levels in Showcase mode, e.g. `if` inside `repeat` for mission 3.1).
- **Block parameters:** numbers are changed with big −/+ steppers on the block (no keyboard).
- **Python view:** read-only, syntax-highlighted, the line currently executing is highlighted during the run. In 3.2 number literals are tappable and editable with steppers.
- **Run:** "Start" runs the program; the drone animates step by step; the matching block and Python line glow. "↺" resets the stage. A speed toggle (1× / 2×).
- **Failure is fun, not red:** crash into a building → drone wobbles, "Autsch!" bubble, soft bounce back. Coach suggests what to try. No error dialogs in the mission workspace.
- **Coach:** small drone mascot with one-line hints. Automatic hint after ~20 s of no progress or after 2 failed runs. Hints per mission are defined in the mission file (ordered, progressively more concrete).

### 3.4 Motion and interaction design

The app must feel bouncy and reactive. Implemented with Svelte 5 `Spring`/`Tween` (svelte/motion) and CSS transitions; no heavy animation library.

- **Spring presets** (single source of truth, `motion.ts`): `bouncy` (low damping), `snappy` (fast, slight overshoot), `gentle` (UI transitions).
- **Drag & drop** (custom, Pointer Events; works with mouse, touch, pen):
  - Pick up: block scales to ~1.08, lifts (shadow grows), slight tilt following pointer velocity.
  - While dragging: target slots "breathe"; neighbouring blocks spring apart to open a gap at the insertion point; magnetic snap when within ~40 px.
  - Drop: squash-and-stretch landing, tiny particle puff, haptic tick on mobile.
  - Invalid drop: block springs back to origin with a shake.
  - Remove: drag onto the trash / out of the program → block shrinks and pops.
  - Tap-to-add alternative: tapping a palette block appends it to the program (for users who struggle with dragging).
- **Buttons:** squish on press (scale 0.94), spring back on release.
- **Screen transitions:** slide/scale with `gentle`; stars and confetti with `bouncy`.
- **Reduced motion:** honour `prefers-reduced-motion` — replace springs with short fades, disable confetti/particles.

### 3.5 Kiosk behaviour

- Fullscreen, no window chrome on desktop; no text selection, no context menu, no pinch-zoom, no scrollbars in main screens, no browser shortcuts (F5, Ctrl+W etc. suppressed where Tauri allows).
- Tap targets ≥ 56 px; large type (min 18 px body, 28 px+ headings).
- **Idle reset:** after 90 s without input → overlay "Bist du noch da?" with 10 s countdown → reset session → Attract. Duration configurable in admin.
- **On-screen keyboard** (own component) for name and email fields; physical keyboard also works.
- **Admin screen:** opened by Ctrl+Shift+A (desktop) or 3 s long-press on the logo (touch) + PIN. Contents:
  - Station name (auto-generated, editable), optional event code (stations only sync with the same code; default: none = sync with every CodingLab on the network), sync on/off, list of peers currently seen
  - SMTP settings + "Test-Mail senden"
  - Idle timeout, enabled missions/levels
  - Leaderboard: choose shown period (today / this event / all time)
  - Logbuch (statistics): see 4.6
  - History: delete this station's history (local only; explained in the UI)
  - Emails: export CSV of consented addresses, delete all
  - App version, check for updates (desktop)
- Default PIN is set at first launch (forced), stored hashed.

### 3.6 Texts and language

- UI is German. All strings in one file (`src/lib/i18n/de.ts`), typed keys, so texts are easy to shorten and English can be added later.
- Style rules: max ~12 words per sentence, "du"-form, no jargon without an icon or animation beside it.

---

## 4. Architecture

### 4.1 Overview

```
┌──────────────────── Frontend (SvelteKit SPA, Svelte 5) ─────────────────────┐
│ routes/            screens (attract, pilot, map, mission, finale, admin)     │
│ lib/ui/            restyled shadcn-svelte components + design tokens         │
│ lib/blocks/        block model, block→Python generator, drag&drop            │
│ lib/stage/         drone stage renderer + animation player                   │
│ lib/runtime/       Pyodide worker client, drone API, safety limits           │
│ lib/missions/      mission schema, loader, goal checker, star calculation    │
│ lib/session/       session state machine, idle timer, kiosk guards           │
│ lib/platform/      single wrapper around Tauri invoke (+ web fallbacks)      │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │ typed Tauri commands
┌──────────────────────────────▼───────────── Backend (Rust) ──────────────────┐
│ config  certificate  mail  history(store+stats)  sync(peers)  emails  admin  │
└───────────────────────────────────────────────────────────────────────────────┘
```

Rule: the frontend never calls `invoke` outside `lib/platform/`. `lib/platform/` has a Tauri implementation and a web implementation (web: history stored in the browser only, no sync; certificate via browser download; email off).

### 4.2 Frontend units

**Missions (`lib/missions/`)** — Missions are data, validated at load (zod schema):

```ts
type Mission = {
  id: string;                    // "2.1"
  level: 1 | 2 | 3;
  title: string;
  goalText: string;              // one sentence
  map: {
    width: number; height: number;
    tiles: string[];             // rows, e.g. ". . B . P" (empty, Building, Pad, parcel, panel, fog…)
    start: { x: number; y: number; dir: "N" | "E" | "S" | "W" };
  };
  blocks: BlockType[];           // palette for this mission
  starterProgram?: BlockNode[];
  goal: Goal;                    // e.g. { type: "landOn", tile: "P" } | { type: "photoAll", tile: "S" } | …
  stars: { optimalBlocks: number; maxRunsFor3: number };
  hints: string[];
  editablePython?: boolean;      // mission 3.2
};
```

Missions live in `src/lib/missions/showcase/*.json`. A CI test loads and validates every mission file and checks that a reference solution in the file solves it.

**Blocks (`lib/blocks/`)**
- `BlockNode` tree: `{ id, type, params, children? }`.
- `toPython(program): { code: string, lineMap: Map<blockId, line> }` — pure function, deterministic formatting, 4-space indent.
- Block types (Phase 1): `takeoff`, `land`, `forward(n)`, `turn_left`, `turn_right`, `pick_up`, `drop`, `photo`, `repeat(n)` (container), `if_obstacle` (container with optional else).
- For mission 3.2: `fromPython` is **not** required; only number literals are editable, mapped back through `lineMap` + parameter positions.
- Designed so Phase 2 can add variables, expressions, `while`, `def`, lists, and a Python→blocks parser without changing the Phase 1 API.

**Runtime (`lib/runtime/`)**
- Pyodide loaded once in a dedicated Web Worker during Attract/boot ("Drohne startet…" loader). Assets bundled locally (no CDN).
- A Python module `drone` is injected; its functions don't move anything directly — they append events to a trace and query a simulated world (`obstacle_ahead()` is answered from the mission map inside the worker).
- Execution returns `{ events: DroneEvent[], error?: FriendlyError }`. Events include the Python line number for highlighting.
- Safety: max 500 drone events, 2 s wall-clock timeout; on timeout the worker is terminated and re-created. Both produce a friendly message ("Deine Drohne fliegt endlos im Kreis!").
- Python exceptions are mapped to one-line German messages; raw tracebacks are hidden in Showcase mode.

**Stage (`lib/stage/`)**
- Renders the map and drone with SVG (crisp at any size, easy to style/animate). Tile set: ground, building, pad, parcel, drop zone, solar panel, fog, person (rescue).
- `Player` consumes `DroneEvent[]` and animates with springs; emits `onStep(line)` for highlighting; supports 1×/2× and cancel.
- Goal checking runs on the event trace + final world state (pure function, unit-tested), not on animation.

**Session (`lib/session/`)**
- Explicit state machine: `attract → pilot → map ⇄ mission → complete → finale → attract`, plus `admin` overlay. Implemented as a small typed reducer; screens read state via Svelte 5 runes.
- Holds pilot name, per-mission results (stars, blocks, runs, time), total stars.
- Idle timer and kiosk guards (context menu, selection, key suppression) live here.

**UI (`lib/ui/`)**
- shadcn-svelte components added via its CLI, then restyled through Tailwind v4 theme tokens.
- Design tokens in `app.css` (`@theme`): HTL Villach palette as primary, bright "drone" accent (e.g. signal orange/cyan), neutral surfaces, large radii (16–24 px), layered shadows for draggable elements. Light theme default, dark theme via class.
- Display font for headings (friendly, rounded geometric), highly legible sans for body, monospace for Python — all bundled locally.
- The final palette and fonts are chosen in the first implementation step and shown to the user as a style sheet page for approval.

### 4.3 Backend units (Rust)

`main.rs` becomes a thin setup file; each module has one purpose and its own unit tests.

| Module | Responsibility |
|---|---|
| `config` | Load/save station config (JSON in app data dir): station id (UUID, generated once), station name, event code, sync on/off, idle timeout, enabled missions, PIN hash. |
| `admin` | PIN verify/set (argon2 hash), guards admin commands. |
| `certificate` | Build PDF from `{ pilotName, stars, missions, pathImagePng, date }` with `printpdf`; returns bytes. Frontend saves/shares/prints. |
| `mail` | Send certificate + HTL info via SMTP with `lettre` (rustls). Credentials stored in OS keychain (`keyring` crate on desktop; on mobile, email is only offered if SMTP is configured, credentials stored in app-private storage). Returns typed errors. |
| `emails` | Append consented addresses (name, email, timestamp, consent flag) to a local store; export CSV; delete all. |
| `history` | SQLite (rusqlite, bundled) in the app data dir. One immutable `session` record per finished visitor (see 4.6), plus a local `seq` insertion counter. Queries for leaderboard (period filter) and statistics. Applies the name-retention rule (4.5) on insert and daily. |
| `sync` | Peer-to-peer "Schwarm". Desktop stations run a small HTTP server (axum) on a fixed LAN port and advertise `_codinglab._tcp` via mDNS with TXT `station`, `event`, `v` (protocol version). Every 30 s and on discovery, a station pulls `GET /records?after=<seq>` from each peer (remembering a per-peer high-water mark) and pushes its own new records with `POST /records`. Inserts are idempotent by record id, so records relay through any peer and merging never conflicts. Requests carry the event code; peers with a different code or protocol version are ignored. Mobile stations do not serve; they push and pull against desktop peers. |

- All commands return `Result<T, AppError>`; `AppError` serialises to `{ code, message }` for the frontend. No `unwrap()`/`expect()` outside tests; `panic = "abort"` removed.
- No shell commands, no filesystem writes outside the app data dir, no per-visitor folders.
- Tauri capabilities restricted to what's used (dialog/share, fs scoped to app data, opener for the HTL URL, haptics on mobile, updater on desktop).

### 4.4 Data flow — one mission run

1. User edits blocks → `toPython()` → Python view updates live.
2. "Start" → runtime worker executes code with the mission map → `{ events, error }`.
3. Stage player animates events; each step highlights block + Python line.
4. Goal checker evaluates trace → success/failure; on success star calculation → session result.
5. Mission complete screen; results stay in memory until Finale/reset.
6. Finale: `history.save(session)` → stored locally, picked up by sync; leaderboard reads merged local history; optional certificate / email via backend.

### 4.5 Privacy (GDPR)

- Pilot names only on the leaderboard (first name or generated name); nothing else is stored for visitors who don't request an email.
- Email: explicit consent checkbox (not pre-ticked) with a one-line explanation; stored only with consent; exportable and deletable via admin.
- Pilot names are removed from session records older than the configured retention (default: 7 days); every station applies this rule on insert and daily, so synced copies are redacted too. The anonymous rest of the record stays as history.
- History contains no email addresses; those live only in the separate, consent-based email store.

### 4.6 Session history and statistics ("Logbuch")

Session record (immutable once written):

```ts
type SessionRecord = {
  id: string;            // UUID
  v: 1;                  // record schema version
  event: string | null;  // event code at the time
  station: string;       // station id
  mode: 'showcase';      // 'lern' in Phase 2
  startedAt: string;     // ISO timestamp
  finishedAt: string;
  pilotName: string | null;   // null after retention
  totalStars: number;
  missions: { id: string; stars: 0|1|2|3; runs: number; blocks: number; seconds: number; skipped: boolean }[];
  endedBy: 'finale' | 'idle' | 'quit';
};
```

- Idle-reset visitors are stored too (`endedBy: 'idle'`), so drop-off points are visible.
- Logbuch page (admin): visitors per day, completion rate per mission, average stars/time per mission, where visitors stop, comparison of open days across years; filter by event/year; CSV export of all records.
- Maintenance: none needed. The database is small (≈1 KB per visitor), and every station holds a full copy, so any station is a backup.

---

## 5. Platforms, build and distribution

- **Desktop (Win/macOS/Linux):** installers via GitHub Actions on push to `release`; updater artifacts and `updates.json` generated by CI. The existing app identifier `at.htlvillach.codinglab` and updater public key are kept so installed stations can update.
- **Android:** APK (for direct install on school tablets) and AAB built in CI; signing key via CI secrets.
- **iOS:** CI job prepared (macOS runner); enabled once an Apple Developer account and signing are available.
- **Web:** static build of the same frontend (Pyodide works in browsers), deployable to any static host; `lib/platform/` web implementation.
- Version bumped to 1.0.0 for the rewrite.

---

## 6. Testing

- **Frontend unit tests (Vitest):** block→Python generator, goal checker, star calculation, session state machine, mission schema validation, every mission's reference solution solves it.
- **Runtime integration test:** Pyodide worker runs sample programs (incl. infinite loop → timeout, exception → friendly error) in Node/Vitest.
- **Rust unit tests:** history store (idempotent insert, retention redaction, stats queries), sync merge between two in-process peers (incl. relay through a third and offline catch-up), config, PIN hashing, certificate generation produces a valid PDF, mail message building (no network).
- **E2E smoke (Playwright against the web build):** attract → pilot → solve mission 1.1 → finale.
- **Manual device checklist** per release: Windows station, Android tablet, phone portrait, three stations syncing with auto-discovery, one unplugged and replugged, one switched off.
- CI runs lint (eslint + prettier, clippy + rustfmt), type check, all tests.

---

## 7. What is removed

Everything under `src/` and `static/media/`, `src-tauri/python/`, the VS Code integration, `check_python`, the old scoring, the per-visitor Documents folders, the SMTP startup prompt, the key-next-to-ciphertext encryption, `updates/updates.json` (now CI-generated), all shell command usage.

---

## 8. Phase 2 outlook — Lern mode (not built in Phase 1)

Requirements Phase 1's architecture must allow without rewrites:

- **Mode switch** on the start screen (via admin config: showcase-only, lern-only, or both).
- **Detailed editor:** nested blocks, variables, expressions, comparisons/boolean ops, `while`, `def` with parameters/`return`, lists; three views: blocks / blocks + Python / pure Python (text editor with drag-in snippets). Requires a Python→blocks parser (best-effort; pure Python mode always works).
- **Curriculum:** 8 chapters (sequence, `for`, variables + `print`, `if/elif/else`, `while`, functions, lists, free project/sandbox) as mission files in `missions/lern/`.
- **Progress:** local student profiles per device; export/import as file and QR; teacher overview on the device.
- **No auto-reset** and no attract screen in Lern mode; Python tracebacks visible in a friendly console.

Phase 1 design choices that enable this: missions as data, block model as a tree with an extensible type registry, runtime independent from blocks (runs any Python), session state machine with a mode field.

---

## 9. Open points

- Product name (decided at the end of Phase 1).
- HTL Villach official colours/logo files and the exact QR target URL — needed before the design-token step.
- Apple Developer account availability (iOS distribution).
- Final wording of the German texts and HTL promo cards — draft by implementation, reviewed by staff.
