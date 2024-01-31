<script>
    import {goto} from "$app/navigation";

    function startLvl(){
        console.log("start lvl 1");
        goto("inhalt/print/expl");
    }

</script>


<div id="level1Div">
    <h1>Level 1</h1>

    <p>Hier wirst du die Grundlagen von Python lernen:</p>
    <ul class="index">
        <li>print (Textausgabe)</li>
        <li>input (Texteingabe)</li>
        <li>int (Einlesen von Nummern)</li>
        <li>variablen (Speichern von Daten)</li>
        <li>if (Vergleichen von Variablen)</li>
        <li> =, &gt;, &lt;, ! (Vergleichsoperatoren)</li>
    </ul>

    <p>Bist du bereit?</p>
    <button on:click={startLvl}>Start</button>


</div>
