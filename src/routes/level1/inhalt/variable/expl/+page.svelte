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
        In Variable können wir Werte speichern. Diese Werte können wir dann später wieder abrufen. <br>
        In Python können wir Variablen mit dem <code class="inline-code">=</code> Zeichen erstellen. <br>
        <code class="inline-code">x = 5</code> erstellt eine Variable mit dem Namen <code class="inline-code">x</code> und dem Wert <code class="inline-code">5</code>. <br>
        wir werden aber nach dem namen der Variable einen ':' setzen und den Typ der Variable angeben. <br>
        <code class="inline-code">x:int = x</code> damit sagen wir leute die den Code lesen, dass die Variable <code class="inline-code">x</code> eine Nummer ist. <br>
        hier sind ein paar Beispiele ( die kurz vorm kommt nach dem ':' ):
        In Python werden texte in Anführungszeichen gesetzt und 'String' genannt. (kurz: str) <br>
        Nummern werden ohne Anführungszeichen gesetzt und 'Integer' genannt. (kurz: int) <br>
        Hier ein Beispiel:
    </p>

    <p class="noMargin">Code:</p>
<pre class="codeBlock">
nummer1: int = 5
nummer2: int = 10
name: str = "{$nameStore}"

print(<code style="color: var(--green)">nummer1</code>, "+", <code style="color: var(--mauve)">nummer2</code>, "=", <code style="color: var(--yellow)">nummer1 + nummer2</code>)
print("Hallo " + <code style="color: var(--teal)">name</code> + "!")
print(f"Hey <code style="color: var(--teal)">&#123;name}</code>! wusstest du das: <code style="color: var(--green)">&#123;nummer1}</code> + <code style="color: var(--mauve)">&#123;nummer2}</code> = <code style="color: var(--yellow)">&#123;nummer1 + nummer2}</code>?
</pre>
    <p class="noMargin">Output:</p>
<pre class="cmd">
> <code style="color: var(--green)">5</code> + <code style="color: var(--mauve)">10</code> = <code style="color: var(--yellow)">15</code> <br>
> Hello <code style="color: var(--teal);">{$nameStore}</code>!
> Hey <code style="color: var(--teal);">{$nameStore}</code>! wusstest du das: <code style="color: var(--green)">5</code> + <code style="color: var(--mauve)">10</code> = <code style="color: var(--yellow)">15</code>?
</pre>

    <p>
        Wie du siehst kannst du Variable auch mit <code class="inline-code">print()</code> ausgeben. <br>
        In print kannst du auch mehrere sachen ausgeben indem du sie aneinander reihst du kannst 3 verschiedene Arten von aneinander reihen benutzen:
        <br>
        - <code class="inline-code">print("Hallo " + name + "!")</code> <br>
        - <code class="inline-code">print("Hallo", name, "!")</code> <br>
        - <code class="inline-code">print(f"Hallo &#123;name}!")</code> <br>

        bei , kannst du bestimmen was zwischen den sachen die du ausgeben willst stehen soll. (standart: ein leerzeichen) <br>
        bei + kettest du die variablen aneinander ohne jegliche leerzeichen <br>
        bei f"" kannst du die variablen mit <code class="inline-code">&#123;variable}</code> in den text einfügen. <br>

        <br>
        Wie du siehst kannst du auch rechnen mit variablen aber dazu erfährst du in level 2 mehr. <br>
    </p>

</div>

<button class="next" on:click={() => {_next("aufg")}}> Weiter </button>