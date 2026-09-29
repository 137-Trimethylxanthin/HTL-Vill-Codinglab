# Research for Phase 2 (learning app) — 2026-09-29

Inputs for the Lern-app spec. Sources: web research (curriculum, tools, studies) and the owner's own HTL Villach first-year materials (POS, 2022/23) seen in Teams/OneDrive with permission. No personal data of others is recorded here.

## 1. What first-years at HTL Villach actually do (POS, Informatik, 2022/23)

Subject "Programmieren und Software Engineering" (POS1), 5 h/week (3 exercise). Python in year 1, Java from year 2 (department tool matrix 2023/24). Worksheets ("Blatt 01–33") in Teams Assignments, weekly, plus practical tests on the computer (PLF 3/4/5) and a Leistungsfeststellung (LF) per term.

| Period | Topic | Sheets |
|---|---|---|
| Sep–Oct | Natural-language algorithms, colour-coded by the **EVA principle** (Eingabe blue, Verarbeitung orange, Ausgabe green); tea/cocoa recipes; sequence, Verzweigung (Wenn/Dann/Sonst), loops | 01–02, theory notes |
| Oct–Nov | **Blockbilder (Nassi-Shneiderman Struktogramme) in the "Blockbildeditor" (BBE)**: input with plausibility loops, sums until 0, odd numbers, 1×1 table with `\n`/`\t`, FIFA manager (counters, best/worst), rectangles/triangles with menus, Schnapsen | 03–09 |
| Dec | VS Code setup, **Blockbilder → Python**, character drawings (filled/unfilled diamond, Christmas trees) | 10–13 |
| Jan–Feb | **Functions**; drawing shapes via functions with parameters | 14–18 |
| Mar–Apr | **Strings** (functions, processing, substring, palindrome, Hangman), number systems/converter; code reading ("rewrite this unreadable grade generator") | 19–25 |
| May–Jun | **Lists** (fixed size, manipulation, search, sort), Matplotlib, random (Roulette), "Tauchroboter" (robot in a grid) | 26–33 |

Consequences: the console (input/output) is the main world; "Zeichnen" means character graphics in the console, not turtle; a grid robot already exists as a task type (fits the drone); exam mode is needed (tests on the computer); units must fit one lesson.

## 2. The BBE (what the learning app replaces)

- "Blockbildeditor", web page on the school server (`klio.htl-villach.at/BE/pages/Blocks-Editor.html`), linked by teachers in Oct 2022. The server returned 502 on 2026-09-29 and was already unreliable in 2022; no archive copy exists; source not found in Teams. An unofficial student rewrite exists (github.com/kendlbat/blocks-editor: step execution, values on blocks, typed-parameter functions, export to JS/Python).
- It is a **Struktogramm editor**: grey nested boxes, a "main" tab plus "+" for more procedures, typed declarations (`Text:`, `Number:`, arrays), `INPUT`, `OUTPUT`, `IF`, `WHILE`, `FOR i = 1 TO n BY +1`. Expressions are typed as free text in **pseudo-JavaScript** (`'Text:'+zahl`, `&&`, `!=`). Owner's verdict: the pseudo-JS was bad; the replacement uses **real Python everywhere**, including block expressions.
- File format `.bb` (17 files analysed, students' and both teachers'): UTF-8 JSON with BOM, always `{"main": Statements}` (no procedures in any file). All 10 statement types: `Statements{statements[]}`, `CommentStatement{comment}`, `DeclarationStatement{variableType, variableName, initializationValue, isArray, documentation?}`, `InputStatement{prompt, variableName}`, `OutputStatement{outputString}`, `AssignmentStatement{variableName, assignmentValue}`, `IfStatement{condition, thenStatements, elseStatements}`, `WhileStatement{condition, loopStatements}`, `ForStatement{counterName, fromValue, toValue, counterShift: "+1"}`, `DoWhileStatement{condition, loopStatements}` (taught as REPEAT-UNTIL: "runs at least once"; `condition` is the until-condition). `variableType` differs between BBE versions: `Number`/`Text` (older) vs `integer`/`string`. Import is feasible; expressions need JS→Python conversion (`&&`→`and`, `||`→`or`, `!`→`not`, string `+` number → f-string/`str()`); REPEAT-UNTIL becomes `while True: … if cond: break`.
- Submissions were `.bb` files plus JPG/PNG screenshots of the Blockbild.

