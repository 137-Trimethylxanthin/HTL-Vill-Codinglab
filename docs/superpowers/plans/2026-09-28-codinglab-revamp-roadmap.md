# CodingLab Revamp — Roadmap & Update Points

**Spec:** `docs/superpowers/specs/2026-09-28-codinglab-revamp-design.md`

Phase 1 is delivered in six update points (UP). Each UP ends with a version you can start and try. Each UP gets its own detailed plan, written just before it starts, so it builds on what the previous one taught us. Only local commits until the whole revamp is done; the old app lives on branch `v1.0-deprecated`.

| UP | Name | What you can try afterwards | Plan |
|---|---|---|---|
| **1** | **Erster Flug** (first flight) | New empty app with the new stack. Mission 1.1 is playable: tap blocks, see live Python, press Start, and the drone flies (real Python via Pyodide). Runs as `npm run tauri dev` and in the browser. | `2026-09-28-up1-erster-flug.md` |
| 2 | Bouncy | Final design system (HTL colours, fonts, spring presets). Spring-physics drag & drop with magnetic snap, gaps opening, squash on landing, shake on invalid drop. Container blocks (`repeat`, `if`) with nesting. All 7 missions incl. parcels, solar panels, fog, sensor `obstacle_ahead()`, and editable numbers in 3.2. Coach mascot with hints. Stars. | written after UP1 |
| 3 | Kiosk | Full session: Attract → Pilot → Mission map → Mission → Mission complete → Finale (without backend). Idle reset with countdown, on-screen keyboard, kiosk guards, portrait/phone layout, reduced motion. | written after UP2 |
| 4 | Backend | Rust rewrite: config, admin PIN + admin screen, PDF certificate (save/print/share), email with GDPR consent + email store/export, typed errors. | written after UP3 |
| 5 | Bestenliste (leaderboard) | Shared leaderboard: host station (axum + SQLite), clients with offline queue, mDNS discovery, manual address, daily view, retention. | written after UP4 |
| 6 | Überall (everywhere) | Android/iOS/web builds, new icons & splash, strict CSP, CI (lint, tests, builds, updater artifacts, `updates.json`), README, Playwright E2E smoke, version 1.0.0. | written after UP5 |

Phase 2 (Lern mode) follows after UP6 with its own spec.
