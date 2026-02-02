<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import LessonCard from "./LessonCard.svelte";
  import NavButtons from "./NavButtons.svelte";

  export let title: string;
  export let nextHref: string | null = null;
  export let backHref: string | null = null;

  const dispatch = createEventDispatcher();

  function handleNext() {
    dispatch("next");
  }

  function handleBack() {
    dispatch("back");
  }
</script>

<LessonCard {title}>
  <slot />
</LessonCard>

<NavButtons {nextHref} {backHref} on:next={handleNext} on:back={handleBack} />
