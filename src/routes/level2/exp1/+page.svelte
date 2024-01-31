<script lang="ts">
    import { goto } from '$app/navigation';
</script>

<div class="lernContainer">
    <h1>Nun die Erklärung</h1>
    <ul>
        <li>Für die Eingabe der Zahlen brauchen wir <code class="inline-code">input(...)</code></li>
        <li>Um die Eingabe von einem Text in eine Zahl umzuwandeln, verwenden wir ein <code class="inline-code">int()</code> um den input.</li>
        <li>Dann können wir die Zahlen ausrechnen mit +, -, *, /</li>
        <li>Und zuletzt mithilfe von <code class="inline-code">print(...)</code> ausgeben</li>
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