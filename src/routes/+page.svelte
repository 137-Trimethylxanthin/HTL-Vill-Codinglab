<script lang="ts">
    import { invoke } from '@tauri-apps/api/core';
	import { message } from '@tauri-apps/plugin-dialog';
	import { nameStore } from '../utils/stores';
	import { goto } from '$app/navigation';

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

<div class="loginContainer" >
    <h1>Willkommen im Coding Lab!</h1>
    <p>Gebe bitte deinen Vornamen ein, damit wir dich ansprechen können.</p>
    <form on:submit|preventDefault={setupUser}>
        <label for="vorname">Vorname:</label><br />
        <input type="text" id="name" name="vorname" required placeholder="Vorname" autocomplete="off"/><br />
        <button type="submit">Starten</button>
    </form>
</div>
