<script lang="ts">
  import ExerciseCard from "../../../../../components/ExerciseCard.svelte";
  import CodeBlock from "../../../../../components/CodeBlock.svelte";
  import CodeInput from "../../../../../components/CodeInput.svelte";
  import { nameStore } from "../../../../../utils/stores";

  let exerciseCard: ExerciseCard;
  let inputVal = "";
  let errors = 0;

  function handleValidate() {
    if (inputVal.length <= 0) {
      exerciseCard.setOutput("Du hast noch nichts geschrieben.", false);
      return;
    }

    let middle = "";
    try {
      middle = inputVal.split("(")[1].split(")")[0];
    } catch (e) {
      exerciseCard.setOutput("Du hast keine Klammern geschrieben.", false);
      return;
    }

    let startHasValidStart = inputVal.startsWith("print(");
    let middleIsString = middle.startsWith('"') && middle.endsWith('"');
    let endHasValidEnd = inputVal.endsWith(")");

    if (startHasValidStart && middleIsString && endHasValidEnd && inputVal.length > 0) {
      exerciseCard.stopTimer(true);
      const text = middle.substring(1, middle.length - 1);
      exerciseCard.setOutput(
        `Dein Text:\n> ${text}\n\n> Gut gemacht! Du hast print() verwendet. Du kannst nun auf Weiter klicken.`,
        true
      );
      exerciseCard.enableNext();
    } else {
      errors++;
      let message = "Das ist nicht ganz richtig. Versuche es nochmal.";
      if (!startHasValidStart)
        message += "\n> Du hast 'print' nicht richtig geschrieben. (Beachte, dass es klein ist)";
      if (!middleIsString)
        message += '\n> Du brauchst Anführungszeichen um den Text. print("Dein Text")';
      if (!endHasValidEnd)
        message += '\n> Du hast noch etwas nach der \')\' stehen. print("Dein Text")';
      exerciseCard.setOutput(message, false);
    }
  }
</script>

<ExerciseCard
  bind:this={exerciseCard}
  title="print - Aufgabe"
  prompt="Nun versuche es selbst. <br>Schreibe ein print-Statement, welches deinen Namen ausgibt:"
  nextHref="../variable/expl"
  backHref="../../aufgabe"
  on:validate={handleValidate}
>
  <CodeBlock>
    print("Dein Text") <br>
    <code style="color: var(--green)"># Nun du, {$nameStore}</code> <br>
    <CodeInput bind:value={inputVal} autofocus />
  </CodeBlock>
</ExerciseCard>
