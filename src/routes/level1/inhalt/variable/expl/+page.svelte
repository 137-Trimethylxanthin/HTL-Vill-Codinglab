<script lang="ts">
    import {_enableButton, _next} from "../../+layout";
    import {onMount} from "svelte";
    import {nameStore} from "../../../../../utils/stores";
    onMount(() => {
        _enableButton();
    });
</script>


<div class="lernContainer">
    <h1>Variablen</h1>
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

    <p class="noMargin">Code:</p>
<pre class="codeBlock">
nummer1: int = 5
nummer2: int = 10
name: str = "{$nameStore}"

print(<code style="color: var(--green)">nummer1</code>, "+", <code style="color: var(--mauve)">nummer2</code>, "=", <code style="color: var(--yellow)">nummer1 + nummer2</code>)
print("Hallo " + <code style="color: var(--teal)">name</code> + "!")
print(f"Hey <code style="color: var(--teal)">&#123;name}</code>! Wusstest du dass: <code style="color: var(--green)">&#123;nummer1}</code> + <code style="color: var(--mauve)">&#123;nummer2}</code> = <code style="color: var(--yellow)">&#123;nummer1 + nummer2}</code>?
</pre>
<p class="noMargin">Output:</p>
<pre class="cmd">
> <code style="color: var(--green)">5</code> + <code style="color: var(--mauve)">10</code> = <code style="color: var(--yellow)">15</code> <br>
> Hallo <code style="color: var(--teal);">{$nameStore}</code>!
> Hey <code style="color: var(--teal);">{$nameStore}</code>! Wusstest du dass: <code style="color: var(--green)">5</code> + <code style="color: var(--mauve)">10</code> = <code style="color: var(--yellow)">15</code>?
</pre>

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

</div>

<button class="next" on:click={() => {_next("aufg")}}> Weiter </button><br>
<button class="back" on:click={() =>{_next("../../aufgabe")}}>Zurück</button>
