<script lang="ts">
    import { _disableButton, _enableButton, _next } from "../../+layout";
    import { onMount } from "svelte";
    import { nameStore } from "../../../../../utils/stores";


    // TODO: REWRITE THIS HELL OF A CODE
    // For real this is some of the most disgusting and unmaintainable code I have ever seen

    onMount(() => {
        _disableButton();
    });

    let legend = "hidden";
    let success = "hidden";
    let errors = 0;

    let output = "> Das ist dein Output";
    let outputColorClass = "";

    let firstInput = "";
    let firstInputName = "";
    let firstInputQuestion = "";

    let secondInput = "";
    let secondInputName = "";
    let secondInputQuestion = "";

    let secondInputReaNew = "";
    let secondInputReaNewQuestion = "";

    let firstIf = "";
    let secondIf = "";
    let thirdIf = "";

    let fourthIf = "";
    let fifthIf = "";
    let sixthIf = "";

    // can be ether "correct" or name err | vergleich err | both err
    let firstInputState = "";
    let secondInputState = "";
    let secondInputReaNewValState = "";

    let firstIfState = "";
    let secondIfState = "";
    let thirdIfState = "";

    let fourthIfState = "";
    let fifthIfState = "";
    let sixthIfState = "";

    let correct = [
        {type: "str", input: "input(", end: ")"},
        {type: "int", input: "int(input(", end : "))"},
    ]

    let vergleich = [">=", "<", "==", ">", "<=", ">="];

    function inputCheck(input: string, index: number){
        let currentError = "correct";

        if(input.length < 0 || !input.includes("=") || !input.includes(":")){
            currentError = "bothErr";
        } else {
            let part = input.split("=")[0].trim();
            let value = input.split("=")[1].trim();

            let name = part.split(":")[0].trim();
            if (index == 0){
                firstInputName = name;
            } else {
                if (name == firstInputName){
                    currentError = "nameErr";
                }
                secondInputName = name;
            }

            let type = part.split(":")[1].trim();

            if(type != correct[index].type){
                currentError = "nameErr";
            } else {
                if(!value.startsWith(correct[index].input) || !value.endsWith(correct[index].end) ){
                    if (currentError != "nameErr"){
                        currentError = "vergleichErr";
                    } else {
                        currentError = "bothErr";
                    }
                } else{
                    let valuePart = value.replace(correct[index].input, "").replace(correct[index].end, "");
                    if (!valuePart.startsWith('"') || !valuePart.endsWith('"')){
                        if (currentError != "nameErr"){
                            currentError = "vergleichErr";
                        } else {
                            currentError = "bothErr";
                        }
                    } else {
                        if (index == 0){
                            firstInputQuestion = valuePart.replace('"', "").replace('"', "");
                        } else {
                            secondInputQuestion = valuePart.replace('"', "").replace('"', "");
                        }
                    }
                }
            }

        }
        return currentError;
    }

    function reInputCheck(input: string){
        let currentError = "correct";

        if(input.length < 0 || !input.includes("=")){
            currentError = "bothErr";
        } else {
            let name = input.split("=")[0].trim();
            let value = input.split("=")[1].trim();
            if (name != secondInputName){
                currentError = "nameErr";
            } else {
                if(!value.startsWith("int(input(") || !value.endsWith("))")){
                    if (currentError != "nameErr"){
                        currentError = "vergleichErr";
                    } else {
                        currentError = "bothErr";
                    }
                } else{
                    let valuePart = value.replace("int(input(", "").replace("))", "");
                    if (!valuePart.startsWith('"') || !valuePart.endsWith('"')){
                        if (currentError != "nameErr"){
                            currentError = "vergleichErr";
                        } else {
                            currentError = "bothErr";
                        }
                    } else {
                        secondInputReaNewQuestion = valuePart.replace('"', "").replace('"', "");
                    }
                }
            }
        }
        return currentError;
    }


    function validate(){
        firstInputName = "";
        secondInputName = "";

        outputVal1 = "";
        outputState1 = "";
        outputVal2 = "";
        outputState2 = "hidden";
        outputState3 = "hidden";
        output1ValState = "hidden";
        output2ValState = "hidden";
        output3ValState = "hidden";
        secondPartIDK = "hidden";
        outputVal3 = "";

        firstPartIDK = "hidden";

        legend = "hidden";

        let error = false;

        firstInputState = inputCheck(firstInput, 0);
        secondInputState = inputCheck(secondInput, 1);
        secondInputReaNewValState = reInputCheck(secondInputReaNew);

        if (firstInputState != "correct" || secondInputState != "correct" || secondInputReaNewValState != "correct"){
            error = true;
        }

        let temp = [firstIf, secondIf, thirdIf, fourthIf, fifthIf, sixthIf];
        let otherTemp = [secondInputName,secondInputName,firstInputName,firstInputName,firstInputName,firstInputName];
        for (let i = 0; i < vergleich.length; i++){
            if (temp[i].length <= 0){
                error = true;
                if (i == 0){
                    firstIfState = "bothErr";
                } else if (i == 1){
                    secondIfState = "bothErr";
                } else if (i == 2){
                    thirdIfState = "bothErr";
                } else if (i == 3){
                    fourthIfState = "bothErr";
                } else if (i == 4){
                    fifthIfState = "bothErr";
                } else if (i == 5){
                    sixthIfState = "bothErr";
                }
            } else {
                if(!temp[i].includes(vergleich[i])){
                    error = true;
                    if (i == 0){
                        firstIfState = "vergleichErr";
                    } else if (i == 1){
                        secondIfState = "vergleichErr";
                    } else if (i == 2){
                        thirdIfState = "vergleichErr";
                    } else if (i == 3){
                        fourthIfState = "vergleichErr";
                    } else if (i == 4){
                        fifthIfState = "vergleichErr";
                    } else if (i == 5){
                        sixthIfState = "vergleichErr";
                    }
                } else {
                    let operator = vergleich[i];
                    if (i < 3) {
                        let value = temp[i].split(operator)[1].trim();
                        if (value != ""){
                            error = true;
                            if (i == 0){
                                firstIfState = "vergleichErr";
                            } else if (i == 1){
                                secondIfState = "vergleichErr";
                            } else if (i == 2){
                                thirdIfState = "vergleichErr";
                            }
                        } else {
                            let name = temp[i].split(operator)[0].trim();
                            if (name != otherTemp[i]){
                                error = true;
                                if (i == 0){
                                    if (firstIfState != "vergleichErr"){
                                        firstIfState = "nameErr";
                                    } else {
                                        firstIfState = "bothErr";
                                    }
                                } else if (i == 1){
                                    if (secondIfState != "vergleichErr"){
                                        secondIfState = "nameErr";
                                    } else {
                                        secondIfState = "bothErr";
                                    }
                                } else if (i == 2){
                                    if (thirdIfState != "vergleichErr"){
                                        thirdIfState = "nameErr";
                                    } else {
                                        thirdIfState = "bothErr";
                                    }
                                }
                            } else {
                                if (i == 0){
                                    firstIfState = "correct";
                                } else if (i == 1){
                                    secondIfState = "correct";
                                } else if (i == 2){
                                    thirdIfState = "correct";
                                }
                            }
                        }
                    } else {
                        let value = temp[i].split(operator)[0].trim();
                        if (value != ""){
                            error = true;
                            if (i == 3){
                                fourthIfState = "vergleichErr";
                            } else if (i == 4){
                                fifthIfState = "vergleichErr";
                            } else if (i == 5){
                                sixthIfState = "vergleichErr";
                            }
                        } else {
                            let name = temp[i].split(operator)[1].trim();
                            if (name != otherTemp[i]){
                                error = true;
                                if (i == 3){
                                    if (fourthIfState != "vergleichErr"){
                                        fourthIfState = "nameErr";
                                    } else {
                                        fourthIfState = "bothErr";
                                    }
                                } else if (i == 4){
                                    if (fifthIfState != "vergleichErr"){
                                        fifthIfState = "nameErr";
                                    } else {
                                        fifthIfState = "bothErr";
                                    }
                                } else if (i == 5){
                                    if (sixthIfState != "vergleichErr"){
                                        sixthIfState = "nameErr";
                                    } else {
                                        sixthIfState = "bothErr";
                                    }
                                }
                            } else {
                                if (i == 3){
                                    fourthIfState = "correct";
                                } else if (i == 4){
                                    fifthIfState = "correct";
                                } else if (i == 5){
                                    sixthIfState = "correct";
                                }
                            }
                        }
                    }
                }
            }
        }


        if(error){
            errors++;
            outputColorClass = "invalid-output";
            output = "> Da ist etwas schief gelaufen, schau dir die Fehler an und versuche es erneut.";
            legend = "";
            success = "hidden";
        } else{
            stopTimer(true);
            outputColorClass = "valid-output";
            output = "";
            legend = "hidden";
            success = "";
            //pause timer
        }

    }

    let outputVal1 = "";
    let outputState1 = "";
    let outputVal2 = "";
    let outputState2 = "hidden";
    let outputVal3 = "";

    let outputState3 = "hidden";

    let output1ValState = "hidden";
    let output2ValState = "hidden";
    let output3ValState = "hidden";

    let firstPartIDK = "hidden";
    let secondPartIDK = "hidden";

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
    <h1>Verzweigung - Aufgabe</h1>

    <p>
        Fülle die Lücken aus, die Kommentare helfen dir dabei. <br>
        Du musst die Variablen und die Vergleichsoperatoren einsetzen. <br>
    </p>

    <pre class="codeBlock">
