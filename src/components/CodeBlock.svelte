<script lang="ts">
  export let code: string = "";
</script>

<pre class="codeBlock">
  {#if code}
    {@html code}
  {:else}
    <slot />
  {/if}
</pre>

