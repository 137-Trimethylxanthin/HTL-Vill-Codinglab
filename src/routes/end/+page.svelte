<script lang="ts">
    import { nameStore } from "../../utils/stores";
    import { goto } from "$app/navigation";
    import { invoke } from "@tauri-apps/api/core";
    import { writable, type Writable } from "svelte/store";
  import { ask, message } from "@tauri-apps/plugin-dialog";

    async function logOut() {
        if (await ask('Willst du wirklich Beenden?', { title: 'Beenden' })) {
            invoke('logout').then((res) => {
                if (res) {
                    goto('/');
                } else {
                    message("User konnte nicht abgemeldet werden, bereits abgemeldet?")
                }
            })
        } else {
            return;
        }
    }

    function sendMail(e: SubmitEvent) {
        
        if (!email) {
            return;
        }

        invoke("send_mail", { email }).then((res: any) => {
            if (res) {
                invoke('logout').then((res) => {
                    if (res) {
                        goto('/');
                    } else {
                        message("User konnte nicht abgemeldet werden, bereits abgemeldet?")
                    }
                })
            }
        });

        emailWasSend = true;
        email = "";
        checkMail();
    }

    let gesZeit = 0;
    let gesPunkte = 0;
    let gesErreichbar = 0;

    let level1 = {
        name: "Level 1",
        punkte: 0,
        maxPunkte: 0,
        time: 0,
        status: "🟡" // ✅ = bestanden, ❌ = nicht bestanden, teilweise bestanden = 🟡
    }

    let level2 = {
        name: "Level 2",
        punkte: 0,
        maxPunkte: 0,
        time: 0,
        status: "❌"
    }

    let level3 = {
        name: "Level 3",
        punkte: 0,
        maxPunkte: 0,
        time: 0,
        status: "❌"
    }

    let levels = [level1, level2, level3];


    let email = ""; 
    let emailWasSend = false;

    let emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

    function checkMail() {
        console.log(email);
        if (!emailRegex.test(email) || emailWasSend === true) {
            (document.getElementById("sendMail") as HTMLButtonElement).disabled = true;
            (document.getElementById("sendMail") as HTMLButtonElement).classList.remove("isOk");
            console.log("nope");

        } else {
            (document.getElementById("sendMail") as HTMLButtonElement).disabled = false;
            (document.getElementById("sendMail") as HTMLButtonElement).classList.add("isOk");
            console.log("yep");
        } 
    }

</script>

<div class="title noMargin">
    <h1>Danke fürs Spielen {$nameStore === undefined ? "" : $nameStore}</h1>
</div>

<div class="timeContainer">
    <h2>Zeit und Punkte</h2>
    <h3>Gesamt Zeit:</h3>
    <p>{String(Math.floor(gesZeit / 60)).padStart(2, '0')}:{String(gesZeit % 60).padStart(2, '0')}</p>
    <h3>Gesamt Punkte:</h3>
    <p>{gesPunkte}/{gesErreichbar}</p>
    <h3>Level:</h3>
    <ul>
        {#each levels as level}
            <li>{level.name} ({level.status}): {level.punkte}/{level.maxPunkte} - {String(Math.floor(level.time / 60)).padStart(2, '0')}:{String(level.time % 60).padStart(2, '0')}</li>
        {/each}
    </ul>

</div>  

<div class="logoutContainer" >
    <h1>Falls du genauere daten haben willst</h1>
    <p>Gib unten deine Email ein und wir schicken dir eine bericht mit allen zeiten und punkten</p>
    <form on:submit|preventDefault={sendMail}>
        <label for="email">Vorname:</label><br />
        <input type="text" id="email" bind:value={email} on:input={checkMail} name="email" placeholder="Email" required autocomplete="off"/><br />
        <button id="sendMail" type="submit">Senden</button>
    </form>
</div>

<button class="ende" on:click={logOut}>Beenden</button>
