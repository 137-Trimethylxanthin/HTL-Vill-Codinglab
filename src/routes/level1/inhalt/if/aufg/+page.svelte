<script>
    import { _disableButton, _enableButton, _next } from "../../+layout";
    import { onMount } from "svelte";

    onMount(() => {
        _disableButton();
    });


let output = "> Das ist dein Output";
let outputColorClass = "";


function validate(){

}
</script>

<div class="lernContainer">
    <h1>if - Aufgabe</h1>

    <p>
        Fülle die Lücken aus, die Kommentare helfen dir dabei. <br>
        Du wirst die Variablen und die Vergleichsoperatoren einsetzen müssen. <br>
    </p>

<pre class="codeBlock">
<code class="comment"># Zwei inputs für Name und Alter</code>
<input class="inline-input" type="text" placeholder="name var + input">

<input class="inline-input" type="text" placeholder="alter var + input">

<code class="comment"># Überprüfe ob der User volljährig ist (18 Jahre oder älter)</code>
if <input class="inline-input" type="text" placeholder="var + vergleich" style="width: 15vw"> 18:
    print("Du bist volljährig")
else:
    print("Du bist nicht volljährig")

<code class="comment"># Frage das Alter erneut ab
# hier benötigst du keinen : mehr da du es in derselben Variable speicherst</code>

</pre>

<button class="validate" on:click={() => {validate()}}> Ausführen </button>

<pre class="cmd {outputColorClass}" >
{output}
</pre>

</div>

<button class="next" on:click={() =>{_next("../code_example/aufgabe")}}>Weiter</button>