<code class="comment"># Zwei Inputs für Name und Alter.</code>
<code class="comment"># Der Name wird als String gespeichert, das Alter als Integer</code>
<code class="comment"># Die Variablen dürfen nicht den gleichen Namen besitzen</code>
<input autocomplete="off"  class="inline-input {firstInputState}" type="text" placeholder="Name Var + Input" bind:value={firstInput}>

<input autocomplete="off"  class="inline-input {secondInputState}" type="text" placeholder="Alter Var + Input" bind:value={secondInput}>

<code class="comment"># Überprüfe, ob der Benutzer volljährig ist (18 Jahre oder älter)</code>
if <input autocomplete="off"  class="inline-input {firstIfState}" type="text" placeholder="Var + Vergleich" style="width: 15vw" bind:value={firstIf}> 18:
    print("Du bist volljährig")
else:
    print("Du bist nicht volljährig")

<code class="comment"># Frage das Alter erneut ab
# Hier benötigst du keinen ':' mehr, da du die vorhandene Variable verwendest.</code>
<input autocomplete="off"  class="inline-input {secondInputReaNewValState}" type="text" placeholder="Alter Var ohne :int oder :str + Input" bind:value={secondInputReaNew}>

<code class="comment"># Überprüfe, ob der User jünger als 18 Jahre ist</code>
if <input autocomplete="off"  class="inline-input {secondIfState}" type="text" placeholder="Var + Vergleich" style="width: 15vw" bind:value={secondIf}> 18:
    print("Du bist nicht volljährig")
