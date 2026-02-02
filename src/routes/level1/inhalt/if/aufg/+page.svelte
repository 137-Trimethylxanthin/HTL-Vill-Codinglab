<script lang="ts">
  import { onMount, tick } from "svelte";
  import type ExerciseCard from "../../../../../components/ExerciseCard.svelte";
  import CodeBlock from "../../../../../components/CodeBlock.svelte";
  import CodeInput from "../../../../../components/CodeInput.svelte";
  import ExercisePage from "../../../../../components/ExercisePage.svelte";
  import { nameStore } from "../../../../../utils/stores";
  import {
    checkComparisonPlaceholder,
    extractInputQuestion,
    isTypeMatch,
    normalizeIdentifier,
    parseAssignment,
    parseTypedAssignment,
  } from "../../../../../utils/validation";

  type InputState = "" | "correct" | "wrong" | "nameErr" | "vergleichErr" | "bothErr";

  let exerciseCard: ExerciseCard;

  let legend = "hidden";
  let success = "hidden";
  let errors = 0;

  let output = "> Das ist dein Output";
  let outputColorClass = "";

  let firstInput = "";
  let firstInputName = "";
  let firstInputQuestion = "";

  let secondInput = "";
  let secondInputName = "";
  let secondInputQuestion = "";

  let secondInputReaNew = "";
  let secondInputReaNewQuestion = "";

  let firstIf = "";
  let secondIf = "";
  let thirdIf = "";

  let fourthIf = "";
  let fifthIf = "";
  let sixthIf = "";

  // can be either "correct" or name err | vergleich err | both err
  let firstInputState: InputState = "";
  let secondInputState: InputState = "";
  let secondInputReaNewValState: InputState = "";

  let firstIfState: InputState = "";
  let secondIfState: InputState = "";
  let thirdIfState: InputState = "";

  let fourthIfState: InputState = "";
  let fifthIfState: InputState = "";
  let sixthIfState: InputState = "";

  type TypedInputCheck = { state: InputState; name: string; question: string };
  type ReInputCheck = { state: InputState; question: string };

  const vergleich = [">=", "<", "==", ">", "<=", ">="];

  function buildState(nameError: boolean, vergleichError: boolean): InputState {
    if (nameError && vergleichError) return "bothErr";
    if (nameError) return "nameErr";
    if (vergleichError) return "vergleichErr";
    return "correct";
  }

  function checkTypedInput(input: string, expectedType: "str" | "int", otherName?: string): TypedInputCheck {
    let nameError = false;
    let vergleichError = false;
    const parsed = parseTypedAssignment(input);
    if (!parsed) {
      return { state: "bothErr", name: "", question: "" };
    }

    const name = normalizeIdentifier(parsed.name);
    if (otherName && name === normalizeIdentifier(otherName)) {
      nameError = true;
    }
    if (!isTypeMatch(parsed.type, expectedType)) {
      nameError = true;
    }

    const question = extractInputQuestion(parsed.value, expectedType === "str" ? "input" : "intInput");
    if (!question) {
      vergleichError = true;
    }

    return { state: buildState(nameError, vergleichError), name, question: question ?? "" };
  }

  function checkReInput(input: string, expectedName: string): ReInputCheck {
    let nameError = false;
    let vergleichError = false;
    const parsed = parseAssignment(input);
    if (!parsed) {
      return { state: "bothErr", question: "" };
    }

    if (normalizeIdentifier(parsed.name) !== normalizeIdentifier(expectedName)) {
      nameError = true;
    }
    const question = extractInputQuestion(parsed.value, "intInput");
    if (!question) {
      vergleichError = true;
    }

    return { state: buildState(nameError, vergleichError), question: question ?? "" };
  }

  function validate() {
    firstInputName = "";
    secondInputName = "";

    outputVal1 = "";
    outputState1 = "";
    outputVal2 = "";
    outputState2 = "hidden";
    outputState3 = "hidden";
    output1ValState = "hidden";
    output2ValState = "hidden";
    output3ValState = "hidden";
    secondPartIDK = "hidden";
    outputVal3 = "";

    firstPartIDK = "hidden";

    legend = "hidden";

    let error = false;

    const firstCheck = checkTypedInput(firstInput, "str");
    firstInputState = firstCheck.state;
    firstInputName = firstCheck.name;
    firstInputQuestion = firstCheck.question;

    const secondCheck = checkTypedInput(secondInput, "int", firstInputName);
    secondInputState = secondCheck.state;
    secondInputName = secondCheck.name;
    secondInputQuestion = secondCheck.question;

    const reInputCheck = checkReInput(secondInputReaNew, secondInputName);
    secondInputReaNewValState = reInputCheck.state;
    secondInputReaNewQuestion = reInputCheck.question;

    if (
      firstInputState !== "correct" ||
      secondInputState !== "correct" ||
      secondInputReaNewValState !== "correct"
    ) {
      error = true;
    }

    const expectedNames = [
      normalizeIdentifier(secondInputName),
      normalizeIdentifier(secondInputName),
      normalizeIdentifier(firstInputName),
      normalizeIdentifier(firstInputName),
      normalizeIdentifier(firstInputName),
      normalizeIdentifier(firstInputName),
    ];
    const ifInputs = [firstIf, secondIf, thirdIf, fourthIf, fifthIf, sixthIf];
    const ifStates = [firstIfState, secondIfState, thirdIfState, fourthIfState, fifthIfState, sixthIfState];

    ifInputs.forEach((input, index) => {
      const namePosition = index < 3 ? "left" : "right";
      const result = checkComparisonPlaceholder(input, vergleich[index], expectedNames[index], namePosition);
      ifStates[index] = result.state;
      if (result.state !== "correct") {
        error = true;
      }
    });

    [firstIfState, secondIfState, thirdIfState, fourthIfState, fifthIfState, sixthIfState] = ifStates;

    if (error) {
      errors++;
      outputColorClass = "invalid-output";
      output = "> Da ist etwas schief gelaufen, schau dir die Fehler an und versuche es erneut.";
      legend = "";
      success = "hidden";
      exerciseCard.setOutput(output, false);
    } else {
      exerciseCard.stopTimer(true);
      outputColorClass = "valid-output";
      output = "";
      legend = "hidden";
      success = "";
      exerciseCard.setOutput("", true);
      exerciseCard.enableNext();
    }
  }

  let outputVal1 = "";
  let outputState1 = "";
  let outputVal2 = "";
  let outputState2 = "hidden";
  let outputVal3 = "";

  let outputState3 = "hidden";

  let output1ValState = "hidden";
  let output2ValState = "hidden";
  let output3ValState = "hidden";

  let firstPartIDK = "hidden";
  let secondPartIDK = "hidden";

  let outputInput1: HTMLInputElement | null = null;
  let outputInput2: HTMLInputElement | null = null;
  let outputInput3: HTMLInputElement | null = null;

  onMount(() => {
    const input = document.querySelector("input");
    if (input) input.focus();
  });
