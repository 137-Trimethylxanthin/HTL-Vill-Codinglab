<script lang="ts">
    import { nameStore } from "../../utils/stores";
    import { goto } from "$app/navigation";
    import { invoke } from "@tauri-apps/api/core";
    import { writable, type Writable } from "svelte/store";

    function switchLevel(level: number) {
        return () => {
            goto(`/level${level}/aufgabe`);
        }
    }

    let levels: Writable<any[]> = writable([]);

    invoke("get_levels").then((res: any) => {
        if (res) {
            levels.set(res);
        }
    });
</script>

<div class="title">
    <h1>Willkommen {$nameStore === undefined ? "" : $nameStore}</h1>
    <h2><b>HTL Villach</b> - Abteilung Informatik</h2>
</div>


<div class="startText">
    <p>Im Coding Lab lernst du die Grundlagen der <b>Programmierung</b> in Python.</p>
    <p>Wähle eines der drei verschiedenen Level aus, um zu beginnen.</p>
</div>


<div class="levelSelect">
    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchLevel(1)}>Level 1
        {#if $levels[0] !== undefined && $levels[0][0] === true}
            <span class="icon">&#10004;</span>
            <div class="infos">
                <span class="time">{String(Math.floor($levels[1][0] / 60)).padStart(2, '0')}:{String($levels[1][0] % 60).padStart(2, '0')}</span>
                <span class="score">{$levels[2][0]}/100</span>
            </div>
        {/if}
        </button>
        <div class="tooltip">
            Dieses Level ist für komplette Anfänger, die noch nie programmiert haben. <br>
            Hier werden dir die Grundlagen beigebracht.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchLevel(2)}>Level 2
        {#if $levels[0] !== undefined && $levels[0][1] === true}
            <span class="icon">&#10004;</span>
            <div class="infos">
                <span class="time">{String(Math.floor($levels[1][1] / 60)).padStart(2, '0')}:{String($levels[1][1] % 60).padStart(2, '0')}</span>
                <span class="score">{$levels[2][1]}/100</span>
            </div>
        {/if}
        </button>
        <div class="tooltip">
            Dieses Level ist für jene, die schon einmal programmiert haben. <br>
            Es gibt eine Erklärung zu den Funktionen, die du brauchst.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchLevel(3)} >Level 3
        {#if $levels[0] !== undefined && $levels[0][2] === true}
            <span class="icon">&#10004;</span>
            <div class="infos">
                <span class="time">{String(Math.floor($levels[1][2] / 60)).padStart(2, '0')}:{String($levels[1][2] % 60).padStart(2, '0')}</span>
                <span class="score">{$levels[2][2]}/100</span>
            </div>
        {/if}
        </button>
        <div class="tooltip">
            Ein Level für Profis. <br>
            Hier solltest du bereits die Grundlagen von Python kennen (oder die vorherigen Levels absolviert haben).
        </div>
    </div>
    {#if $levels[0] !== undefined && $levels[0][0] && $levels[0][1] && $levels[0][2]}
        <p class="congrats">Gratulation! Du hast alle Levels geschafft!</p>
    {/if}
</div>

<style>

    .infos {
        display: flex;
        flex-direction: row;
        align-items: center;
    }

    .time {
        font-size: 2vh;
        margin-left: 1vh;
        color: var(--text);
        background-color: var(--overlay0);
        padding: 0.5vh;
        border-radius: 0.5vh;
    }

    .score {
        font-size: 2vh;
        margin-left: 1vh;
        color: var(--text);
        background-color: var(--overlay0);
        padding: 0.5vh;
        border-radius: 0.5vh;
    }

    .icon {
        font-size: 3vh;
        position: absolute;
        right: 2vw;
        color: var(--green);
    }

    .congrats {
        font-size: 2vh;
        margin-bottom: 2vh;
        color: var(--text);
    }
</style>