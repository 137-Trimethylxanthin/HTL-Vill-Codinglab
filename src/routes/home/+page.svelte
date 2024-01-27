<script lang="ts">
    import { nameStore } from "../../utils/stores";
    import { goto } from "$app/navigation";

    if ($nameStore === "") {
        goto('/');
    }
</script>

<div>
    <h1>Hallo {$nameStore}, jetzt können wir loslegen!</h1>
    <p>WIP</p>
</div>