</script>

<ExercisePage
  bind:exerciseCard
  title="Verzweigung - Aufgabe"
  prompt="Fülle die Lücken aus, die Kommentare helfen dir dabei. <br>Du musst die Variablen und die Vergleichsoperatoren einsetzen."
  nextHref="/home"
  backHref="../../aufgabe"
  showOutput={false}
  on:validate={validate}
>
  <CodeBlock>
    <code class="comment"># Zwei Inputs für Name und Alter.</code><br>
    <code class="comment"># Der Name wird als String gespeichert, das Alter als Integer</code><br>
    <code class="comment"># Die Variablen dürfen nicht den gleichen Namen besitzen</code><br>
    <CodeInput bind:value={firstInput} state={firstInputState} placeholder="Name Var + Input" width="90%" /><br>

    <CodeInput bind:value={secondInput} state={secondInputState} placeholder="Alter Var + Input" width="90%" /><br>

    <code class="comment"># Überprüfe, ob der Benutzer volljährig ist (18 Jahre oder älter)</code><br>
    if <CodeInput bind:value={firstIf} state={firstIfState} placeholder="Var + Vergleich" width="15vw" /> 18:<br>
    &nbsp;&nbsp;&nbsp;&nbsp;print("Du bist volljährig")<br>
    else:<br>
    &nbsp;&nbsp;&nbsp;&nbsp;print("Du bist nicht volljährig")<br>

    <code class="comment"># Frage das Alter erneut ab</code><br>
    <code class="comment"># Hier benötigst du keinen ':' mehr, da du die vorhandene Variable verwendest.</code><br>
    <CodeInput
      bind:value={secondInputReaNew}
      state={secondInputReaNewValState}
      placeholder="Alter Var ohne :int oder :str + Input"
      width="90%"
    /><br>

    <code class="comment"># Überprüfe, ob der User jünger als 18 Jahre ist</code><br>
    if <CodeInput bind:value={secondIf} state={secondIfState} placeholder="Var + Vergleich" width="15vw" /> 18:<br>
    &nbsp;&nbsp;&nbsp;&nbsp;print("Du bist nicht volljährig")<br>
    else:<br>
    &nbsp;&nbsp;&nbsp;&nbsp;print("Du bist volljährig")<br>

    <code class="comment"># Überprüfe, ob der Name richtig ist (Ob die Namen identisch sind).</code><br>
    if <CodeInput bind:value={thirdIf} state={thirdIfState} placeholder="Var + Vergleich" width="15vw" /> "{$nameStore}":<br>
    &nbsp;&nbsp;&nbsp;&nbsp;print("Hallo {$nameStore}")<br>
    else:<br>
    &nbsp;&nbsp;&nbsp;&nbsp;print("Du bist nicht {$nameStore} >:(")<br>

    <code class="comment"># Als letztes setze die richtigen Vergleichsoperatoren ein.</code><br>
    <code class="comment"># len(var) einer Variable gibt die Anzahl der Buchstaben eines Strings zurück.</code><br>
    <code class="comment"># Hier steht es für dich schon.</code><br>

    <code class="comment"># Überprüfe, ob der Name weniger als 6 Buchstaben hat.</code><br>
    <code class="comment"># Hier ist .len() aber in Realität wäre es len()</code><br>
    if 6 <CodeInput bind:value={fourthIf} state={fourthIfState} placeholder="Vergleich + Var" width="10vw" />.len():<br>
    &nbsp;&nbsp;&nbsp;&nbsp;print("Dein Name ist echt kurz O.o")<br>
    <code class="comment"># Überprüfe, ob die Anzahl zwischen 6 und 13 liegt</code><br>
    elif 6 <CodeInput bind:value={fifthIf} state={fifthIfState} placeholder="Vergleich + Var" width="10vw" />.len() and 13 <CodeInput
      bind:value={sixthIf}
      state={sixthIfState}
      placeholder="Vergleich + Var"
      width="10vw"
    />.len():<br>
    &nbsp;&nbsp;&nbsp;&nbsp;print("Du hast einen normal langen Namen ._.")<br>
    <code class="comment"># else wird ausgeführt, wenn die Anzahl der Buchstaben über 13 ist</code><br>
    else:<br>
    &nbsp;&nbsp;&nbsp;&nbsp;print("Dein Name ist echt lang (⊙ˍ⊙)")<br>
  </CodeBlock>

  <div class="interactive-console">
    <div class="cmd {outputColorClass}">
      <code class="{legend}"><code style="color: var(--yellow); font-weight:600; font-size: 2vh">> Wenn du einen Namen von deinen Variablen falsch geschrieben hast,<br>> wird dir der Fehler in gelb angezeigt (:str und :int zählen hier dazu).</code><br>
      <code style="color: var(--red); font-weight:600; font-size: 2vh">> Wenn du einen Vergleichsoperator falsch eingesetzt hast,<br>> wird er dir in rot angezeigt. <br>> Falls dein input falsch ist, wird dieser rot angezeigt.</code><br>
      <code style="color: var(--mauve); font-weight:600; font-size: 2vh">> Wenn du beides falsch gemacht hast,<br>> wird dir das Eingabefeld in lila angezeigt.</code></code><code class="{success}"><code class="{outputState1}">> <code style="color: var(--peach);">{firstInputQuestion}</code> <input
          autocomplete="off"
          style="width: 10vw;"
          type="text"
          bind:value={outputVal1}
          bind:this={outputInput1}
          class="inline-input {outputState1}"
          on:keypress={async (e) => {
            if (e.key === "Enter") {
              outputState1 = "hidden";
              outputState2 = "";
              output1ValState = "";
              await tick();
              outputInput2?.focus();
            }
          }}
        /></code><code class="{output1ValState}">> <code style="color: var(--peach);">{firstInputQuestion}</code> <code style="color: var(--teal);">{outputVal1}</code></code><br>
      <code class="{outputState2}">> <code style="color: var(--peach);">{secondInputQuestion}</code> <input
          autocomplete="off"
          style="width: 10vw;"
          type="number"
          bind:value={outputVal2}
          bind:this={outputInput2}
          class="inline-input {outputState2}"
          on:keypress={async (e) => {
            if (e.key === "Enter") {
              outputState2 = "hidden";
              outputState3 = "";
              output2ValState = "";
              firstPartIDK = "";
              await tick();
              outputInput3?.focus();
            }
          }}
        /></code><code class="{output2ValState}">> <code style="color: var(--peach);">{secondInputQuestion}</code> <code style="color: var(--teal);">{outputVal2}</code></code><br>
      {#if parseInt(outputVal2) >= 18}<code class="{firstPartIDK}">> Du bist volljährig</code>{:else}<code class="{firstPartIDK}">> Du bist nicht volljährig</code>{/if}<br>
      <code class="{outputState3}">> <code style="color: var(--peach);">{secondInputReaNewQuestion}</code> <input
          autocomplete="off"
          style="width: 10vw;"
          type="number"
          bind:value={outputVal3}
          bind:this={outputInput3}
          class="inline-input {outputState3}"
          on:keypress={(e) => {
            if (e.key === "Enter") {
              outputState3 = "hidden";
              output3ValState = "";
              secondPartIDK = "";
              exerciseCard.enableNext();
            }
          }}
        /></code><code class="{output3ValState}">> <code style="color: var(--peach);">{secondInputReaNewQuestion}</code> <code style="color: var(--teal);">{outputVal3}</code></code><br>
      <code class="{secondPartIDK}">{#if parseInt(outputVal3) < 18}<code>> Du bist nicht volljährig</code>{:else}<code>> Du bist volljährig</code>{/if}<br>
      {#if outputVal1 === $nameStore} <code>> Hallo {$nameStore}</code>{:else}<code>> Du bist nicht {$nameStore} >:(</code>{/if}<br>
      {#if outputVal1.length < 6}<code>> Dein Name ist echt kurz O.o</code>{:else if outputVal1.length >= 6 || outputVal1.length <= 13}<code>> Du hast einen normal langen Namen ._.</code>{:else}<code>> Dein Name ist echt lang (⊙ˍ⊙)</code>{/if}</code>
    </code>
  </div>
  </div>
</ExercisePage>
