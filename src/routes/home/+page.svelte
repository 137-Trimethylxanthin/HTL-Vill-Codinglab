<script lang="ts">
    import { nameStore } from "../../utils/stores";
    import { goto } from "$app/navigation";
    import { invoke } from "@tauri-apps/api";
  import { writable, type Writable } from "svelte/store";

    function switchLevel(level: number) {
        return () => {
            goto(`/level${level}/aufgabe`);
        }
    }

    let levels: Writable<any[]> = writable([]);

    invoke("get_levels").then((res: any) => {
        if (res) {
            levels.set(res)
        }
    });
</script>

<div class="title">
    <h1>Willkommen {$nameStore}</h1>
    <h2>zum Tag der offenen Tür der <b>HTL Villach</b></h2>
</div>


<div class="startText">
    <p>Beim Coding Lab lernst du die Grundlagen der <b>Programmierung</b> in Python.</p>
    <p>Wähle eines der drei verschiedenen Level aus, um zu beginnen. Du kannst ein beliebiges Level auswählen, aber Anfänger sollten mit Level 1 beginnen.</p>
</div>


<div class="levelSelect">
    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchLevel(1)}>Level 1
        {#if $levels[0] !== undefined && $levels[0][0] === true}
            <span class="icon">&#10004;</span>
            <span class="time">{String(Math.floor($levels[1][0] / 60)).padStart(2, '0')}:{String($levels[1][0] % 60).padStart(2, '0')}</span>
        {/if}
        </button>
        <div class="tooltip">
            Dieses Level ist für komplette Anfänger die noch nie programmiert haben. <br>
            Hier werden dir die Grundlagen beigebracht.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchLevel(2)}>Level 2
        {#if $levels[0] !== undefined && $levels[0][1] === true}
            <span class="icon">&#10004;</span>
            <span class="time">{String(Math.floor($levels[1][1] / 60)).padStart(2, '0')}:{String($levels[1][1] % 60).padStart(2, '0')}</span>
        {/if}
        </button>
        <div class="tooltip">
            Dieses Level ist für Leute die schon ein mal Programmiert haben. <br>
            Es gibt eine Erklärung zu den Funktionen die du brauchst.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchLevel(3)} >Level 3
        {#if $levels[0] !== undefined && $levels[0][2] === true}
            <span class="icon">&#10004;</span>
            <span class="time">{String(Math.floor($levels[1][2] / 60)).padStart(2, '0')}:{String($levels[1][2] % 60).padStart(2, '0')}</span>
        {/if}
        </button>
        <div class="tooltip">
            Ein Level für die Profis. <br>
            Hier solltest du bereits die Grundlagen von Python kennen (oder die vorherigen Level gemacht haben).
        </div>
    </div>
</div>

<style>
    .time {
        font-size: 2vh;
        margin-left: 1vh;
        color: var(--text);
        background-color: var(--overlay0);
        padding: 0.5vh;
        border-radius: 0.5vh;
    }

    .icon {
        font-size: 2vh;
        position: absolute;
        right: 2vw;
        color: var(--green);
        /* top: 0.5vh; */
    }
</style>