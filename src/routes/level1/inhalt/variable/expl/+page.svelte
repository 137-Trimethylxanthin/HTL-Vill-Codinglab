<script lang="ts">
  import InteractiveCodeExample from "../../../../../components/InteractiveCodeExample.svelte";
  import LessonPage from "../../../../../components/LessonPage.svelte";
  import { nameStore } from "../../../../../utils/stores";

  let displayName = "";
  let exampleCode = "";
  let exampleOutput = "";

  $: displayName = $nameStore || "Name";

  $: exampleCode = `nummer1: int = 5
nummer2: int = 10
name: str = "${displayName}"

print(nummer1, "+", nummer2, "=", nummer1 + nummer2)
print("Hallo " + name + "!")
print(f"Hey {name}! Wusstest du dass: {nummer1} + {nummer2} = {nummer1 + nummer2}?")`;

  $: exampleOutput = `> 5 + 10 = 15
> Hallo ${displayName}!
> Hey ${displayName}! Wusstest du dass: 5 + 10 = 15?`;
</script>

<LessonPage title="Variablen" nextHref="aufg" backHref="../../aufgabe">
  <p>
    Eine Variable ist eine Art Behälter mit einem Wert und einem Datentyp. Diese Werte können dann später wieder abgerufen und weiter verarbeitet werden. <br>
    In Python können wir Variablen mit dem <code class="inline-code">=</code> Zeichen erstellen. <br>
    <code class="inline-code">x = 5</code> erstellt zum Beispiel eine Variable mit dem Namen <code class="inline-code">x</code> und dem Wert <code class="inline-code">5</code>. <br>
    Um den Datentyp einer Variable eindeutig hervorzuheben, wird nach einem ':' der Datentyp angegeben:
    <code class="inline-code">x: int = 5</code><br>
    Hier sind ein paar Beispiele (mit Kurzform): <br>
    In Python werden Texte in Anführungszeichen gesetzt und 'String' genannt. (kurz: str) <br>
    Nummern werden ohne Anführungszeichen angeschrieben und 'Integer' genannt. (kurz: int) <br>
    Hier ein Beispiel:
  </p>

  <InteractiveCodeExample code={exampleCode} output={exampleOutput} />

  <p>
    Wie du siehst, kannst du Variablen auch mit <code class="inline-code">print()</code> ausgeben und mehrere Variablen aneinanderreihen. <br>
    Du kannst <b>drei</b> verschiedene Arten von Aneinanderreihungen verwenden:
    <br><br>
    - <code class="inline-code">print("Hallo " + name + "!")</code> <br><br>
    - <code class="inline-code">print("Hallo", name, "!")</code> <br><br>
    - <code class="inline-code">print(f"Hallo &#123;name}!")</code> <br><br>

    Bei <code class="inline-code">,</code> kannst du bestimmen, was zwischen den Bestandteilen, die du ausgeben willst, stehen soll. (Standard: ein Leerzeichen) <br>
    Bei <code class="inline-code">+</code> verkettest du die Bestandteile ohne jegliche (Leer-)zeichen<br>
    Bei <code class="inline-code">f""</code> kannst du die Bestandteile mit <code class="inline-code">&#123;variable}</code> in den Text einfügen.<br>

    <br>
    Wie du siehst, kannst du mit Variablen auch rechnen, aber dazu erfährst du mehr in Level 2.<br>
  </p>
</LessonPage>
