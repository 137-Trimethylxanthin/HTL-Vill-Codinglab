<script lang="ts">
  import { onMount } from "svelte";
  import type ExerciseCard from "../../../../../components/ExerciseCard.svelte";
  import CodeBlock from "../../../../../components/CodeBlock.svelte";
  import CodeInput from "../../../../../components/CodeInput.svelte";
  import ExercisePage from "../../../../../components/ExercisePage.svelte";
  import { isTypeMatch, normalizeIdentifier } from "../../../../../utils/validation";
  import { tick } from "svelte";

  type InputState = "" | "correct" | "wrong" | "nameErr" | "vergleichErr" | "bothErr";

  let exerciseCard: ExerciseCard;
  let outputColorClass = "";
  let showOutput = false;
  let firstInput = "hidden";
  let secondInput = "hidden";
  let thirdInput = "hidden";

  let user_name_type = "";
  let user_name = "";
  let user_alter_type = "";
  let user_alter = "";
  let user_datum_type = "";
  let user_datum = "";
  let user_datum_name = "";
  let user_datum_name_in_print = "";

  let name_type_state: InputState = "";
  let alter_type_state: InputState = "";
  let datum_type_state: InputState = "";
  let datum_name_state: InputState = "";

  let input1Output = "hidden";
  let input2Output = "hidden";
  let input3Output = "hidden";
  let input2Element: HTMLInputElement;
  let input3Element: HTMLInputElement;

  let input_val_1 = "";
  let input_val_2 = "";
  let input_val_3 = "";

  let ende = "hidden";

  const correct_fields = ["str", "int", "str"];
  let errors = 0;

  function validate() {
    name_type_state = "";
    alter_type_state = "";
    datum_type_state = "";
    datum_name_state = "";

    input1Output = "hidden";
    input2Output = "hidden";
    input3Output = "hidden";

    firstInput = "hidden";
    secondInput = "hidden";
    thirdInput = "hidden";

    ende = "hidden";

    let error = false;

    if (isTypeMatch(user_name_type, correct_fields[0])) {
      name_type_state = "correct";
    } else {
      name_type_state = "wrong";
      error = true;
    }

    if (isTypeMatch(user_alter_type, correct_fields[1])) {
      alter_type_state = "correct";
    } else {
      alter_type_state = "wrong";
      error = true;
    }

    if (isTypeMatch(user_datum_type, correct_fields[2])) {
      datum_type_state = "correct";
    } else {
      datum_type_state = "wrong";
      error = true;
    }

    if (
      normalizeIdentifier(user_datum_name) === normalizeIdentifier(user_datum_name_in_print) &&
      user_datum_name.trim().length !== 0 &&
      user_datum_name_in_print.trim().length !== 0
    ) {
      datum_name_state = "correct";
    } else {
      datum_name_state = "wrong";
      error = true;
    }

    if (error) {
      errors++;
      exerciseCard.setOutput("> Es ist ein Fehler aufgetreten\n> Bitte überprüfe die rot markierten Felder", false);
      showOutput = true;
    } else {
      exerciseCard.stopTimer(true);
      exerciseCard.setOutput("", true);
      firstInput = "";
      showOutput = false;
    }
  }

  onMount(() => {
    const input = document.querySelector("input");
    if (input) input.focus();
  });
</script>

<ExercisePage
  bind:exerciseCard
  title="Input - Aufgabe"
  prompt="Schreibe den Input für den Namen und das Alter in die dafür vorgesehenen Variablen. <br>Frage auch nach dem Geburtsdatum des Benutzers und speichere es in eine Variable. <br><br>Danach führe den Code aus und fülle die Inputs aus und sehe dir den Output an. <br><br>Viel Erfolg!"
  nextHref="../if/expl"
  backHref="../../aufgabe"
  showOutput={showOutput}
  on:validate={validate}
>
  <CodeBlock>
    name: <CodeInput bind:value={user_name_type} state={name_type_state} width="2.5vw" maxLength={3} /> = input("<CodeInput
      bind:value={user_name}
      type="text"
      width="29vw"
      maxLength={50}
    />")<br>
    alter: <CodeInput bind:value={user_alter_type} state={alter_type_state} width="2.5vw" maxLength={3} /> = int(input("<CodeInput
      bind:value={user_alter}
      type="text"
      width="15vw"
      maxLength={23}
    />"))<br>
    <code class="comment"># Hier musst du dir einen Variablenamen ausdenken</code><br>
    <CodeInput bind:value={user_datum_name} state={datum_name_state} width="12vw" maxLength={23} />: <CodeInput
      bind:value={user_datum_type}
      state={datum_type_state}
      width="2.5vw"
      maxLength={3}
    /> = input("<CodeInput bind:value={user_datum} type="text" width="16vw" maxLength={25} />")<br>
print("Hallo " + name + ", du bist " + alter + " Jahre alt")<br>
print("Und hast am " + <CodeInput
      bind:value={user_datum_name_in_print}
      state={datum_name_state}
      width="12vw"
      maxLength={23}
    /> + " Geburtstag")
  </CodeBlock>

  <div class="interactive-console">
    <div class="cmd {outputColorClass}">
      <code class="{firstInput}">> <code style="color: var(--peach);">{user_name}</code>
        <input
          autocomplete="off"
          style="width: 10vw;"
          type="text"
          bind:value={input_val_1}
          class="inline-input {firstInput}"
          on:keypress={async (e) => {
            if (e.key === "Enter") {
              secondInput = "";
              input1Output = "";
              firstInput = "hidden";
              await tick();
              input2Element?.focus();
            }
          }}
        />
      </code>
      <code class="{input1Output}"><code style="color: var(--peach);">{user_name}</code> <code style="color: var(--teal);">{input_val_1}</code></code><br>
      <code class="{secondInput}">> <code style="color: var(--peach);">{user_alter}</code>
        <input
          autocomplete="off"
          style="width: 10vw;"
          type="number"
          bind:value={input_val_2}
          class="inline-input {secondInput}"
          bind:this={input2Element}
          on:keypress={async (e) => {
            if (e.key === "Enter") {
              thirdInput = "";
              input2Output = "";
              secondInput = "hidden";
              await tick();
              input3Element?.focus();
            }
          }}
        />
      </code>
      <code class="{input2Output}"><code style="color: var(--peach);">{user_alter}</code> <code style="color: var(--teal);">{input_val_2}</code></code><br>
      <code class="{thirdInput}">> <code style="color: var(--peach);">{user_datum}</code>
        <input
          autocomplete="off"
          style="width: 10vw;"
          type="text"
          bind:value={input_val_3}
          class="inline-input {thirdInput}"
          bind:this={input3Element}
          on:keypress={(e) => {
            if (e.key === "Enter") {
              ende = "";
              input3Output = "";
              thirdInput = "hidden";
              exerciseCard.enableNext();
            }
          }}
        />
      </code>
      <code class="{input3Output}"><code style="color: var(--peach);">{user_datum}</code> <code style="color: var(--teal);">{input_val_3}</code></code><br>
      <code class="{ende}">Hallo <code style="color: var(--teal);">{input_val_1}</code>, du bist <code style="color: var(--teal);">{input_val_2}</code> Jahre alt <br>Und hast am <code style="color: var(--teal);">{input_val_3}</code> Geburtstag</code>
    </div>
  </div>
</ExercisePage>
