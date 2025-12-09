<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import CodeBlock from "./CodeBlock.svelte";
  import ConsoleOutput from "./ConsoleOutput.svelte";
  import NavButtons from "./NavButtons.svelte";

  export let title: string;
  export let prompt: string = "";
  export let nextHref: string | null = null;
  export let backHref: string | null = null;
  export let validateButtonLabel: string = "Ausführen";
  export let initialOutput: string = "> Hier ist dein Output";
  export let autofocus: boolean = true;

  const dispatch = createEventDispatcher();

  let output = initialOutput;
  let outputState: boolean | null = null;
  let errors = 0;
  let timerStopped = false;
  let nextDisabled = true;

  export function setOutput(text: string, isValid: boolean | null = null) {
    output = text;
    outputState = isValid;
  }

  export function enableNext() {
    nextDisabled = false;
  }

  export function disableNext() {
    nextDisabled = true;
  }

  export function stopTimer(finished: boolean) {
    if (timerStopped) return;
    timerStopped = true;
    document.dispatchEvent(
      new CustomEvent("finishTimer", {
        detail: {
          finished,
          error: errors,
        },
      })
    );
  }

  function handleValidate() {
    dispatch("validate");
  }

  function handleNext() {
    dispatch("next");
  }

  function handleBack() {
    if (!timerStopped) {
      stopTimer(false);
    }
    dispatch("back");
  }

  onMount(() => {
    if (autofocus) {
      const input = document.querySelector("input");
      if (input) input.focus();
    }
  });
</script>

<div class="lernContainer">
  <h1>{title}</h1>
  {#if prompt}
    <p>{@html prompt}</p>
  {/if}

  <slot />

  <button class="validate" on:click={handleValidate}>
    {validateButtonLabel}
  </button>

  <ConsoleOutput output={output} isValid={outputState} />
</div>

<NavButtons
  {nextHref}
  {backHref}
  {nextDisabled}
  on:next={handleNext}
  on:back={handleBack}
/>

