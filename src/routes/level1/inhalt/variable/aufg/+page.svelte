<script lang="ts">
  import { onMount } from "svelte";
  import ExerciseCard from "../../../../../components/ExerciseCard.svelte";
  import CodeBlock from "../../../../../components/CodeBlock.svelte";
  import CodeInput from "../../../../../components/CodeInput.svelte";

  let exerciseCard: ExerciseCard;
  let stat = ["", "", "", "", "", "", "", "", "", "", "", "", ""];

  let correct_answers = [
    { name: "jahr", answer: "int" },
    { name: "greeting", answer: "str" },
    { name: "monat", answer: "int" },
    { name: "name", answer: "str" },
    { name: "tag", answer: "int" },
    { name: "wochentag", answer: "str" },
    { name: "print1", answer: ["jahr", "monat", "tag"] },
    { name: "print2", answer: ["greeting", "name"] },
    { name: "print3", answer: ["wochentag", "name"] },
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

  function validate() {
    let user_answers = [
      { name: "jahr", answer: user_jahr },
      { name: "begrüsung", answer: user_greeting },
      { name: "monat_nummer", answer: user_monat_nummer },
      { name: "name", answer: user_name },
      { name: "tag", answer: user_tag },
      { name: "wochentag", answer: user_wochen_tag },
      { name: "print1", answer: [user_print1_1, user_print1_2, user_print1_3] },
      { name: "print2", answer: [user_print2_1, user_print2_2] },
      { name: "print3", answer: [user_print3_1, user_print3_2] },
    ];

    let correct = true;
    stat = ["", "", "", "", "", "", "", "", "", "", "", "", ""];

    for (let i = 0; i < correct_answers.length; i++) {
      let correct_answer = correct_answers[i];
      let user_answer = user_answers[i];
      if (correct_answer.answer !== user_answer.answer) {
        if (correct_answer.name.startsWith("print")) {
          let correct_temp = true;
          for (let j = 0; j < correct_answer.answer.length; j++) {
            let correct_print_answer = correct_answer.answer[j];
            let user_print_answer = user_answer.answer[j];
            if (correct_print_answer !== user_print_answer) {
              correct_temp = false;
              if (i === 6) {
                stat[6 + j] = "wrong";
              } else if (i === 7) {
                stat[9 + j] = "wrong";
              } else if (i === 8) {
                stat[11 + j] = "wrong";
              }
            } else {
              if (i === 6) {
                stat[6 + j] = "correct";
              } else if (i === 7) {
                stat[9 + j] = "correct";
              } else if (i === 8) {
                stat[11 + j] = "correct";
              }
            }
          }
          if (!correct_temp) {
            correct = false;
          }
        } else {
          correct = false;
          stat[i] = "wrong";
        }
      } else {
        if (correct_answer.name.startsWith("print")) {
          for (let j = 0; j < correct_answer.answer.length; j++) {
            if (i === 6) {
              stat[6 + j] = "correct";
            } else if (i === 7) {
              stat[9 + j] = "correct";
            } else if (i === 8) {
              stat[11 + j] = "correct";
            }
          }
        } else {
          stat[i] = "correct";
        }
      }
    }

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

<ExerciseCard
  bind:this={exerciseCard}
  title="Variablen - Aufgabe"
  prompt="Ich hoffe, du hast dir die Erklärung durchgelesen, denn nun kommt die Aufgabe. <br>Fülle die Lücken passend aus und drücke auf \"Ausführen\". <br>Du musst den Variablen auch mit <b>str</b> oder <b>int</b> einen Datentyp geben."
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

    <code class="comment"># Hier soll das Jahr, der Monat und der Tag ausgefüllt werden</code>
    print("Jahr:", <CodeInput bind:value={user_print1_1} state={stat[6]} width="6.5vw" maxLength={12} />, "Monat:" <CodeInput
      bind:value={user_print1_2}
      state={stat[7]}
      width="6.5vw"
      maxLength={12}
    />, "Tag:", <CodeInput bind:value={user_print1_3} state={stat[8]} width="6.5vw" maxLength={12} />)

    <code class="comment"># Hier bitte die Begrüßung und den Namen einfüllen</code>
    print(<CodeInput bind:value={user_print2_1} state={stat[9]} width="6vw" maxLength={8} /> + " " + <CodeInput
      bind:value={user_print2_2}
      state={stat[10]}
      width="5.5vw"
      maxLength={10}
    /> + " wie geht es dir?")

    <code class="comment"># Hier soll der Wochentag und der Name hin</code>
    print(f"Hey, ist dieser &#123;<CodeInput bind:value={user_print3_1} state={stat[11]} width="6vw" maxLength={10} />} nicht ein schöner Tag, &#123;<CodeInput
      bind:value={user_print3_2}
      state={stat[12]}
      width="6vw"
      maxLength={10}
    />}
  </CodeBlock>
</ExerciseCard>
