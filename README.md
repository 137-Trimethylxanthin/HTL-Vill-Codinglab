# CodingLab

Kinder programmieren am Tag der offenen Tür der HTL Villach eine Drohne — mit Blöcken, die sofort zu echtem Python werden. Läuft als Kiosk-App auf Windows, macOS, Linux (und vorbereitet für Android/iOS und als Web-Version).

## Voraussetzungen

- [Rust](https://www.rust-lang.org/tools/install) (stable) und [Node.js](https://nodejs.org/) 22+
- Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

```bash
npm install
```

## Entwickeln

| Befehl                           | Was                                                                        |
| -------------------------------- | -------------------------------------------------------------------------- |
| `npm run tauri dev`              | Desktop-App mit Hot Reload                                                 |
| `npm run dev`                    | nur die Oberfläche im Browser (Web-Plattform: ohne Zertifikat/E-Mail/Sync) |
| `npm test`                       | Unit-Tests (Vitest, inkl. echtem Python über Pyodide)                      |
| `cd src-tauri && cargo test`     | Rust-Tests (Config, PIN, E-Mail, Zertifikat, Verlauf, Sync über HTTP)      |
| `npm run e2e`                    | Browser-Tests (Playwright)                                                 |
| `npm run check` / `npm run lint` | Typen / Lint + Format                                                      |

## Bauen

- Desktop: `npm run tauri build` (Installer mit Updater-Signatur braucht `TAURI_SIGNING_PRIVATE_KEY`; ohne: `npm run tauri build -- --no-bundle`)
- Web: `npm run build` → Ordner `build/` auf einen beliebigen statischen Webserver
- Releases: Push auf den Branch `release` → GitHub Actions baut Windows/macOS/Linux + Android-APK (`.github/workflows/release.yml`). GitLab CI (`.gitlab-ci.yml`) prüft jeden Push.

## Aufbau

| Ordner                               | Aufgabe                                                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `src/lib/blocks`                     | Block-Programm → Python, Bearbeiten, Verschachtelungsregeln                                                       |
| `src/lib/missions`                   | Missionen (JSON), Schema, Ziel, Sterne                                                                            |
| `src/lib/sim`                        | Regeln der Drohnen-Welt                                                                                           |
| `src/lib/runtime`                    | Pyodide im Web Worker, `drone`-Python-Modul, Zeitlimits                                                           |
| `src/lib/stage`                      | Karte und Drohnen-Animation                                                                                       |
| `src/lib/dnd`                        | Drag & Drop (Federn, Ziele, Auto-Scroll)                                                                          |
| `src/lib/workspace`                  | Missions-Bildschirm, Coach                                                                                        |
| `src/lib/session`, `src/lib/screens` | Besucher-Ablauf, Kiosk, Leerlauf-Reset                                                                            |
| `src/lib/admin`, `src/lib/config`    | Admin-Bildschirm, Stations-Einstellungen                                                                          |
| `src/lib/history`                    | Besuchs-Datensätze, Bestenliste, Logbuch                                                                          |
| `src/lib/platform`                   | **einziger** Zugang zu Tauri (plus Web-Ersatz)                                                                    |
| `src-tauri/src`                      | `config`, `admin` (PIN), `secrets`, `emails`, `certificate`, `mail`, `history` (SQLite), `sync` (LAN), `commands` |

Weitere Doku: [Betrieb am Tag der offenen Tür](docs/BETRIEB.md) · [Missionen erstellen](docs/MISSIONEN.md) · Design: `docs/superpowers/specs/`.

Schrift im Zertifikat: Noto Sans (`src-tauri/fonts/LICENSE-noto-fonts.txt`).
