<script lang="ts">
    import { _disableButton, _enableButton, _next } from "../../+layout";
    import { onMount } from "svelte";
    import { nameStore } from "../../../../../utils/stores";

    onMount(() => {
        _disableButton();
    });

    let name = "";
    let alter = 0;
    let second = "hidden";
    let output = "hidden";
    let input1 = "";
    let input1Output = "hidden";
    let input2 = "";
    let input2Output = "hidden";

    function changeName(){
        if ($nameStore === undefined) {
            nameStore.set(name);
        }
    }
</script>


<div class="lernContainer">
    <h1>Input</h1>
    <p>
        Mit <code class="inline-code">input()</code> kannst du dem Benutzer Fragen stellen und seine Antworten speichern. <br>
        Fragen werden direkt in der Funktion <code class="inline-code">input()</code> via "" angegeben: <br>
        <code class="inline-code">input(<code style="color: var(--peach);">frage</code>)</code> <br>
        Diese Antwort kannst du dann in einer Variable speichern. <br>
        <code class="inline-code"><code style="color: var(--peach);">variable: str</code> = input(<code style="color: var(--peach);">frage</code>)</code> <br>
        Der User kann dann eine Antwort eingeben und muss diese mit <b>Enter</b> bestätigen. <br>
        Die Inputs sind immer Text (strings) auch wenn nur Ziffern eingegeben werden. <br>
        Damit du die Eingabe auch als Zahl verwenden kannst, musst du sie mit <code class="inline-code">int()</code> in eine Zahl umwandeln. <br>
        <code class="inline-code"><code style="color: var(--peach);">variable: int</code> = int(input(<code style="color: var(--peach);">frage</code>))</code> <br>
        Nun kannst du die Zahl in einer Variable speichern und mit ihr rechnen oder sie vergleichen. <br>
        Hier ein Beispiel für <code class="inline-code">input()</code> und <code class="inline-code">int()</code>:
    </p>
    <p class="noMargin">Code:</p>
<pre class="codeBlock">
<code style="color: var(--teal);">name: str</code> = input(<code style="color: var(--peach);">"Wie heißt du? "</code>)
<code style="color: var(--teal);">alter: int</code> = int(input(<code style="color: var(--peach);">"Wie alt bist du? "</code>))

print("Person:")
print("Name: " + <code style="color: var(--teal);">name</code>)
print("Alter: " + <code style="color: var(--teal);">alter</code>)
</pre>

<p class="noMargin">Output:</p>
<pre class="cmd">
<code style="color: var(--peach);">> Wie heißt du? </code> <input autocomplete="off"  style="width: 10vw;" type="text" bind:value={name} class="inline-input {input1}" on:keypress={(e) => { if (e.key === "Enter"){ input1 = "hidden";second = "";output = "hidden"; input1Output = ""; input2Output = "hidden";}}}><code class="{input1Output}" style="color: var(--teal)">{name}</code>
<code class="{second}"><code style="color: var(--peach);">> Wie alt bist du?</code> <input autocomplete="off"  style="width: 10vw;" type="number" bind:value={alter} class="inline-input {input2}" on:keypress={(e) => { if (e.key === "Enter"){ input2 = "hidden"; second = "";output = ""; input2Output = ""; input2Output = ""; _enableButton()}}}></code><code style="color: var(--teal)" class="{input2Output}">{alter}</code>
<code class="{output}">
> Person:
> Name: <code style="color: var(--teal)">{name}</code>
> Alter: <code style="color: var(--teal)">{alter}</code>
</code>
</pre>


</div>

<button class="next" on:click={() => {changeName();_next("aufg")}}> Weiter </button><br>
<button class="back" on:click={() =>{_next("../../aufgabe")}}>Zurück</button>