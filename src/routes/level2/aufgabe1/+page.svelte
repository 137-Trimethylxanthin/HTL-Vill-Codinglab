<script lang="ts">
    import { onMount } from 'svelte';
    import { nameStore } from '../../../utils/stores';
    import { openVSCode } from '../../../utils/vscodeutils';
  import { invoke } from '@tauri-apps/api';

    let time = 0;
    let interval: any;

    onMount(() => {
        openVSCode("level2.py");
        interval = setInterval(() => {
            time++;
        }, 1000);
    });

    let status = 'Am Arbeiten';

    function checkAnswer() {
        invoke('check_python', { level: 2 }).then((result: any) => {
            if (result) {
                status = 'Erfolg';
                stopTimer();
            } else {
                status = 'Fehler';
            }
        });
    }

    function stopTimer() {
        clearInterval(interval);
    }
</script>

<main>
    <h1>Viel Erfolg bei Level 2, {$nameStore}</h1>
    <div class="timer">
        <p>{String(Math.floor(time / 60)).padStart(2, '0')}:{String(time % 60).padStart(2, '0')}</p>
    </div>
    <button on:click={checkAnswer}>Überprüfen</button>
    <p class="status">Status: {status}</p>
</main>

<style>
    main {
        text-align: center;
    }

    .timer {
        font-size: 2rem;
    }
</style>
