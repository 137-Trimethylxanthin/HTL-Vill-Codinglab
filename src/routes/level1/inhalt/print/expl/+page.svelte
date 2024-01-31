<script lang="ts">
    import {_enableButton, _next} from "../../+layout";
    import {onMount} from "svelte";
    onMount(() => {
        _enableButton();
    });



</script>


<div class="lernContainer">
    <h1>print</h1>
    <p>
        Print ist ein Befehl, der Text auf den Bildschirm anzeigen lasst <br>
        PS: Kommentare werden mit # gemacht sie werden bei Ablauf des Programmes Ignoriert<br>
        <code class="inline-input comment"># Kommentar</code> <br>
        Hier ist ein Beispiel:
    </p>
    <p class="noMargin">Code:</p>
<pre class="codeBlock">
print("Hello World")
</pre>

<p class="noMargin">Output:</p>
<pre class="cmd">
> Hello World
</pre>

</div>

<button class="next" on:click={() => {_next("aufg")}}> Weiter </button>