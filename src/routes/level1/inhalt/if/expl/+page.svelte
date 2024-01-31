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
        If führt einen Codeblock nur aus, wenn die <code style="color: var(--peach);">Bedingung</code> wahr ist. <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung</code> :</code> <br>
        nach der <code style="color: var(--peach);">bedingung</code> muss ein Doppelpunkt stehen, damit Python weiss, dass wo Codeblock beginnt und wo die bedinung aufhört<br>
        der Codeblock muss eingerückt sein, damit Python weiss, dass er zum if gehört. <br>
        du kannst auch mehrere <code style="color: var(--peach);">bedingungen</code> aneinander hängen mit <code class="inline-code">and</code> oder <code class="inline-code">or</code> <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> <code style="color: var(--red);">and</code> <code style="color: var(--peach);">bedingung2</code> :</code> <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> <code style="color: var(--red);">or</code> <code style="color: var(--peach);">bedingung2</code> :</code> <br>
        wo and steht müssen beide bedinungen wahr sein, damit der Codeblock ausgeführt wird. <br>
        wo or steht muss nur eine bedinung wahr sein, damit der Codeblock ausgeführt wird. <br>
        wo <code style="color: var(--peach);">bedingung</code> steht, kannst du auch eine variable einsetzen oder fixen werten. <br>
        du kannst auch <code class="inline-code">else</code> benutzen, wenn die <code style="color: var(--peach);">bedingung</code> nicht wahr ist. <br>
        
    
    </p>
    <p class="noMargin">Code:</p>
<pre class="codeBlock">
    if 1 == 1:
        print("1 ist gleich 1")
    
    alter: int = 15
    if alter > 18:
        print("du bist erwachsen")
    else:
        print("du bist noch nicht erwachsen")

    <code class="comment">#Variable wird neu zugewiesen und die if wird neu ausgeführt</code>
    alter = 20
    if alter > 18:
        print("du bist erwachsen und noch jung")
    else:
        print("du bist nicht erwachsen oder nicht mehr jung")

    <code class="comment">#Variable wird neu zugewiesen und die if wird neu ausgeführt</code>


</pre>

<p class="noMargin">Output:</p>
<pre class="cmd">

</pre>


</div>

<button class="next" on:click={() => {_next("aufg")}}> Weiter </button>