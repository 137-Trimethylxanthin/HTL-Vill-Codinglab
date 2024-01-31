<script lang="ts">
    import { onMount } from 'svelte';
    import { nameStore } from '../../../utils/stores';
    import { openVSCode } from '../../../utils/vscodeutils';
    import { invoke } from '@tauri-apps/api';
    import { goto } from '$app/navigation';

    let time = 0;
    let interval: any;

    onMount(() => {
        openVSCode("level2.py");
        interval = setInterval(() => {
            time++;
        }, 1000);
    });

    let status = 'Am Arbeiten';
    let valid = false;

    function checkAnswer() {
        invoke('check_python', { level: 2 }).then((result: any) => {
            if (result) {
                status = 'Erfolg';
                valid = true;
                stopTimer();
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
    <h2>bei Level 2, {$nameStore}</h2>
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
    <button class="next" style="transform: translateX(-150%);" on:click={checkAnswer}>Überprüfen</button>
    <button class="next" on:click={() => goto("exp1")}>Erklärung</button>
{:else}
<button class="next" on:click={checkAnswer}>Überprüfen</button>
{/if}