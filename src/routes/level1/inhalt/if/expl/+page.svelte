<script lang="ts">
  import { goto } from "$app/navigation";
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
        Nach der <code style="color: var(--peach);">Bedingung</code> muss ein Doppelpunkt stehen, damit Python weiß, dass ein Codeblock beginnt und wo die <code style="color: var(--peach);">Bedingung</code> aufhört.<br>
        Der Codeblock muss eingerückt sein, damit Python weiß, dass er zum if gehört. <br>
        Du kannst auch mehrere <code style="color: var(--peach);">Bedingungen</code> aneinanderhängen mit <code class="inline-code" style="color: var(--red)">and</code> oder <code style="color: var(--red)" class="inline-code">or</code> <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> <code style="color: var(--red);">and</code> <code style="color: var(--peach);">bedingung2</code>:</code> <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> <code style="color: var(--red);">or</code> <code style="color: var(--peach);">bedingung2</code>:</code> <br>
        Bei 'and' müssen beide <code style="color: var(--peach);">Bedingungen</code> wahr sein, damit der Codeblock ausgeführt wird. <br>
        Bei 'or' muss nur eine <code style="color: var(--peach);">Bedingung</code> wahr sein, damit der Codeblock ausgeführt wird. <br>
        Bei <code style="color: var(--peach);">bedingung</code> kannst du auch eine Variable oder fixe Werte verwenden. <br>
        Du kannst auch <code class="inline-code">else</code> benutzen, wenn die <code style="color: var(--peach);">Bedingung</code> nicht wahr ist. <br>
        <br>
        Eine <code style="color: var(--peach);">Bedingung</code> besteht aus einem Vergleich von Variablen. <br>
        Bsp: <code class="inline-code">if <code style="color: var(--peach);">variable1</code> <code style="color: var(--red);">==</code> <code style="color: var(--peach);">variable2</code>:</code> (var1 muss genau gleich sein wie var2) <br>
        Diese sind: <br><br>
        <code class="inline-code">==</code> gleich <br><br>
        <code class="inline-code">!=</code> ungleich <br><br>
        <code class="inline-code">&gt;</code> grösser <br><br>
        <code class="inline-code">&lt;</code> kleiner <br><br>
        <code class="inline-code">&gt;=</code> grösser oder gleich <br><br>
        <code class="inline-code">&lt;=</code> kleiner oder gleich <br>
    </p>
    <p class="noMargin">Code:</p>
<pre class="codeBlock">
    if <code style="color: var(--peach);">1</code> <code style="color: var(--red);">==</code> <code style="color: var(--peach);">1</code>: <code class="comment"># True</code>
        print("1 ist gleich 1")
    
    alter: int = 15
    if <code style="color: var(--peach);">alter</code> <code style="color: var(--red);">&gt;</code> <code style="color: var(--peach);">18</code>: <code class="comment"># False</code>
        print("du bist erwachsen")
    else:
        print("du bist noch nicht erwachsen")

    <code class="comment"># Variable wird neu zugewiesen und die if wird neu ausgeführt</code>
    alter = 20
    if <code style="color: var(--peach);">alter</code> <code style="color: var(--red);">&gt;</code> <code style="color: var(--peach);">18</code>: <code class="comment"># True</code>
        print("du bist erwachsen und noch jung")
    else:
        print("du bist nicht erwachsen oder nicht mehr jung")


</pre>

<p class="noMargin">Output:</p>
<pre class="cmd">
> 1 ist gleich 1
> du bist noch nicht erwachsen
> du bist erwachsen und noch jung
</pre>


</div>

<button class="next" on:click={() => {
    _next("aufg")
    }}> Weiter </button> <br>
<button class="back" on:click={() =>{_next("../../aufgabe")}}>Zurück</button>