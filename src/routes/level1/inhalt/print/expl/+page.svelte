<script lang="ts">
    import {_enableButton, _next} from "../../+layout";
    import {onMount} from "svelte";
    onMount(() => {
        _enableButton();
    });
</script>


<div class="lernContainer">
    <h1>Print</h1>
    <p>
        Print ist ein Befehl, Dieser Text auf den Bildschirm anzeigen lasst <br>
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