<script lang="ts">
  import LevelLayout from "../../../components/LevelLayout.svelte";
  import { page } from "$app/stores";

  $: {
    const pathParts = $page.url.pathname.split("/");
    const mode = pathParts.pop();
    const level = pathParts.pop() as string;
    return { level, mode };
  }
</script>

<LevelLayout levelNumber={1} levelName={$page.url.pathname.split("/").slice(-2, -1)[0] || ""}>
  <slot />
</LevelLayout>
