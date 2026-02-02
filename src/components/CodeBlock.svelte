<script lang="ts">
  import { highlightCode } from "../utils/highlight";

  export let code: string = "";
  export let language: string = "python";
  export let theme: string = "github-dark";
  export let useHighlight: boolean = true;

  let rendered = "";
  let renderKey = "";

  function escapeHtml(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  async function render() {
    try {
      rendered = await highlightCode(code, language, theme);
    } catch (error) {
      rendered = `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
    }
  }

  $: {
    if (code && useHighlight) {
      const nextKey = `${language}|${theme}|${code}`;
      if (nextKey !== renderKey) {
        renderKey = nextKey;
        render();
      }
    }
  }
</script>

<div class="codeBlock">
  {#if code}
    {#if useHighlight}
      {@html rendered}
    {:else}
      <pre class="codeBlock__pre"><code>{code}</code></pre>
    {/if}
  {:else}
    <div class="codeBlock__slot"><slot /></div>
  {/if}
</div>

<style>
  .codeBlock {
    width: 100%;
    font-family: "Fira Code", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;
  }

  .codeBlock__pre {
    white-space: pre-wrap;
  }

  .codeBlock :global(pre.shiki) {
    margin: 0;
    background: transparent !important;
    padding: 0;
    white-space: pre-wrap;
  }

  .codeBlock :global(pre.shiki code) {
    display: block;
    white-space: pre-wrap;
    font-family: inherit;
    font-size: inherit;
  }

  .codeBlock__slot {
    white-space: normal;
  }
</style>

