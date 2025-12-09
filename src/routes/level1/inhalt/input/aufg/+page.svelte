<script lang="ts">
  import { onMount } from "svelte";
  import ExerciseCard from "../../../../../components/ExerciseCard.svelte";
  import CodeBlock from "../../../../../components/CodeBlock.svelte";
  import CodeInput from "../../../../../components/CodeInput.svelte";

  let exerciseCard: ExerciseCard;
  let outputColorClass = "";
  let output = "> Hier ist dein Output";

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

  let name_type_state = "";
  let alter_type_state = "";
  let datum_type_state = "";
  let datum_name_state = "";

  let input1Output = "hidden";
  let input2Output = "hidden";
  let input3Output = "hidden";

  let input_val_1 = "";
  let input_val_2 = "";
  let input_val_3 = "";

  let ende = "hidden";

  let correct_fields = ["str", "int", "str"];
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

    if (user_name_type === correct_fields[0]) {
      name_type_state = "correct";
    } else {
      name_type_state = "wrong";
      error = true;
    }

    if (user_alter_type === correct_fields[1]) {
      alter_type_state = "correct";
    } else {
      alter_type_state = "wrong";
      error = true;
    }

    if (user_datum_type === correct_fields[2]) {
      datum_type_state = "correct";
    } else {
      datum_type_state = "wrong";
      error = true;
    }

    if (
      user_datum_name === user_datum_name_in_print &&
      user_datum_name.length !== 0 &&
      user_datum_name_in_print.length !== 0
    ) {
      datum_name_state = "correct";
    } else {
      datum_name_state = "wrong";
      error = true;
    }

    if (error) {
      errors++;
      exerciseCard.setOutput("> Es ist ein Fehler aufgetreten\n> Bitte überprüfe die rot markierten Felder", false);
    } else {
      exerciseCard.stopTimer(true);
      exerciseCard.setOutput("", true);
      firstInput = "";
    }
  }

  onMount(() => {
    const input = document.querySelector("input");
    if (input) input.focus();
  });
</script>

<ExerciseCard
  bind:this={exerciseCard}
  title="Input - Aufgabe"
  prompt="Schreibe den Input für den Namen und das Alter in die dafür vorgesehenen Variablen. <br>Frage auch nach dem Geburtsdatum des Benutzers und speichere es in eine Variable. <br><br>Danach führe den Code aus und fülle die Inputs aus und sehe dir den Output an. <br><br>Viel Erfolg!"
  nextHref="../if/expl"
  backHref="../../aufgabe"
  on:validate={validate}
>
  <CodeBlock>
    name: <CodeInput bind:value={user_name_type} state={name_type_state} width="2.5vw" maxLength={3} /> = input("<CodeInput
      bind:value={user_name}
      type="text"
      width="29vw"
      maxLength={50}
    />")
    alter: <CodeInput bind:value={user_alter_type} state={alter_type_state} width="2.5vw" maxLength={3} /> = int(input("<CodeInput
      bind:value={user_alter}
      type="text"
      width="15vw"
      maxLength={23}
    />"))
    <code class="comment"># Hier musst du dir einen Variablenamen ausdenken</code>
    <CodeInput bind:value={user_datum_name} state={datum_name_state} width="12vw" maxLength={23} />: <CodeInput
      bind:value={user_datum_type}
      state={datum_type_state}
      width="2.5vw"
      maxLength={3}
    /> = input("<CodeInput bind:value={user_datum} type="text" width="16vw" maxLength={25} />")

    print("Hallo " + name + ", du bist " + alter + " Jahre alt")
    print("Und hast am " + <CodeInput
      bind:value={user_datum_name_in_print}
      state={datum_name_state}
      width="12vw"
      maxLength={23}
    /> + " Geburtstag")
  </CodeBlock>

  <div class="interactive-console">
    <pre class="cmd {outputColorClass}">
      {output}
      <code class="{firstInput}">> <code style="color: var(--peach);">{user_name}</code>
        <input
          autocomplete="off"
          style="width: 10vw;"
          type="text"
          bind:value={input_val_1}
          class="inline-input {firstInput}"
          on:keypress={(e) => {
            if (e.key === "Enter") {
              secondInput = "";
              input1Output = "";
              firstInput = "hidden";
            }
          }}
        />
      </code>
      <code class="{input1Output}"><code style="color: var(--peach);">{user_name}</code> <code style="color: var(--teal);">{input_val_1}</code></code>
      <code class="{secondInput}">> <code style="color: var(--peach);">{user_alter}</code>
        <input
          autocomplete="off"
          style="width: 10vw;"
          type="number"
          bind:value={input_val_2}
          class="inline-input {secondInput}"
          on:keypress={(e) => {
            if (e.key === "Enter") {
              thirdInput = "";
              input2Output = "";
              secondInput = "hidden";
            }
          }}
        />
      </code>
      <code class="{input2Output}"><code style="color: var(--peach);">{user_alter}</code> <code style="color: var(--teal);">{input_val_2}</code></code>
      <code class="{thirdInput}">> <code style="color: var(--peach);">{user_datum}</code>
        <input
          autocomplete="off"
          style="width: 10vw;"
          type="text"
          bind:value={input_val_3}
          class="inline-input {thirdInput}"
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
      <code class="{input3Output}"><code style="color: var(--peach);">{user_datum}</code> <code style="color: var(--teal);">{input_val_3}</code></code>
      <code class="{ende}">Hallo <code style="color: var(--teal);">{input_val_1}</code>, du bist <code style="color: var(--teal);">{input_val_2}</code> Jahre alt <br>Und hast am <code style="color: var(--teal);">{input_val_3}</code> Geburtstag</code>
    </pre>
  </div>
</ExerciseCard>