else:
    print("Du bist volljährig")

<code class="comment"># Überprüfe, ob der Name richtig ist (Ob die Namen identisch sind).</code>
if <input autocomplete="off"  class="inline-input {thirdIfState}" type="text" placeholder="Var + Vergleich" style="width: 15vw" bind:value={thirdIf}> "{$nameStore}":
    print("Hallo {$nameStore}")
else:
    print("Du bist nicht {$nameStore} >:(")


<code class="comment"># Als letztes setze die richtigen Vergleichsoperatoren ein.</code>
<code class="comment"># len(var) einer Variable gibt die Anzahl der Buchstaben eines Strings zurück.</code>
<code class="comment"># Hier steht es für dich schon.</code>

<code class="comment"># Überprüfe, ob der Name weniger als 6 Buchstaben hat.</code>
<code class="comment"># Hier ist .len() aber in Realität wäre es len()</code>
if 6 <input autocomplete="off"  class="inline-input {fourthIfState}" type="text" placeholder="Vergleich + Var" style="width: 10vw" bind:value={fourthIf}>.len():
    print("Dein Name ist echt kurz O.o")
<code class="comment"># Überprüfe, ob die Anzahl zwischen 6 und 13 liegt</code>
elif 6 <input autocomplete="off"  class="inline-input {fifthIfState}" type="text" placeholder="Vergleich + Var" style="width: 10vw" bind:value={fifthIf}>.len() and 13 <input autocomplete="off"  class="inline-input {sixthIfState}" type="text" placeholder="Vergleich + Var" style="width: 10vw" bind:value={sixthIf}>.len():
    print("Du hast einen normal langen Namen ._.")
