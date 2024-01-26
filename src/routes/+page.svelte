<script lang="ts">
    import { invoke } from '@tauri-apps/api';
	import { message } from '@tauri-apps/api/dialog';

    function openCodeWithFilename(fileName: string) {
        return function() {
            invoke('open_code_with_filename', { fileName });
        }
    }

    function setupUser(e: SubmitEvent) {
        const name = "Max";
        invoke('setup_user', { name }).then((res) => {
            console.log(res)
            if (res) {
                message("User wurde erstellt")
            } else {
                message("User konnte nicht erstellt werden, bereits eingeloggt?")
            }
        })
    }
</script>

<div >
    <h1>Wilkommen in der Programmierwerkstatt!</h1>
    <p>Gebe bitte deinen Vornamen ein, damit wir dich ansprechen können.</p>
    <form on:submit|preventDefault={setupUser}>
        <label for="name">Vorname:</label> <br />
        <input type="text" id="name" name="name" required placeholder="Vorname"/> <br />
        <button type="submit">Submit</button>
    </form>
</div>
