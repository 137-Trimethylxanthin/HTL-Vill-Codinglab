<script lang="ts">
  import { invoke } from "@tauri-apps/api";
    import { nameStore } from "../../utils/stores";
  import { message } from "@tauri-apps/api/dialog";

    function checkCode(event: Event) {
        event.preventDefault();
        const code = (document.getElementById("code") as HTMLTextAreaElement).value;
        invoke("check_python", { code }).then((res) => {
            if (res) {
                message("Dein Code ist korrekt!", "Erfolg");
            } else {
                message("Dein Code ist nicht korrekt!", "Fehler");
            }
        });
    }
</script>

<div>
    <h1>Hallo {$nameStore}, jetzt können wir loslegen!</h1>
    <p>WIP</p>
    <form on:submit|preventDefault={checkCode}>
        <textarea name="code" id="code" cols="30" rows="10"></textarea>
        <button type="submit">Submit</button>
    </form>
</div>