<script lang="ts">
  import { onMount } from "svelte";
  import type ExerciseCard from "../../../../../components/ExerciseCard.svelte";
  import CodeBlock from "../../../../../components/CodeBlock.svelte";
  import CodeInput from "../../../../../components/CodeInput.svelte";
  import ExercisePage from "../../../../../components/ExercisePage.svelte";
  import { isTypeMatch, normalizeIdentifier } from "../../../../../utils/validation";

  type InputState = "" | "correct" | "wrong" | "nameErr" | "vergleichErr" | "bothErr";

  let exerciseCard: ExerciseCard;
  let stat: InputState[] = ["", "", "", "", "", "", "", "", "", "", "", "", ""];

  const expectedTypes = ["int", "str", "int", "str", "int", "str"];
  const expectedPrints = [
    ["jahr", "monat", "tag"],
    ["greeting", "name"],
    ["wochentag", "name"],
  ];

  let user_jahr = "";
  let user_jahr_value = "";
  let user_greeting = "";
  let user_greeting_value = "";
  let user_monat_nummer = "";
  let user_monat_nummer_value = "";
  let user_name = "";
  let user_name_value = "";
  let user_tag = "";
  let user_tag_value = "";
  let user_wochen_tag = "";
  let user_wochen_tag_value = "";

  let user_print1_1 = "";
  let user_print1_2 = "";
  let user_print1_3 = "";

  let user_print2_1 = "";
  let user_print2_2 = "";

  let user_print3_1 = "";
  let user_print3_2 = "";

  let errors = 0;

  function setState(index: number, ok: boolean) {
    stat[index] = ok ? "correct" : "wrong";
    return ok;
  }

  function validate() {
    let correct = true;
    stat = ["", "", "", "", "", "", "", "", "", "", "", "", ""];

    const typeInputs = [user_jahr, user_greeting, user_monat_nummer, user_name, user_tag, user_wochen_tag];
    typeInputs.forEach((input, index) => {
      const ok = isTypeMatch(input, expectedTypes[index]);
      if (!setState(index, ok)) {
        correct = false;
      }
    });

    const printInputs = [
      [user_print1_1, user_print1_2, user_print1_3],
      [user_print2_1, user_print2_2],
      [user_print3_1, user_print3_2],
    ];
    const printOffsets = [6, 9, 11];

    printInputs.forEach((group, groupIndex) => {
      group.forEach((input, inputIndex) => {
        const expected = expectedPrints[groupIndex][inputIndex];
        const ok = normalizeIdentifier(input) === expected;
        if (!setState(printOffsets[groupIndex] + inputIndex, ok)) {
          correct = false;
        }
      });
    });

    if (correct) {
      exerciseCard.stopTimer(true);
      const output =
        "> Jahr: " +
        user_jahr_value +
        " Monat: " +
        user_monat_nummer_value +
        " Tag: " +
        user_tag_value +
        "\n";
      const output2 = "> " + user_greeting_value + " " + user_name_value + " wie geht es dir? \n";
      const output3 =
        "> Hey, ist dieser " + user_wochen_tag_value + " nicht ein schöner Tag, " + user_name_value + "\n";
      exerciseCard.setOutput(output + output2 + output3, true);
      exerciseCard.enableNext();
    } else {
      errors++;
      exerciseCard.setOutput("> Leider nicht ganz richtig. \n> Die falschen Felder wurden markiert.\n", false);
    }
  }

  onMount(() => {
    const input = document.querySelector("input");
    if (input) input.focus();
  });
</script>

<ExercisePage
  bind:exerciseCard
  title="Variablen - Aufgabe"
  prompt="Ich hoffe, du hast dir die Erklärung durchgelesen, denn nun kommt die Aufgabe. <br>Fülle die Lücken passend aus und drücke auf &quot;Ausführen&quot;. <br>Du musst den Variablen auch mit <b>str</b> oder <b>int</b> einen Datentyp geben."
  nextHref="../input/expl"
  backHref="../../aufgabe"
  on:validate={validate}
>
  <CodeBlock>
    jahr:<CodeInput bind:value={user_jahr} state={stat[0]} width="2.5vw" maxLength={3} /> = <CodeInput
      bind:value={user_jahr_value}
      type="number"
      width="3.5vw"
      maxLength={5}
    /> <br>
    greeting:<CodeInput bind:value={user_greeting} state={stat[1]} width="2.5vw" maxLength={3} /> = "<CodeInput
      bind:value={user_greeting_value}
      width="30vw"
      maxLength={58}
    />" <br>
    monat:<CodeInput bind:value={user_monat_nummer} state={stat[2]} width="2.5vw" maxLength={3} /> = <CodeInput
      bind:value={user_monat_nummer_value}
      type="number"
      width="2vw"
      maxLength={2}
    /> <br>
    name:<CodeInput bind:value={user_name} state={stat[3]} width="2.5vw" maxLength={3} /> = "<CodeInput
      bind:value={user_name_value}
      width="30vw"
      maxLength={58}
    />" <br>
    tag:<CodeInput bind:value={user_tag} state={stat[4]} width="2.5vw" maxLength={3} /> = <CodeInput
      bind:value={user_tag_value}
      type="number"
      width="2vw"
      maxLength={2}
    /> <br>
    wochentag:<CodeInput bind:value={user_wochen_tag} state={stat[5]} width="2.5vw" maxLength={3} /> = "<CodeInput
      bind:value={user_wochen_tag_value}
      width="12vw"
      maxLength={23}
    />" <br>

    <code class="comment"># Hier soll das Jahr, der Monat und der Tag ausgefüllt werden</code><br>
    print("Jahr:", <CodeInput bind:value={user_print1_1} state={stat[6]} width="6.5vw" maxLength={12} />, "Monat:" <CodeInput
      bind:value={user_print1_2}
      state={stat[7]}
      width="6.5vw"
      maxLength={12}
    />, "Tag:", <CodeInput bind:value={user_print1_3} state={stat[8]} width="6.5vw" maxLength={12} />)<br>

    <code class="comment"># Hier bitte die Begrüßung und den Namen einfüllen</code><br>
    print(<CodeInput bind:value={user_print2_1} state={stat[9]} width="6vw" maxLength={8} /> + " " + <CodeInput
      bind:value={user_print2_2}
      state={stat[10]}
      width="5.5vw"
      maxLength={10}
    /> + " wie geht es dir?")<br>

    <code class="comment"># Hier soll der Wochentag und der Name hin</code><br>
    print(f"Hey, ist dieser &#123;<CodeInput bind:value={user_print3_1} state={stat[11]} width="6vw" maxLength={10} />} nicht ein schöner Tag, &#123;<CodeInput
      bind:value={user_print3_2}
      state={stat[12]}
      width="6vw"
      maxLength={10}
    />}
  </CodeBlock>
</ExercisePage>
