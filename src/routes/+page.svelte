<script lang="ts">
    import SMTPCredentialsModal from '../components/SMTPCredentialsModal.svelte';
    import { invoke } from '@tauri-apps/api/core';
	import { message } from '@tauri-apps/plugin-dialog';
	import { nameStore, level1Store, level2Store, level3Store } from '../utils/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
    import { randomName } from '../utils/lib';

 

    let showSMTPCredentialsModal = false;

    onMount(async () => {
        const hasCredentials = await invoke('has_smtp_credentials');
        if (!hasCredentials) {
            showSMTPCredentialsModal = true;
        }
    });

    function handleCloseModal() {
        showSMTPCredentialsModal = false;
    }

    function setupUser(e: SubmitEvent) {
        let name = (e.target as any).vorname.value;
        if (!name) {
            name = `NoUser_${randomName()}`;
        }
        invoke('setup_user', { name }).then((res) => {
            if (res) {
                nameStore.set(name.startsWith('NoUser_') ? undefined : name);
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
        <input type="text" id="name" name="vorname" placeholder="Vorname (optional)" autocomplete="off"/><br />
        <button class="loginButton" type="submit">Starten</button>
    </form>
    {#if showSMTPCredentialsModal}
        <SMTPCredentialsModal on:close={handleCloseModal} />
    {/if}
</div>


