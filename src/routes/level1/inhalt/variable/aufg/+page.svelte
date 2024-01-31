<script lang="ts">
    import { onMount } from "svelte";
    import { _disableButton, _enableButton, _next } from "../../+layout";

    let outputColorClass = "";
    let output = "> Hier ist dein Output";
    let stat = ["", "", "", "", "", "", "", "", "", "", "", "", ""];


    onMount(() => {
        _disableButton();
        let input = document.querySelector("input");
        if (input) input.focus();
    });

    let correct_answers = [
        {name: "jahr", answer: "int"},
        {name: "begrüsung", answer: "str"},
        {name: "monat_nummer", answer: "int"},
        {name: "name", answer: "str"},
        {name: "tag", answer: "int"},
        {name: "wochen_tag", answer: "str"},
        {name: "print1" , answer: ["jahr", "monat_nummer", "tag"]},
        {name: "print2" , answer: ["begrüssung", "name"] },
        {name: "print3" , answer: ["wochen_tag", "name"] },
    ];

    let user_jahr = "";
    let user_jahr_value = "";
    let user_begruessung = "";
    let user_begruessung_value = "";
    let user_monat_nummer = "";
    let user_monat_nummer_value = "";
    let user_name = "";
    let user_name_value = "";
    let user_tag = "";
    let user_tag_value = "";
    let user_wochen_tag = "";
    let user_wochen_tag_value = "";

    let user_print1_1 = "";
    let user_print1_2 = "";
    let user_print1_3 = "";

    let user_print2_1 = "";
    let user_print2_2 = "";

    let user_print3_1 = "";
    let user_print3_2 = "";


    function validate() {
        let user_answers = [
            {name: "jahr", answer: user_jahr},
            {name: "begrüsung", answer: user_begruessung},
            {name: "monat_nummer", answer: user_monat_nummer},
            {name: "name", answer: user_name},
            {name: "tag", answer: user_tag},
            {name: "wochen_tag", answer: user_wochen_tag},
            {name: "print1" , answer: [user_print1_1, user_print1_2, user_print1_3]},
            {name: "print2" , answer: [user_print2_1, user_print2_2] },
            {name: "print3" , answer: [user_print3_1, user_print3_2] },
        ];

        let correct = true;

        let wrong_answers = [
            // {name: "jahr", correct: "int", actual: user_jahr},
        ];

        for (let i = 0; i < correct_answers.length; i++) {
            let correct_answer = correct_answers[i];
            let user_answer = user_answers[i];
            if (correct_answer.answer !== user_answer.answer) {

                if (correct_answer.name.startsWith("print")){
                    let correct_temp = true;
                    for (let j = 0; j < correct_answer.answer.length; j++) {
                        let correct_print_answer = correct_answer.answer[j];
                        let user_print_answer = user_answer.answer[j];
                        if (correct_print_answer !== user_print_answer) {
                            wrong_answers.push({name: (correct_answer.name + "_" + j), correct: correct_print_answer, actual: user_print_answer});
                            correct_temp = false;
                            if (i === 6) {
                                stat[6 + j] = "wrong";
                            } else if (i === 7) {
                                stat[9 + j] = "wrong";
                            } else if (i === 8) {
                                stat[11 + j] = "wrong";
                            }
                        } else{
                            if (i === 6) {
                                stat[6 + j] = "correct";
                            } else if (i === 7) {
                                stat[9 + j] = "correct";
                            } else if (i === 8) {
                                stat[11 + j] = "correct";
                            }
                        }
                    }
                    if (!correct_temp) {
                        correct = false;
                    }
                }else{
                    wrong_answers.push({name: correct_answer.name, correct: correct_answer.answer, actual: user_answer.answer});
                    correct = false;
                    stat[i] = "wrong";
                }
            } else{
                if (correct_answer.name.startsWith("print")){
                    for (let j = 0; j < correct_answer.answer.length; j++) {
                        if (i === 6) {
                            stat[6 + j] = "correct";
                        } else if (i === 7) {
                            stat[9 + j] = "correct";
                        } else if (i === 8) {
                            stat[11 + j] = "correct";
                        }
                    }
                }else{
                    stat[i] = "correct";
                }
            }
        }

        if (correct) {
            outputColorClass = "valid-output";
            output = "> Jahr: " + user_jahr_value + " Monat: " + user_monat_nummer_value + " Tag: " + user_tag_value + "\n";
            output += "> " + user_begruessung_value + " " + user_name_value + " wie geht es dir? \n";
            output += "> Hey, ist dieser " + user_wochen_tag_value + " nicht ein schöner Tag, " + user_name_value + "\n";
            _enableButton();
        } else {
            outputColorClass = "invalid-output";
            output = "> Leider nicht ganz richtig. \n";
            output += "> Ich hab dir die falschen Felder markiert \n";
        }


    }
