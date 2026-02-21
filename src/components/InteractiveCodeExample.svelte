<script lang="ts">
  import CodeBlock from "./CodeBlock.svelte";
  import ConsoleOutput from "./ConsoleOutput.svelte";

  export let codeLabel: string = "Code:";
  export let outputLabel: string = "Output:";
  export let showCode: boolean = true;
  export let showOutput: boolean = true;
  export let code: string = "";
  export let language: string = "python";
  export let output: string = "";
</script>

{#if showCode}
  <p class="noMargin">{codeLabel}</p>
  <CodeBlock code={code} language={language}>
    <slot name="code" />
  </CodeBlock>
{/if}

{#if showOutput}
  <p class="noMargin">{outputLabel}</p>
  <ConsoleOutput output={output}>
    <slot name="output" />
  </ConsoleOutput>
{/if}

