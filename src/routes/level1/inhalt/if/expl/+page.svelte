<script lang="ts">
    import {_enableButton, _next} from "../../+layout";
    import {onMount} from "svelte";
    onMount(() => {
        _enableButton();
    });
</script>


<div class="lernContainer">
    <h1>If</h1>
    <p>
        If führt einen Codeblock nur aus, wenn die Bedingung wahr ist. <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung</code> :</code> <br>
        nach der bedinung muss ein Doppelpunkt stehen, damit Python weiss, dass wo Codeblock beginnt und wo die bedinung aufhört<br>
        der Codeblock muss eingerückt sein, damit Python weiss, dass er zum if gehört. <br>
        du kannst auch mehrere bedinungen aneinander hängen mit <code class="inline-code">and</code> oder <code class="inline-code">or</code> <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> and <code style="color: var(--peach);">bedingung2</code> :</code> <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> or <code style="color: var(--peach);">bedingung2</code> :</code> <br>
        wo and steht müssen beide bedinungen wahr sein, damit der Codeblock ausgeführt wird. <br>
        wo or steht muss nur eine bedinung wahr sein, damit der Codeblock ausgeführt wird. <br>
        <br>
        wo <code style="color: var(--peach);">bedingung</code> steht, kannst du auch eine variable einsetzen oder fixen werten. <br>
        



    </p>
    <p class="noMargin">Code:</p>
<pre class="codeBlock">

</pre>

<p class="noMargin">Output:</p>
<pre class="cmd">

</pre>


</div>

<button class="next" on:click={() => {_next("aufg")}}> Weiter </button>