<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import ExerciseCard from "./ExerciseCard.svelte";

  export let exerciseCard: ExerciseCard | null = null;
  export let title: string;
  export let prompt: string;
  export let nextHref: string | null = null;
  export let backHref: string | null = null;
  export let validateButtonLabel = "Ausführen";
  export let initialOutput = "";
  export let autofocus = false;
  export let showOutput = true;

  const dispatch = createEventDispatcher();

  function handleValidate() {
    dispatch("validate");
  }

  function handleNext() {
    dispatch("next");
  }

  function handleBack() {
    dispatch("back");
  }
</script>

<ExerciseCard
  bind:this={exerciseCard}
  {title}
  {prompt}
  {nextHref}
  {backHref}
  {validateButtonLabel}
  {initialOutput}
  {autofocus}
  {showOutput}
  on:validate={handleValidate}
  on:next={handleNext}
  on:back={handleBack}
>
  <slot />
  <slot name="after" />
</ExerciseCard>
