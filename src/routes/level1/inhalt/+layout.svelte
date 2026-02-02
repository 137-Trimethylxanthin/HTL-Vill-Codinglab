<script lang="ts">
  import LevelLayout from "../../../components/LevelLayout.svelte";
  import { page } from "$app/stores";

</script>

<LevelLayout levelNumber={1} levelName={$page.url.pathname.split("/").slice(-2, -1)[0] || ""}>
  <slot />
</LevelLayout>
