<script lang="ts">
import { nameStore } from "../../utils/stores";
import { goto } from "$app/navigation";

function switchLevel(level: number) {
    return () => {
        goto(`/level_${level}/exp1`);
    }
}
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
        <button class="levelbtn" on:click={switchLevel(1)}>Level 1</button>
        <div class="tooltip">
            Dieses Level ist für komplette Anfänger die noch nie programmiert haben. <br>
            Hier werden dir die Grundlagen beigebracht.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchLevel(2)}>Level 2</button>
        <div class="tooltip">
            Dieses Level ist für Leute die schon ein mal Programmiert haben. <br>
            Es gibt eine Erklärung zu den Funktionen die du brauchst.
        </div>
    </div>

    <div class="tooltip-container">
        <button class="levelbtn" on:click={switchLevel(3)} >Level 3</button>
        <div class="tooltip">
            Ein Level für die Profis. <br>
            Hier solltest du bereits die Grundlagen von Python kennen (oder die vorherigen Level gemacht haben).
        </div>
    </div>

</div>