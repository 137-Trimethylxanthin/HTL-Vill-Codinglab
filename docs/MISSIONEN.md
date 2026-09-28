# Missionen erstellen

Missionen sind JSON-Dateien in `src/lib/missions/showcase/`. Für eine neue Mission braucht es keinen Code — nur eine Datei und einen Eintrag in `src/lib/missions/index.ts`.

## Aufbau

```json
{
	"id": "2.1",
	"level": 2,
	"title": "Runde drehen",
	"goalText": "Flieg durch alle Ringe zurück zum Start.",
	"map": {
		"rows": [".....", ".C.C.", "..B..", ".P.C.", "....."],
		"start": { "x": 1, "y": 3, "dir": "N" }
	},
	"blocks": ["takeoff", "forward", "turn_left", "turn_right", "repeat", "land"],
	"goal": { "type": "complete" },
	"stars": { "optimalBlocks": 5, "maxRunsFor3": 3 },
	"hints": ["Die Runde hat 4 gleiche Seiten.", "Mit Wiederhole sparst du viele Blöcke.", "Wiederhole 4: Vorwärts 2, Rechts drehen."],
	"solution": [ … ]
}
```

| Feld | Bedeutung |
|---|---|
| `id` | `Level.Nummer`, z. B. `2.1`. Bestimmt die Reihenfolge auf der Karte. |
| `level` | 1, 2 oder 3 — die Spalte auf der Missionskarte. |
| `title` | Kurzer Name (wird auf der Karte ggf. abgeschnitten). |
| `goalText` | **Ein** Satz, max. 80 Zeichen, Einfache Sprache. |
| `map.rows` | Die Karte, Zeile für Zeile von oben. Alle Zeilen gleich lang. |
| `map.start` | Startfeld (`x` Spalte, `y` Zeile, ab 0) und Blickrichtung `N`/`E`/`S`/`W`. Muss `.` oder `P` sein. |
| `blocks` | Welche Blöcke in der Palette stehen. |
| `goal` | Immer `{ "type": "complete" }` (siehe unten). |
| `stars` | 3 Sterne: höchstens `optimalBlocks` Blöcke und höchstens `maxRunsFor3` Versuche. 2 Sterne: bis zu 2 Blöcke mehr. 1 Stern: geschafft. |
| `hints` | Tipps vom Coach, vom allgemeinen zum konkreten. Max. ~10 Wörter pro Satz, „du“-Form, keine Nebensätze. |
| `solution` | Eine Musterlösung aus Blöcken. Wird automatisch getestet. |
| `fog` | optional `true`: Die Karte ist im Nebel, man sieht nur die Umgebung der Drohne. |
| `editablePython` | optional `true`: Zahlen im Python-Code sind antippbar. |
| `starter` | optional: Startprogramm (muss absichtlich **nicht** lösen). |

## Felder der Karte

| Zeichen | Feld |
|---|---|
| `.` | frei |
| `B` | Gebäude (Absturz) |
| `P` | Landeplatz |
| `K` | Paket (`pick_up`) |
| `D` | Abgabeplatz (`drop`) |
| `S` | Solarzelle (`photo`) |
| `C` | Ring (durchfliegen) |

## Das Ziel

Es gibt nur eine Regel: **alles auf der Karte erledigen, dann landen** — auf einem Landeplatz, wenn es einen gibt. Also: alle Ringe durchflogen, alle Pakete abgegeben, alle Solarzellen fotografiert.

## Blöcke

`takeoff`, `land`, `forward` (Zahl 1–9), `turn_left`, `turn_right`, `pick_up`, `drop`, `photo`, `repeat` (Zahl 2–9, enthält Blöcke), `if_obstacle` (enthält Blöcke, optional `else`). Höchstens zwei Ebenen verschachteln (z. B. `if_obstacle` in `repeat`).

## Prüfen

```bash
npm test -- src/lib/missions
```

Der Test prüft für jede Mission: Die Datei passt zum Schema, die Musterlösung schafft das Ziel mit echtem Python, sie ist nicht länger als `optimalBlocks`, ein Startprogramm löst nicht schon, und kein Satz in `goalText`/`hints` hat mehr als 12 Wörter.

Danach die Datei in `src/lib/missions/index.ts` importieren und in `SHOWCASE` eintragen.
