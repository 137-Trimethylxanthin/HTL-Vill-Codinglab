<script>
import {_next} from "../../+layout";

let output = "> Das ist dein Output";
let outputColorClass = "";


function validate(){

}
</script>

<div class="lernContainer">
    <h1>if - Aufgabe</h1>

    <p>
        Fülle die Lücken aus, die kommentare helfen dir dabei. <br>
        du wirst die variablen einsetzen müssen und die vergleichsoperatoren. <br>
        Hier:
    </p>

<pre class="codeBlock">
<code class="comment">#2 inputs für name und alter</code>
<input class="inline-input" type="text" placeholder="name var + input">

<input class="inline-input" type="text" placeholder="alter var + input">

<code class="comment">#überprüfe ob der user volljährig ist (über 18 jahre)</code>
if <input class="inline-input" type="text" placeholder="var + verglecih" style="width: 15vw"> 18:
    print("Du bist volljährig")
else:
    print("Du bist nicht volljährig")

<code class="comment">#frage das alter erneut ab
#hier benötigst du keinen : mehr da du es in die selbe variable speicherst</code>


</pre>

<button class="validate" on:click={() => {validate()}}> Ausführen </button>

<pre class="cmd {outputColorClass}" >
{output}
</pre>

</div>

<button class="next" on:click={() =>{_next("../variable/expl")}}> Weiter </button>
