<script lang="ts">
import {nameStore} from "../../utils/stores";
import {goto} from "$app/navigation";

function switchLevel(level: number) {
    return () => {
        goto(`/level_${level}`);
    }
}

</script>

<div class="title">
    <h1>Willkommen {$nameStore}</h1>
    <h2>zum tag der Offen türe bei der <b>HTL</b></h2>
</div>


<div class="startText">
    <p>Hier wirst du Heute probieren die Grundlagen des <b>Programmierens</b> in python zu lernen</p>
    <p>Wähle eines der 3 verschiedenen Level aus um zu starten (du kannst Level überspringen)</p>
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