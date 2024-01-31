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
        If führt einen Codeblock nur aus, wenn eine <code style="color: var(--peach);">Bedingung</code> wahr ist. <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung</code>:</code> <br>
        Nach der <code style="color: var(--peach);">Bedingung</code> muss ein Doppelpunkt stehen, damit Python weiß, dass wo der Codeblock beginnt und wo die Bedingung aufhört<br>
        Der Codeblock muss eingerückt sein, damit Python weiß, dass er zum if gehört. <br>
        Du kannst auch mehrere <code style="color: var(--peach);">Bedingungen</code> aneinander hängen mit <code class="inline-code">and</code> oder <code class="inline-code">or</code> <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> <code style="color: var(--red);">and</code> <code style="color: var(--peach);">bedingung2</code>:</code> <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> <code style="color: var(--red);">or</code> <code style="color: var(--peach);">bedingung2</code>:</code> <br>
        Bei 'and' müssen beide Bedinungen wahr sein, damit der Codeblock ausgeführt wird. <br>
        Bei 'or' muss nur eine Bedinung wahr sein, damit der Codeblock ausgeführt wird. <br>
        Bei <code style="color: var(--peach);">bedingung</code> kannst du eine Variable oder fixe Werte einsetzen. <br>
        Du kannst auch <code class="inline-code">else</code> benutzen, wenn die <code style="color: var(--peach);">Bedingung</code> nicht wahr ist. <br>
        
    
    </p>
    <p class="noMargin">Code:</p>
<pre class="codeBlock">
    if 1 == 1:
        print("1 ist gleich 1")
    
    alter: int = 15
    if alter > 18:
        print("Du bist erwachsen")
    else:
        print("Du bist noch nicht erwachsen")

    <code class="comment"># Variable wird neu zugewiesen und eine neue if Bedingung wird ausgeführt</code>
    alter = 20
    if alter > 18:
        print("Du bist erwachsen und noch jung")
    else:
        print("Du bist nicht erwachsen oder nicht mehr jung")


</pre>

<p class="noMargin">Output:</p>
<pre class="cmd">

</pre>


</div>

<button class="next" on:click={() => {_next("aufg")}}> Weiter </button>