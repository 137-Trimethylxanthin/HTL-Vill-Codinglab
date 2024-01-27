<script lang="ts">
    import { invoke } from '@tauri-apps/api';
	import { message } from '@tauri-apps/api/dialog';
	import { nameStore } from '../utils/stores';
	import { goto } from '$app/navigation';

    function openCodeWithFilename(fileName: string) {
        return function() {
            invoke('open_code_with_filename', { fileName });
        }
    }

    function setupUser(e: SubmitEvent) {
        const name = (e.target as any).vorname.value;
        invoke('setup_user', { name }).then((res) => {
            if (res) {
                nameStore.set(name);
                goto('/home');
            } else {
                message("User konnte nicht erstellt werden, bereits eingeloggt?");
            }
        })
    }
</script>

<div >
    <h1>Wilkommen in der Programmierwerkstatt!</h1>
    <p>Gebe bitte deinen Vornamen ein, damit wir dich ansprechen können.</p>
    <form on:submit|preventDefault={setupUser}>
        <label for="vorname">Vorname:</label><br />
        <input type="text" id="name" name="vorname" required placeholder="Vorname"/><br />
        <button type="submit">Starten</button>
    </form>
</div>
