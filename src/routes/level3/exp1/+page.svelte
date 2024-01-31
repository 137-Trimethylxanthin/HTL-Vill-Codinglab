<script lang="ts">
    import { goto } from '$app/navigation';
</script>

<div class="lernContainer">
    <h1>Nun die Erklärung</h1>
    <ul>
        <li>Für die Eingabe der Höhe bei Beispiel 3 brauchen wir <code class="inline-code">input(...)</code></li>
        <li>Für die Ausgabe brauchen wir <code class="inline-code">print(...)</code> mit <code class="inline-code">print(..., end="")</code>, um die Absätze zu entfernen</li>
        <li>Für die Verarbeitung brauchen wir eine Schleife, entweder while oder for.</li>
    </ul>
    <p style="margin-top: 1vh;">Ich hoffe, du hattest Spaß beim Lösen dieses Beispiels, du kannst nun bei Home ein anderes lösen oder dich über die Leiste oben abmelden.</p>
</div>

<button class="next" on:click={() => goto("/home")}>Home</button>

<style>
    ul {
        list-style-type: none;
        font-size: 2vh;
    }
    li {
        margin-bottom: 1.2vh;
    }
</style>