## 3. Official curriculum (BGBl. II Nr. 262/2015 idgF)

Informatik year I (Anlage 1.10): pseudocode and graphical representation of program flow, algorithm concept, basic algorithms, searching, sorting, syntax, statements, operators, expressions, data types, control structures, procedures and functions, text files, testing and debugging, simple IDEs. No notation is mandated. IT (Anlage 1.11) similar, 3 h/week. Bautechnik/Innenarchitektur: only algorithms and graphical design in year 1. OOP only from year II.

## 4. Tools and studies (blocks → text)

- Blocks help early but the benefit fades (Weintrop & Wilensky 2017/2019); students leave structured editors with ~4× more syntax errors in plain text (Kazemitabaar et al. 2023) → typing must be practised explicitly; Parsons problems help.
- Students switch back to blocks mostly to find a command (Holbert & Weintrop) → command palette next to the Python editor.
- Python→blocks: BlockPy/BlockMirror turn unparseable or unmapped code into an editable raw "code block" instead of locking students out; parse with Pyodide's `ast`.
- Editor: CodeMirror 6 (MIT, small, touch-friendly, offline); Monaco has no mobile support.
- Friendly errors: friendly-traceback (MIT) has no German and is lightly maintained → own short DE/EN messages for the ~20 most common errors, with exact highlighting.
- Serverless teacher features exist elsewhere: exercises as files, checks run client-side, progress as an exported file merged into a local class overview.

## 5. School environment

Shared school PCs with Windows + Microsoft Entra login (one Windows profile per student); Teams, SharePoint, OneDrive; GitLab.com with the group `htlvil-org` (no own GitLab server); no Moodle.

## 6. Course materials in detail (both first-year groups, 2022/23)

Downloaded with the owner's permission (kept outside the repo; teachers' material): 33 worksheets + extra tasks, 15 teacher sample programs, 6 teacher Blockbilder, the theory notes, and the other group's 46 in-class exercises ("SÜ"), running script, algorithm and desk-check templates.

