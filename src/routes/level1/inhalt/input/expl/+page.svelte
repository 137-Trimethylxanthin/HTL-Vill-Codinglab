<script lang="ts">
    import {_enableButton, _next} from "../../+layout";
    import {onMount} from "svelte";
    onMount(() => {
        _enableButton();
    });
</script>


<div class="lernContainer">
    <h1>Input</h1>
    <p>
        Mit Input kannst du dem Benutzer Fragen stellen und seine Antworten speichern. <br>
        <code class="inline-code">input(<code style="color: var(--peach);">frage</code>)</code> <br>
        diese Antwort kannst du dann in einer Variable speichern. <br>
        <code class="inline-code"><code style="color: var(--peach);">variable</code> = input(<code style="color: var(--peach);">frage</code>)</code> <br>
        


    </p>
    <p class="noMargin">Code:</p>
<pre class="codeBlock">

</pre>

<p class="noMargin">Output:</p>
<pre class="cmd">

</pre>


</div>

<button class="next" on:click={() => {_next("aufg")}}> Weiter </button>