<code class="comment"># else wird ausgeführt, wenn die Anzahl der Buchstaben über 13 ist</code>
else:
    print("Dein Name ist echt lang (⊙ˍ⊙)")
</pre>

<button class="validate" on:click={() => {validate()}}>Ausführen</button>

<pre class="cmd {outputColorClass}" >
{output}
<code class="{legend}"><code style="color: var(--yellow); font-weight:600; font-size: 2vh">> Wenn du einen Namen von deinen Variablen falsch geschrieben hast,<br>> wird dir der Fehler in gelb angezeigt (:str und :int zählen hier dazu).</code>
<code style="color: var(--red); font-weight:600; font-size: 2vh">> Wenn du einen Vergleichsoperator falsch eingesetzt hast,<br>> wird er dir in rot angezeigt. <br>> Falls dein input falsch ist, wird dieser rot angezeigt.</code>
<code style="color: var(--mauve); font-weight:600; font-size: 2vh">> Wenn du beides falsch gemacht hast,<br>> wird dir das Eingabefeld in lila angezeigt.</code></code><code class="{success}"><code class="{outputState1}">> <code style="color: var(--peach);">{firstInputQuestion}</code> <input autocomplete="off"  style="width: 10vw;" type="text" bind:value={outputVal1} class="inline-input {outputState1}" on:keypress={(e) => { if (e.key === "Enter"){outputState1 = "hidden"; outputState2=""; output1ValState = ""}}}></code><code class="{output1ValState}">> <code style="color: var(--peach);">{firstInputQuestion}</code> <code style="color: var(--teal);">{outputVal1}</code></code>
<code class="{outputState2}">> <code style="color: var(--peach);">{secondInputQuestion}</code> <input autocomplete="off"  style="width: 10vw;" type="number" bind:value={outputVal2} class="inline-input {outputState2}" on:keypress={(e) => { if (e.key === "Enter"){outputState2 = "hidden"; outputState3="";output2ValState = ""; firstPartIDK = "";}}}></code><code class="{output2ValState}">> <code style="color: var(--peach);">{secondInputQuestion}</code> <code style="color: var(--teal);">{outputVal2}</code></code>
{#if parseInt(outputVal2) >= 18}<code class="{firstPartIDK}">> Du bist volljährig</code>{:else}<code class="{firstPartIDK}">> Du bist nicht volljährig</code>{/if}
<code class="{outputState3}">> <code style="color: var(--peach);">{secondInputReaNewQuestion}</code> <input autocomplete="off"  style="width: 10vw;" type="number" bind:value={outputVal3} class="inline-input {outputState3}" on:keypress={(e) => { if (e.key === "Enter"){outputState3="hidden"; output3ValState=""; secondPartIDK = "";_enableButton()}}}></code><code class="{output3ValState}">> <code style="color: var(--peach);">{secondInputReaNewQuestion}</code> <code style="color: var(--teal);">{outputVal3}</code></code>
<code class="{secondPartIDK}">{#if parseInt(outputVal3) < 18}<code>> Du bist nicht volljährig</code>{:else}<code>> Du bist volljährig</code>{/if}
{#if outputVal1 === $nameStore }  <code>> Hallo {$nameStore}</code>{:else}<code>> Du bist nicht {$nameStore} >:(</code>{/if}
{#if outputVal1.length < 6}<code>> Dein Name ist echt kurz O.o</code>{:else if outputVal1.length >= 6 || outputVal1.length <= 13}<code>> Du hast einen normal langen Namen ._.</code>{:else}<code>> Dein Name ist echt lang (⊙ˍ⊙)</code>{/if}</code>
</code>
</pre>

</div>

<button class="next" on:click={() =>{_next("/home")}}>Weiter</button> <br>
<button class="back" on:click={() =>{stopTimer(false); _next("../../aufgabe")}}>Zurück</button>

<div class="bothErr vergleichErr nameErr"></div>
