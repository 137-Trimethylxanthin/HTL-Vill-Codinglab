# CodingLab Revamp — Roadmap & Update Points

**Spec:** `docs/superpowers/specs/2026-09-28-codinglab-revamp-design.md`

Phase 1 is delivered in six update points (UP). Each UP ends with a version you can start and try. Each UP gets its own detailed plan, written just before it starts, so it builds on what the previous one taught us. Work happens on `main`, only local commits until the whole revamp is done; the old app lives on branch `v1.0-deprecated`.

| UP | Name | What you can try afterwards | Plan |
|---|---|---|---|
| 1 ✅ | Erster Flug (first flight) | New empty app with the new stack. Mission 1.1 is playable: tap blocks, see live Python, press Start, and the drone flies (real Python via Pyodide). Runs as `npm run tauri dev` and in the browser. | `2026-09-28-up1-erster-flug.md` |
| 2 ✅ | Bouncy | Final design system (HTL colours, fonts, spring presets). Spring-physics drag & drop with magnetic snap, gaps opening, squash on landing, shake on invalid drop. Container blocks (`repeat`, `if`) with nesting. All 7 missions incl. parcels, solar panels, fog, sensor `obstacle_ahead()`, and editable numbers in 3.2. Coach mascot with hints. Stars. | written after UP1 |
| 3 ✅ | Kiosk | Full session: Attract → Pilot → Mission map → Mission → Mission complete → Finale (without backend). Idle reset with countdown, on-screen keyboard, kiosk guards, portrait/phone layout, reduced motion. | written after UP2 |
| 4 ✅ | Backend | Rust rewrite: config, admin PIN + admin screen, PDF certificate (save/print/share), email with GDPR consent + email store/export, typed errors. | written after UP3 |
| 5 ✅ | Schwarm (swarm) | Peer-to-peer sync: stations find each other automatically (mDNS) and share all session records; shared leaderboard; permanent anonymous history with Logbuch statistics page and CSV export; name retention. | written after UP4 |
| 6 ✅ | Überall (everywhere) | Android/iOS/web builds, new icons & splash, strict CSP, CI (lint, tests, builds, updater artifacts, `updates.json`), README, Playwright E2E smoke (incl. UP1 layout regression: 30 blocks keep the program list ≥180 px, all tap targets ≥56 px; plus a real `tauri build` check that Pyodide loads under the production origin), final product name + rename, version 1.0.0. | written after UP5; done — splash and layout E2E added after the review. Product name decided 2026-09-29: stays **CodingLab** (no rename). Open: iOS build (needs an Apple developer account), Android verified only in CI. |

After UP6: **English translation** (`en.ts` + mission text overlays + language switch; see spec 3.6). Phase 2 (Lern mode) follows with its own spec.
