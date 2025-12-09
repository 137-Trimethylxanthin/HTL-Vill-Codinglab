<script lang="ts">
  import LessonCard from "../../../../../components/LessonCard.svelte";
  import CodeBlock from "../../../../../components/CodeBlock.svelte";
  import ConsoleOutput from "../../../../../components/ConsoleOutput.svelte";
  import NavButtons from "../../../../../components/NavButtons.svelte";
  import { nameStore } from "../../../../../utils/stores";
  import { goto } from "$app/navigation";

  let name = "";
  let alter = 0;
  let second = "hidden";
  let output = "hidden";
  let input1 = "";
  let input1Output = "hidden";
  let input2 = "";
  let input2Output = "hidden";

  function changeName() {
    if ($nameStore === undefined || $nameStore === "") {
      nameStore.set(name);
    }
  }

  function handleNameEnter() {
    input1 = "hidden";
    second = "";
    output = "hidden";
    input1Output = "";
    input2Output = "hidden";
  }

  function handleAgeEnter() {
    input2 = "hidden";
    second = "";
    output = "";
    input2Output = "";
  }

  function handleNext() {
    changeName();
    goto("aufg");
  }
</script>

<LessonCard title="Input">
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
  <CodeBlock>
    <code style="color: var(--teal);">name: str</code> = input(<code style="color: var(--peach);">"Wie heißt du? "</code>)
    <code style="color: var(--teal);">alter: int</code> = int(input(<code style="color: var(--peach);">"Wie alt bist du? "</code>))

    print("Person:")
    print("Name: " + <code style="color: var(--teal);">name</code>)
    print("Alter: " + <code style="color: var(--teal);">alter</code>)
  </CodeBlock>

  <p class="noMargin">Output:</p>
  <ConsoleOutput>
    <code style="color: var(--peach);">> Wie heißt du? </code>
    <input
      autocomplete="off"
      style="width: 10vw;"
      type="text"
      bind:value={name}
      class="inline-input {input1}"
      on:keypress={(e) => {
        if (e.key === "Enter") {
          handleNameEnter();
        }
      }}
    />
    <code class="{input1Output}" style="color: var(--teal)">{name}</code>
    <code class="{second}"><code style="color: var(--peach);">> Wie alt bist du?</code>
      <input
        autocomplete="off"
        style="width: 10vw;"
        type="number"
        bind:value={alter}
        class="inline-input {input2}"
        on:keypress={(e) => {
          if (e.key === "Enter") {
            handleAgeEnter();
          }
        }}
      />
    </code>
    <code style="color: var(--teal)" class="{input2Output}">{alter}</code>
    <code class="{output}">
      > Person:
      > Name: <code style="color: var(--teal)">{name}</code>
      > Alter: <code style="color: var(--teal)">{alter}</code>
    </code>
  </ConsoleOutput>
</LessonCard>

<NavButtons nextHref="aufg" backHref="../../aufgabe" on:next={handleNext} />