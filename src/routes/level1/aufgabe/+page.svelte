<script lang="ts">
    import { goto } from "$app/navigation";

    function switchSubLevel(sub: string ) {
        return () => {
            goto(`/level1/inhalt/${sub}/expl`);
        }
    }
</script>

<div class="title">
    <h2>Wähle ein Thema aus, um zu beginnen</h2>
</div>


<div class="levelSelect">
    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("print")}>Ausgabe</button>
        <div class="tooltip">
            Hier lernst du Zeichen auf dem Bildschirm auszugeben.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("variable")}>Variablen</button>
        <div class="tooltip">
            Hier lernst du Daten zu speichern und diese zu verarbeiten.
        </div>
    </div>
    
    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("input")}>Eingabe</button>
        <div class="tooltip">
            Hier lernst du Eingaben vom Benutzer einzulesen.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchSubLevel("if")}>Verzweigung</button>
        <div class="tooltip">
            Hier lernst du dein Programm zu verzweigen.
        </div>
    </div>
</div>