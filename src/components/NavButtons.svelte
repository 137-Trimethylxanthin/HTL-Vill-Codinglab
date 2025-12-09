<script lang="ts">
  import { goto } from "$app/navigation";
  import { createEventDispatcher } from "svelte";

  export let nextHref: string | null = null;
  export let backHref: string | null = null;
  export let nextLabel: string = "Weiter";
  export let backLabel: string = "Zurück";
  export let nextDisabled: boolean = false;
  export let backDisabled: boolean = false;
  export let showNext: boolean = true;
  export let showBack: boolean = true;

  const dispatch = createEventDispatcher();

  function handleNext() {
    if (nextHref && !nextDisabled) {
      dispatch("next");
      goto(nextHref);
    }
  }

  function handleBack() {
    if (backHref && !backDisabled) {
      dispatch("back");
      goto(backHref);
    }
  }
</script>

<div class="nav-buttons">
  {#if showNext}
    <button 
      class="next" 
      on:click={handleNext}
      disabled={nextDisabled || !nextHref}
    >
      {nextLabel}
    </button>
  {/if}
  {#if showBack}
    <button 
      class="back" 
      on:click={handleBack}
      disabled={backDisabled || !backHref}
    >
      {backLabel}
    </button>
  {/if}
</div>

<style>
  .nav-buttons {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }
</style>

