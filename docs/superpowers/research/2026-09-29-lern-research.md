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
- File format `.bb`: UTF-8 JSON with BOM, `{"main": Statements}`; statement types seen: `Statements{statements[]}`, `CommentStatement{comment}`, `DeclarationStatement{variableType, variableName, initializationValue, isArray}`, `InputStatement{prompt, variableName}`, `OutputStatement{outputString}`, `AssignmentStatement{variableName, assignmentValue}`, `IfStatement{condition, thenStatements, elseStatements}`, `WhileStatement{condition, loopStatements}` (FOR and procedures exist in the UI; their JSON shape was not seen). Import is feasible; expressions need JS→Python conversion (`&&`→`and`, `||`→`or`, `!`→`not`, string `+` number → f-string/`str()`).
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
