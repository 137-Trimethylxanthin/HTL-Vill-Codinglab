<script lang="ts">
    import { goto } from "$app/navigation";
    import { invoke } from "@tauri-apps/api/core";
    import { writable, type Writable } from "svelte/store";

    function switchSubLevel(sub: string ) {
        return () => {
            goto(`/level1/inhalt/${sub}/expl`);
        }
    }

    let sub_leves: Writable<any[]> = writable([]);

    invoke("get_sub_levels").then((res: any) => { // i need the times for the sublevels
        if (res) {
            sub_leves.set(res)
        }
    });
</script>

<div class="title">
    <h2>Wähle ein Thema aus um zu beginnen</h2>
</div>


<div class="levelSelect">
    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("print")}>Print
        {#if $sub_leves[0] !== undefined && $sub_leves[0][0] === true}
            <span class="icon">&#10004;</span>
            <span class="time">{String(Math.floor($sub_leves[1][0] / 60)).padStart(2, '0')}:{String($sub_leves[1][0] % 60).padStart(2, '0')}</span>
        {/if}
        </button>
        <div class="tooltip">
            Hier lernst du Wörter auf dem Bildschirm auszugeben.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("variable")}>Variablen
        {#if $sub_leves[0] !== undefined && $sub_leves[0][1] === true}
            <span class="icon">&#10004;</span>
            <span class="time">{String(Math.floor($sub_leves[1][1] / 60)).padStart(2, '0')}:{String($sub_leves[1][1] % 60).padStart(2, '0')}</span>
        {/if}
        </button>
        <div class="tooltip">
            Hier lernst du daten zu speichern.
        </div>
    </div>
    
    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("input")}>Input
        {#if $sub_leves[0] !== undefined && $sub_leves[0][2] === true}
            <span class="icon">&#10004;</span>
            <span class="time">{String(Math.floor($sub_leves[1][2] / 60)).padStart(2, '0')}:{String($sub_leves[1][2] % 60).padStart(2, '0')}</span>
        {/if}
        </button>
        <div class="tooltip">
            Hier lernst du eingaben vom Benutzer zu nehmen.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("if")}>If
        {#if $sub_leves[0] !== undefined && $sub_leves[0][3] === true}
            <span class="icon">&#10004;</span>
            <span class="time">{String(Math.floor($sub_leves[1][3] / 60)).padStart(2, '0')}:{String($sub_leves[1][3] % 60).padStart(2, '0')}</span>
        {/if}
        </button>
        <div class="tooltip">
            Hier lernst du bedingungen zu setzen.
        </div>
    </div>
</div>