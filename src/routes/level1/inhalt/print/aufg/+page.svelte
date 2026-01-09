<script>

    import {_disableButton, _enableButton, _next} from "../../+layout";
    import {onMount} from "svelte";
    import {goto} from "$app/navigation";
    import {nameStore} from "../../../../../utils/stores";

    let outputColorClass = "";

    onMount(() => {
        _disableButton();
        let input = document.querySelector("input");
        if (input) input.focus();
    });

    let inputVal = "";
    let output = "Hier ist der Output.";
    function validate(){
        if (inputVal.length <= 0) {
            outputColorClass = "invalid-output";
            output = "Du hast noch nichts geschrieben.";
            return;
        }
        let middle = "";

        try{
            middle = inputVal.split("(")[1].split(")")[0];
        } catch (e) {
            outputColorClass = "invalid-output";
            output = "Du hast keine Klammern geschrieben.";
            return;
        }

        let startHasValidStart = inputVal.startsWith("print(");
        let middleIsString = middle.startsWith('"') && middle.endsWith('"');
        let endHasValidEnd = inputVal.endsWith(")");

        if(startHasValidStart && middleIsString && endHasValidEnd && inputVal.length > 0){
            stopTimer(true);
            outputColorClass = "valid-output";
            output = "Dein Text:";
            output += "\n> "+ middle.substring(1, middle.length - 1);
            output += "\n\n> Gut gemacht! Du hast print() verwendet. Du kannst nun auf Weiter klicken.";
            _enableButton();
        } else {
            errors++;
            outputColorClass = "invalid-output";
            output = "Das ist nicht ganz richtig. Versuche es nochmal.";
            if (!startHasValidStart) output += "\n> Du hast 'print' nicht richtig geschrieben. (Beachte, dass es klein ist)";
            if (!middleIsString) output += "\n> Du brauchst Anführungszeichen um den Text. print(\"Dein Text\")";
            if (!endHasValidEnd) output += "\n> Du hast noch etwas nach der ')' stehen. print(\"Dein Text\")";
        }
    }
let errors = 0;

let timerStopped = false;

  /**
   * @param {boolean} finnished
   */
function stopTimer(finnished){
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
    <h1>print - Aufgabe</h1>

    <p>
        Nun versuche es selbst. <br>
        Schreibe ein print-Statement, welches deinen Namen ausgibt:
    </p>

    <code class="codeBlock">
        print("Dein Text") <br>
        <code style="color: var(--green)"># Nun du, {$nameStore}</code> <br>
        <input autocomplete="off"  bind:value={inputVal}>

    </code>

    <button class="validate" on:click={() => {validate()}}>Ausführen</button>

<pre class="cmd {outputColorClass}" >
> {output}
</pre>

</div>

<button class="next" on:click={() =>{_next("../variable/expl");}}>Weiter</button><br>
<button class="back" on:click={() =>{stopTimer(false);_next("../../aufgabe")}}>Zurück</button>
