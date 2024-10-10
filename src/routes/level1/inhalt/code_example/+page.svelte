<script lang="ts">
    import { onMount } from 'svelte';
    import { nameStore } from '../../../../utils/stores';
    import { openVSCode } from '../../../../utils/vscodeutils';
    import { invoke } from '@tauri-apps/api/core';
    import { goto } from '$app/navigation';
    import { message } from '@tauri-apps/plugin-dialog';

    let time = 0;
    let interval: any;

    onMount(() => {
        openVSCode("level1.py");
        interval = setInterval(() => {
            time++;
        }, 1000);
    });

    let status = 'Am Arbeiten';
    let valid = false;

    function levelCompleted() {
        invoke('level_completed', { level: 1, time }).then((result: any) => {
            if (!result[0]) {
                message('Level 1 konnte nicht gespeichert werden', { title: 'Fehler' })
            }
            alert('Level 1 erfolgreich abgeschlossen. Score: ' + result[1]);
        });
    }

    function checkAnswer() {
        invoke('check_python', { level: 1 }).then((result: any) => {
            if (result) {
                status = 'Erfolg';
                valid = true;
                stopTimer();
                levelCompleted();
            } else {
                status = 'Fehler';
                valid = false;
            }
        });
    }

    function stopTimer() {
        clearInterval(interval);
    }
</script>

<div class="lernContainer">
    <h1 style="margin-bottom: 1vh;">Viel Erfolg</h1>
    <h2>bei Level 1, {$nameStore}</h2>
    <h1 class="timer">
        {String(Math.floor(time / 60)).padStart(2, '0')}:{String(time % 60).padStart(2, '0')}
    </h1>
    <p>Status:
        {#if status == "Fehler"}
            <span style="color: var(--red);">{status}</span>
        {:else if status == "Erfolg"}
            <span style="color: var(--green);">{status}</span>
        {:else}
            {status}
        {/if}
</div>

{#if valid}
    <button class="next" on:click={() => goto("/home")}>Home</button>
{:else}
    <button class="next" on:click={checkAnswer}>Überprüfen</button>
{/if}