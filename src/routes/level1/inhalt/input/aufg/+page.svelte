<script lang="ts">
    import { onMount } from "svelte";
    import { _disableButton, _enableButton, _next } from "../../+layout";


onMount(() => {
    _disableButton();
});
   
let outputColorClass = "";
let output = "> Hier ist dein Output";

let firstInput= "hidden";
let secondInput= "hidden";
let thirdInput= "hidden";

let user_name_type = "";
let user_name = "";
let user_alter_type = "";
let user_alter = "";
let user_datum_type = "";
let user_datum = "";
let user_datum_name = "";

let user_datum_name_in_print = "";

let name_type_state = "";
let alter_type_state = "";
let datum_type_state = "";
let datum_name_state = "";

let input1Output = "hidden";
let input2Output = "hidden";
let input3Output = "hidden";

let input_val_1 = "";
let input_val_2 = "";
let input_val_3 = "";

let ende = "hidden";

let correct_fields = [
    "str",
    "int",
    "str",
]

function validate(){

    name_type_state = "";
    alter_type_state = "";
    datum_type_state = "";
    datum_name_state = "";

    input1Output = "hidden";
    input2Output = "hidden";
    input3Output = "hidden";

    firstInput= "hidden";
    secondInput= "hidden";
    thirdInput= "hidden";

    ende = "hidden";

    let error = false;

    if(user_name_type === correct_fields[0]){
        name_type_state = "correct";
    }else{
        name_type_state = "wrong";
        error = true;
    }

    if(user_alter_type === correct_fields[1]){
        alter_type_state = "correct";
    }else{
        alter_type_state = "wrong";
        error = true;
    }

    if(user_datum_type === correct_fields[2]){
        datum_type_state = "correct";
    }else{
        datum_type_state = "wrong";
        error = true;
    }

    if(user_datum_name === user_datum_name_in_print && user_datum_name.length !== 0 && user_datum_name_in_print.length !== 0){
        datum_name_state = "correct";
    }else{
        datum_name_state = "wrong";
        error = true;
    }



    if (error){
        errors++;
        outputColorClass = "invalid-output";
        output = "> Es ist ein Fehler aufgetreten";
        output += "\n> Bitte überprüfe die rot markierten Felder";
    }
    else{
        stopTimer(true);
        outputColorClass = "valid-output";
        output = "";
        firstInput = "";

    }

}
let errors = 0;

let timerStopped = false;



function stopTimer(finnished: boolean){
    if(timerStopped) return;
    timerStopped = true;
        document.dispatchEvent(new CustomEvent("finishTimer", {
            detail: {
                finished: finnished,
                error: errors,
            }
        }));
    }
</script>

<div class="lernContainer">
    <h1>Input - Aufgabe</h1>
    <p>
        Schreibe den Input für den Namen und das Alter in die dafür vorgesehenen Variablen. <br>
        Frage auch nach dem Geburtsdatum des Benutzers und speichere es in eine Variable. <br>
        <br>
        Danach führe den Code aus und fülle die Inputs aus und sehe dir den Output an. <br>
        <br>
        Viel Erfolg!
    </p>

<pre class="codeBlock">
name: <input autocomplete="off"  class="inline-input {name_type_state}" style="width: 2vw" maxlength="3" bind:value={user_name_type}> = input("<input autocomplete="off"  type="text" style="width: 30vw" maxlength="58" bind:value={user_name}>")
alter: <input autocomplete="off"  class="inline-input {alter_type_state}" style="width: 2vw" maxlength="3" bind:value={user_alter_type}> = int(input("<input autocomplete="off"  type="text" style="width: 12vw" maxlength="23" bind:value={user_alter}>"))
<code class="comment"># Hier musst du dir einen Variablenamen ausdenken</code>
<input autocomplete="off"  class="inline-input {datum_name_state}" type="text" style="width: 12vw" maxlength="23" bind:value={user_datum_name}>: <input autocomplete="off"  class="inline-input {datum_type_state}" style="width: 2vw" maxlength="3" bind:value={user_datum_type}> = input("<input autocomplete="off"  type="text" style="width: 12vw" maxlength="23" bind:value={user_datum}>")

print("Hallo " + name + ", du bist " + alter + " Jahre alt")
print("Und hast am " + <input autocomplete="off"  class="inline-input {datum_name_state}" type="text" style="width: 12vw" maxlength="23" bind:value={user_datum_name_in_print}> + " Geburtstag");)
</pre>

<button class="validate" on:click={() => {validate()}}>Ausführen</button>

<pre class="cmd {outputColorClass}">
{output}
<code class="{firstInput}">> <code style="color: var(--peach);">{user_name}</code> <input autocomplete="off"  style="width: 10vw;" type="text" bind:value={input_val_1} class="inline-input {firstInput}" on:keypress={(e) => { if (e.key === "Enter"){ secondInput = ""; input1Output = ""; firstInput="hidden"; }}}></code><code class="{input1Output}"><code style="color: var(--peach);">{user_name}</code> <code style="color: var(--teal);">{input_val_1}</code></code>
<code class="{secondInput}">> <code style="color: var(--peach);">{user_alter}</code> <input autocomplete="off"  style="width: 10vw;" type="number" bind:value={input_val_2} class="inline-input {secondInput}" on:keypress={(e) => { if (e.key === "Enter"){ thirdInput = ""; input2Output = ""; secondInput="hidden";}}}></code><code class="{input2Output}"><code style="color: var(--peach);">{user_alter}</code> <code style="color: var(--teal);">{input_val_2}</code></code>
<code class="{thirdInput}">> <code style="color: var(--peach);">{user_datum}</code> <input autocomplete="off"  style="width: 10vw;" type="text" bind:value={input_val_3} class="inline-input {thirdInput}" on:keypress={(e) => { if (e.key === "Enter"){ ende=""; input3Output = ""; thirdInput="hidden"; _enableButton()}}}></code><code class="{input3Output}"><code style="color: var(--peach);">{user_datum}</code> <code style="color: var(--teal);">{input_val_3}</code></code>
<code class="{ende}">Hallo <code style="color: var(--teal);">{input_val_1}</code>, du bist <code style="color: var(--teal);">{input_val_2}</code> Jahre alt <br>Und hast am <code style="color: var(--teal);">{input_val_3}</code> Geburtstag</code>
</pre>
</div>
<button class="next" on:click={() => {_next("../if/expl");}}>Weiter</button><br>
<button class="back" on:click={() =>{stopTimer(false);_next("../../aufgabe")}}>Zurück</button>

