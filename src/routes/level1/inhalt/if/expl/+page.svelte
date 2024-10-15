<script lang="ts">
  import { goto } from "$app/navigation";
    import {_enableButton, _next} from "../../+layout";
    import {onMount} from "svelte";
    onMount(() => {
        _enableButton();
    });



</script>


<div class="lernContainer">
    <h1>Verzweigung</h1>
    <p>
        <code class="inline-code">if</code> führt einen Codeblock nur aus, wenn eine <code style="color: var(--peach);">Bedingung</code> wahr ist. <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung</code>:</code> <br>
        Die <code style="color: var(--peach);">Bedingung</code> endet mit einem Doppelpunkt, danach beginnt der eingerückte Codeblock, der ausgeführt wird, wenn die <code style="color: var(--peach);">Bedingung</code> wahr ist.<br>
        Man kann auch mehrere <code style="color: var(--peach);">Bedingungen</code> aneinanderhängen mit <code class="inline-code" style="color: var(--red)">and</code> oder <code style="color: var(--red)" class="inline-code">or</code> <br>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> <code style="color: var(--red);">and</code> <code style="color: var(--peach);">bedingung2</code>:</code>
        <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> <code style="color: var(--red);">or</code> <code style="color: var(--peach);">bedingung2</code>:</code> <br>
        Bei <code class="inline-code" style="color: var(--red)">and</code> müssen alle <code style="color: var(--peach);">Bedingungen</code> wahr sein, damit der Codeblock ausgeführt wird. <br>
        Bei <code class="inline-code" style="color: var(--red)">or</code> muss nur eine <code style="color: var(--peach);">Bedingung</code> wahr sein, damit der Codeblock ausgeführt wird. <br>
        Bei der <code style="color: var(--peach);">Bedingung</code> können Variablen wie auch fixe Werte verwendet werden. <br>
        Man kann auch einen <code class="inline-code">else</code> Codeblock benutzen, der ausgeführt wird, wenn die <code style="color: var(--peach);">Bedingung</code> nicht wahr ist. <br>
        <br>
        Eine <code style="color: var(--peach);">Bedingung</code> besteht aus einem Vergleich. <br>
        Bsp: <code class="inline-code">if <code style="color: var(--peach);">variable1</code> <code style="color: var(--red);">==</code> <code style="color: var(--peach);">variable2</code>:</code><br><br>
        Vergleichsoperatoren sind: <br><br>
        <code class="inline-code">==</code> gleich <br><br>
        <code class="inline-code">!=</code> ungleich <br><br>
        <code class="inline-code">&gt;</code> größer <br><br>
        <code class="inline-code">&lt;</code> kleiner <br><br>
        <code class="inline-code">&gt;=</code> größer oder gleich <br><br>
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

    <code class="comment"># Variable wird neu zugewiesen und die Bedingung wird neu evaluiert</code>
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