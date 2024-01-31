<script>
    import {goto} from "$app/navigation";

    function startLvl(){
        console.log("start lvl 1");
        goto("inhalt/print/expl");
    }

</script>


<div id="level1Div">
    <h1>Level 1</h1>

    <p>Hier wirst du über die Grundlagen zu python lernen:</p>
    <ul class="index">
        <li>Print (Text Ausgabe)</li>
        <li>Input (Text Eingabe)</li>
        <li>Int (Einlesen von Nummern)</li>
        <li>Variable (Speichern von Daten)</li>
        <li>if (Vergleichen von Variable)</li>
        <li> = &gt; &lt; ! (Vergleich Operatoren)</li>
    </ul>

    <p>Bist du Bereit?</p>
    <button on:click={startLvl}>Start</button>


</div>