- **Method:** problem → plain-language algorithm ("Schritt 1: Lies eine Zahl ein und speichere sie in n"), colour-coded EVA → Blockbild → Python. Templates: *Problem / Eingabe / Ausgabe / Lösung: Schritt 1…*; **Schreibtischtest** (desk check) as a table *Testfall | Eingabe | Variablen (each variable's values over time) | Ausgabe | OK/NOK*. The script also shows variables as memory cells (name, address, value).
- **Three loop kinds taught explicitly:** while (0..n times, unknown count), for (known count), repeat-until (at least once).
- **Teacher Python style:** type hints everywhere (`name: str = ""`, `def get_str(anzahl: int, zeichen: str) -> str`, `list[int]`), docstrings stating WHAT/WHY/RESULT, `main()` function, comments mapping to BBE ("entspricht Deklaration Number alter = 0 im BBE"), f-strings, default and keyword parameters.
- **Typical task patterns:** input with validation loops and sentinels (0 or -1 ends), counters/min/max/averages, menus (`(D)reieck, (Q)uadrat, … (E)nde?`), character graphics (rectangles, triangles, pyramids, diamonds, trapezoids, a "vase", Christmas trees, filled/unfilled, left/right aligned), string functions (reverse, compare, split, count, replace, password analysis, Caesar/number-sequence encryption, palindrome, substring), number systems (bin/oct/dec/hex), lists (fixed size manipulation, search without sorting, bubble sort, k largest, odd/even partition, merge, sublist, lotto), random (Roulette, number guessing, Hangman), simulation (Tauchroboter with `time.sleep`, then Matplotlib graph + animation).
- **Runtime features the tasks need:** blocking `input()`, `print` with `\n`/`\t`, **ANSI colours** (`\033[31m` red/green for self-made tests), **clearing the console** (`os.system("cls"/"clear")`), `time.sleep`, `random`, `chr`/`ord`, **Matplotlib** (plot + animation), file-free.
- **Checking patterns:** "Finde mindestens 4 Testfälle", tests in `main`, restrictions like "keine built-in Funktionen außer chr, ord, len" and "sortieren ist nicht erlaubt" → exercise checks need AST rules (forbidden/required constructs) in addition to I/O tests. Code-reading tasks start from given code (e.g. an unreadable grade generator to refactor).
- Python is also used in year 1 in CABS (Linux/number systems sheets 13–15).

## 7. Stack research (shell, Python, sharing)

- **Shell:** Tauri 2 remains a good fit: per-user NSIS install without admin, WebView2 ships with Windows 10/11, small installer, signed updater. Electron adds ~85 MB for no gain; a PWA avoids installation but only Chromium has the File System Access API. Recommended: Tauri for school PCs **plus the same SPA as a PWA** (GitHub/GitLab Pages, `coi-serviceworker`) for home, Chromebooks and Safe Exam Browser by URL.
- **Blocking `input()` is not solved in the demo** (event trace only). Options: JSPI (`pyodide.ffi.run_sync`, experimental; WebView2/Chrome 137+, Firefox 153, Safari 27) → SharedArrayBuffer + `Atomics.wait` via `setStdin` (needs cross-origin isolation; **WebKitGTK hides SAB** unless `JSC_useSharedArrayBuffer=1`) → last resort: re-run with pre-collected input. This must be proven first (console is the main world).
- **Step mode:** `sys.settrace` works in Pyodide; record lines + variables in one run and replay (also fits the desk-check table).
- **Exam mode:** the app can go fullscreen/always-on-top but cannot lock the OS; real lockdown comes from **Safe Exam Browser** (the app as a permitted process, or the PWA by URL). SEB cannot stop file dialogs of permitted apps → exam mode disables the app's own file dialogs.
- **Front end:** Svelte 5 is fine and keeps sharing with the demo; Blockly (Apache-2.0, now Raspberry Pi Foundation) exists but does not have the demo's bouncy feel.
- **Sharing code:** a pnpm monorepo is the lowest overhead for 1–2 people; with separate repos, publish `@codinglab/*` packages from a public GitLab project (its npm registry needs no auth) or tagged git dependencies; avoid submodules and GitHub Packages (token needed even for public installs).
- **Precedents:** micro:bit Python Editor (React + CodeMirror 6 + PWA), futurecoder (Pyodide, `input()` via SAB/service worker, Safari unsupported), Strype (Vue, tree-sitter), JupyterLite (stdin via SAB/service worker), Scratch/TurboWarp Desktop (Electron). Mu was archived in 2025 (maintainers moved on; manual signing/release by one person) → automate releases and signing, two people with signing access.

## 8. Foundation: Tauri vs pure web vs Godot (2026-09-29)

- **Godot 4:** strongest game feel and animation tooling, native exports everywhere, precedent GDQuest "Learn GDScript From Zero" (teaches Godot's own language). Weak for this app: no production-ready Python (godot-python has no Godot 4 release; py4godot "early phase… demo", desktop only); in the web export Python would still be Pyodide via `JavaScriptBridge` (two wasm runtimes); `CodeEdit` has no Python highlighting or diagnostics; IME and mixed-DPI bugs; AccessKit only "experimental" since 4.5; C# cannot export to web (GDScript only); unsigned exes trigger SmartScreen/Defender; whole UI would be a second stack. Web export: single-threaded since 4.3, wasm ~3–10 MB compressed, iOS browser crash reports.
- **Pure web (PWA):** native fit for Safe Exam Browser (Chromium), Chromebooks, tablets; needs COOP/COEP via service-worker shim for blocking `input()`; File System Access API only in Chromium.
- **Tauri:** best for school PCs (offline, files, per-user install); SEB only as a permitted application; no ChromeOS.
- All major block editors (Scratch/Blockly SVG, Droplet canvas) are web tech; Droplet (Pencil Code) is the closest precedent for blocks that are real text.
- **Recommendation:** one SvelteKit + Pyodide codebase shipped as PWA **and** wrapped in Tauri; worlds rendered with **PixiJS** (Canvas2D for turtle); console in the DOM; no Godot (possible later as a lazily loaded module if the drone world becomes a real game). Blocking `input()` is not implemented in the demo yet and must be spiked first.
