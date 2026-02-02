<script lang="ts">
  import { goto } from "$app/navigation";
  import CodeBlock from "../../../../../components/CodeBlock.svelte";
  import ConsoleOutput from "../../../../../components/ConsoleOutput.svelte";
  import LessonPage from "../../../../../components/LessonPage.svelte";
  import { nameStore } from "../../../../../utils/stores";
  import { tick } from "svelte";

  const exampleCode = `name: str = input("Wie heißt du? ")
alter: int = int(input("Wie alt bist du? "))

print("Person:")
print("Name: " + name)
print("Alter: " + alter)`;

  let name = "";
  let alter: number | null = null;
  let second = "hidden";
  let output = "hidden";
  let input1 = "";
  let input1Output = "hidden";
  let input2 = "";
  let input2Output = "hidden";
  let input2Element: HTMLInputElement;

  function changeName() {
    if ($nameStore === undefined || $nameStore === "") {
      nameStore.set(name);
    }
  }

  async function handleNameEnter() {
    input1 = "hidden";
    second = "";
    output = "hidden";
    input1Output = "";
    input2Output = "hidden";
    if (input2Element) {
      await tick();
      input2Element.focus();
    }
  }

  function handleAgeEnter() {
    if (alter === null) {
      return;
    }
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

<LessonPage title="Input" nextHref="aufg" backHref="../../aufgabe" on:next={handleNext}>
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
  <CodeBlock code={exampleCode} language="python" />

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
    <code class="{input1Output}" style="color: var(--teal)">{name}</code><br>
    <code class="{second}"><code style="color: var(--peach);">> Wie alt bist du?</code>
      <input
        autocomplete="off"
        style="width: 10vw;"
        type="number"
        bind:value={alter}
        bind:this={input2Element}
        class="inline-input {input2}"
        on:keypress={(e) => {
          if (e.key === "Enter") {
            handleAgeEnter();
          }
        }}
      />
    </code>
    <code style="color: var(--teal)" class="{input2Output}">{alter}</code><br>
    <code class="{output}">
      > Person:
      > Name: <code style="color: var(--teal)">{name}</code><br>
      > Alter: <code style="color: var(--teal)">{alter}</code>
    </code>
  </ConsoleOutput>
</LessonPage>