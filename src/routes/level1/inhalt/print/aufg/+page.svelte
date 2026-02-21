<script lang="ts">
  import type ExerciseCard from "../../../../../components/ExerciseCard.svelte";
  import CodeBlock from "../../../../../components/CodeBlock.svelte";
  import CodeInput from "../../../../../components/CodeInput.svelte";
  import ExercisePage from "../../../../../components/ExercisePage.svelte";
  import { nameStore } from "../../../../../utils/stores";
  import { extractQuotedText } from "../../../../../utils/validation";

  let exerciseCard: ExerciseCard;
  let inputVal = "";
  let errors = 0;

  function handleValidate() {
    const trimmed = inputVal.trim();
    if (!trimmed) {
      exerciseCard.setOutput("Du hast noch nichts geschrieben.", false);
      return;
    }

    if (!/^print\b/.test(trimmed)) {
      errors++;
      exerciseCard.setOutput(
        "Das ist nicht ganz richtig. Versuche es nochmal.\n> Du hast 'print' nicht richtig geschrieben. (Beachte, dass es klein ist)",
        false
      );
      return;
    }

    const openIndex = trimmed.indexOf("(");
    const closeIndex = trimmed.lastIndexOf(")");
    if (openIndex === -1 || closeIndex === -1 || closeIndex < openIndex) {
      errors++;
      exerciseCard.setOutput("Du hast keine Klammern geschrieben.", false);
      return;
    }

    const inner = trimmed.slice(openIndex + 1, closeIndex).trim();
    const text = extractQuotedText(inner);
    if (text === null) {
      errors++;
      exerciseCard.setOutput(
        'Das ist nicht ganz richtig. Versuche es nochmal.\n> Du brauchst Anführungszeichen um den Text. print("Dein Text")',
        false
      );
      return;
    }

    exerciseCard.stopTimer(true);
    exerciseCard.setOutput(
      `Dein Text:\n${text}\n\nGut gemacht! Du hast print() verwendet. Du kannst nun auf Weiter klicken.`,
      true
    );
    exerciseCard.enableNext();
  }
</script>

<ExercisePage
  bind:exerciseCard
  title="print - Aufgabe"
  prompt="Nun versuche es selbst. <br>Schreibe ein print-Statement, welches deinen Namen ausgibt:"
  nextHref="../variable/expl"
  backHref="../../aufgabe"
  on:validate={handleValidate}
>
  <CodeBlock>
    print("Dein Text:")<br>
    <code style="color: var(--green)"># Nun du, {$nameStore}</code><br>
    <CodeInput bind:value={inputVal} autofocus />
  </CodeBlock>
</ExercisePage>