</script>


<div class="lernContainer">
    <h1>variablen - Aufgabe</h1>

    <p>
        Ich hoffe, du hast dir die Erklärung durchgelesen, denn nun kommt die Aufgabe. <br>
        Fülle die Lücken passend aus und drücke auf "Ausführen". <br>
        Du musst auch die Variablen beschriften(typisieren) mit <b>str</b> oder <b>int</b>. <br>
    </p>

<pre class="codeBlock">
jahr:<input class="inline-input {stat[0]}" style="width: 2vw" maxlength="3" bind:value={user_jahr}> = <input class="inline-input" style="width: 3vw" maxlength="5" bind:value={user_jahr_value}> <br>
begrüssung:<input class="inline-input {stat[1]}" style="width: 2vw" maxlength="3" bind:value={user_begruessung}> = "<input class="inline-input" style="width: 30vw" maxlength="58" bind:value={user_begruessung_value}>" <br>
monat_nummer:<input class="inline-input {stat[2]}" style="width: 2vw" maxlength="3" bind:value={user_monat_nummer}> = <input class="inline-input" style="width: 1.5vw" maxlength="2" bind:value={user_monat_nummer_value}> <br>
name:<input class="inline-input {stat[3]}" style="width: 2vw" maxlength="3" bind:value={user_name}> = "<input class="inline-input" style="width: 30vw" maxlength="58" bind:value={user_name_value}>" <br>
tag:<input class="inline-input {stat[4]}" style="width: 2vw" maxlength="3" bind:value={user_tag}> = <input class="inline-input" style="width: 1.5vw" maxlength="2" bind:value={user_tag_value}> <br>
wochen_tag:<input class="inline-input {stat[5]}" style="width: 2vw" maxlength="3" bind:value={user_wochen_tag}> = "<input class="inline-input" style="width: 12vw" maxlength="23" bind:value={user_wochen_tag_value}>" <br>

<code class="comment"># Hier will ich das Jahr, den Monat und den Tag </code>
print("Jahr:", <input class="inline-input {stat[6]}" style="width: 6.5vw" maxlength="12" bind:value={user_print1_1}>, "Monat:" <input class="inline-input {stat[7]}" style="width: 6.5vw" maxlength="12" bind:value={user_print1_2}>, "Tag:", <input class="inline-input {stat[8]}" style="width: 6.5vw" maxlength="12" bind:value={user_print1_3}>)

<code class="comment"># Hier will ich die Begrüssung und den Namen</code>
print(<input class="inline-input {stat[9]}" style="width: 5.5vw" maxlength="10" bind:value={user_print2_1}> + " " + <input class="inline-input {stat[10]}" style="width: 5.5vw" maxlength="10" bind:value={user_print2_2}> + " wie geht es dir?")

<code class="comment"># Hier will ich den Wochentag und den Namen</code>
print(f"Hey, ist dieser &#123;<input class="inline-input {stat[11]}" style="width: 5.5vw" maxlength="10" bind:value={user_print3_1}>} nicht ein schöner Tag, &#123;<input class="inline-input {stat[12]}" style="width: 5.5vw" maxlength="10" bind:value={user_print3_2}>}
</pre>

<button class="validate" on:click={() => {validate()}}>Ausführen</button>

<pre class="cmd {outputColorClass}">
{output}
</pre>

</div>

<button class="next" on:click={() =>{_next("../input/expl")}}>Weiter</button>
