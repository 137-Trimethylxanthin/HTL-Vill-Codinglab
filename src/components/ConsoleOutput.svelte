<script lang="ts">
  export let output: string = "";
  export let isValid: boolean | null = null; // null = neutral, true = valid, false = invalid
</script>

<pre class="cmd" class:valid-output={isValid === true} class:invalid-output={isValid === false}>
  {#if output}
    {@html output}
  {:else}
    <slot />
  {/if}
</pre>

