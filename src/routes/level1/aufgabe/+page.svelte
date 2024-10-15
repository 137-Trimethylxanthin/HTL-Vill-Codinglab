<script lang="ts">
    import { goto } from "$app/navigation";
    import { invoke } from "@tauri-apps/api/core";
    import { level1Store } from "../../../utils/stores";
    

    function switchSubLevel(sub: string ) {
        return () => {
            goto(`/level1/inhalt/${sub}/expl`);
        }
    }

    let printTime = 10;
    let variableTime = 0;
    let inputTime = 0;
    let ifTime = 0;

    function checkCompleted() {
        console.log(Object.keys($level1Store));
        if (Object.keys($level1Store).includes("print")) {
            printTime = $level1Store["print"].time;
        }
        if (Object.keys($level1Store).includes("variable")) {
            variableTime = $level1Store["variable"].time;
        }
        if (Object.keys($level1Store).includes("input")) {
            inputTime = $level1Store["input"].time;
        }
        if (Object.keys($level1Store).includes("if")) {
            ifTime = $level1Store["if"].time;
        }
    }

    checkCompleted();

    
    
</script>

<div class="title">
    <h2>Wähle ein Thema aus, um zu beginnen</h2>
</div>


<div class="levelSelect">
    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("print")} >Ausgabe
        </button>


        <div class="tooltip">
            Hier lernst du Zeichen auf dem Bildschirm auszugeben.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("variable")}  >Variablen
        </button>
        <div class="tooltip">
            Hier lernst du Daten zu speichern und diese zu verarbeiten.
        </div>
    </div>
    
    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("input")}  >Eingabe
        </button>
        <div class="tooltip">
            Hier lernst du Eingaben vom Benutzer einzulesen.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("if")} >Verzweigung
        </button>
        <div class="tooltip">
            Hier lernst du dein Programm zu verzweigen.
        </div>
    </div>
</div>