<script lang="ts">
  import CodeBlock from "./CodeBlock.svelte";
  import ConsoleOutput from "./ConsoleOutput.svelte";
  import CodeInput from "./CodeInput.svelte";

  export let codeLabel: string = "Code:";
  export let outputLabel: string = "Output:";
  export let showCode: boolean = true;
  export let showOutput: boolean = true;
</script>

{#if showCode}
  <p class="noMargin">{codeLabel}</p>
  <CodeBlock>
    <slot name="code" />
  </CodeBlock>
{/if}

{#if showOutput}
  <p class="noMargin">{outputLabel}</p>
  <ConsoleOutput>
    <slot name="output" />
  </ConsoleOutput>
{/if}

