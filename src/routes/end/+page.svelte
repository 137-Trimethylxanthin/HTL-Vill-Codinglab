<script lang="ts">
    import { invoke } from "@tauri-apps/api/core";
    import { ask, message } from "@tauri-apps/plugin-dialog";
    import { level1Store, level2Store, level3Store, nameStore } from "../../utils/stores";
    import { onMount } from "svelte";

    async function logOut() {
        if (await ask('Willst du wirklich Beenden?', { title: 'Beenden' })) {
            resetStores();
            invoke('logout').then((res) => {
                if (res) {
                    // @ts-ignore
                    window.location = "/";
                } else {
                    message("User konnte nicht abgemeldet werden, bereits abgemeldet?")
                }
            })
        } else {
            return;
        }
    }

    function resetStores() {
        console.log("resetting stores");
        level1Store.set({
            "total": {
                time: 0,
                points: 0,
                maxPoints: 0,
                status: "❌",
                errors: 0,
            },
        });
        level2Store.set({
            "total": {
                time: 0,
                points: 0,
                maxPoints: 0,
                status: "❌",
                errors: 0,
            },
        });
        level3Store.set({
            "total": {
                time: 0,
                points: 0,
                maxPoints: 0,
                status: "❌",
                errors: 0,
            },
        });
    }
    

    function sendMail(e: SubmitEvent) {
        
        if (!email) {
            return;
        }

        invoke("send_mail", { email }).then((res: any) => {
            if (res) {
                invoke('logout').then((res) => {
                    if (res) {
                        // @ts-ignore
                        window.location = "/";
                    } else {
                        message("User konnte nicht abgemeldet werden, bereits abgemeldet?")
                    }
                })
            }
        }).catch((err) => {
            emailWasSent = false;
            email = "error - email konnte nicht gesendet werden";
            return;
        });

        emailWasSent = true;
        email = "";
        checkMail();
    }

    let level1 = {
        name: "Level 1",
        punkte: $level1Store["total"].points,
        maxPunkte: $level1Store["total"].maxPoints,
        time: $level1Store["total"].time,
        status: $level1Store["total"].status
    }

    let level2 = {
        name: "Level 2",
        punkte: $level2Store["total"].points,
        maxPunkte: $level2Store["total"].maxPoints,
        time: $level2Store["total"].time,
        status: $level2Store["total"].status
    }

    let level3 = {
        name: "Level 3",
        punkte: $level3Store["total"].points,
        maxPunkte: $level3Store["total"].maxPoints,
        time: $level3Store["total"].time,
        status: $level3Store["total"].status
    }

    let gesPunkte = level1.punkte + level2.punkte + level3.punkte;
    let gesErreichbar = level1.maxPunkte + level2.maxPunkte + level3.maxPunkte;
    let gesZeit = level1.time + level2.time + level3.time;

    let levels = [level1, level2, level3];


    let email = ""; 
    let emailWasSent = false;
    let hasSmtpCredentials = false;

    let emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

    function checkMail() {
        console.log(email);
        if (!emailRegex.test(email) || emailWasSent === true) {
            (document.getElementById("sendMail") as HTMLButtonElement).disabled = true;
            (document.getElementById("sendMail") as HTMLButtonElement).classList.remove("isOk");
        } else {
            (document.getElementById("sendMail") as HTMLButtonElement).disabled = false;
            (document.getElementById("sendMail") as HTMLButtonElement).classList.add("isOk");
        } 
    }

    onMount(async () => {
        hasSmtpCredentials = await invoke("has_smtp_credentials");
    });

    function checkName(e: any) {
        nameStore.set((e.target as HTMLInputElement).value);
    }

    async function openPdfAndPrint(pdfBytes: number[]) {
        const blobUrl = URL.createObjectURL(new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }));
        const overlay = document.createElement("div");
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.background = "white";
        overlay.style.zIndex = "99999";

        const iframe = document.createElement("iframe");
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "0";
        iframe.src = blobUrl;
        overlay.appendChild(iframe);
        document.body.appendChild(overlay);

        const cleanup = () => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
            URL.revokeObjectURL(blobUrl);
        };

        const onAfterPrint = () => {
            window.removeEventListener("afterprint", onAfterPrint);
            cleanup();
        };
        window.addEventListener("afterprint", onAfterPrint);
        window.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                onAfterPrint();
            }
        });

        iframe.onload = () => {
            setTimeout(() => window.print(), 250);
        };
    }

    async function createCertificate() {
        if ($nameStore === undefined || $nameStore.length < 3) {
            message("Name muss mindestens 3 Zeichen lang sein", { title: "Fehler" });
            return;
        }
        try {
            const payload = await invoke<{ path: string; pdf_bytes: number[] }>("create_certificate", { name: $nameStore });
            await openPdfAndPrint(payload.pdf_bytes);
        } catch (err) {
            await message(`Zertifikat konnte nicht erstellt werden: ${err}`, { title: "Fehler" });
        }
    }

</script>

<div class="title noMargin">
    <h1>Danke fürs Spielen{$nameStore === undefined ? "" : `, ${$nameStore}!`}</h1>
</div>

<div class="timeContainer">
    <h2>Zeit und Punkte</h2>
    <h3>Gesamtzeit:</h3>
    <p>{String(Math.floor(gesZeit / 60)).padStart(2, '0')}:{String(gesZeit % 60).padStart(2, '0')}</p>
    <h3>Gesamtpunkte:</h3>
    <p>{gesPunkte}/{gesErreichbar}</p>
    <h3>Level:</h3>
    <ul>
        {#each levels as level}
            {#if level.status !== "❌"}
                <li>{level.name} ({level.status}): {level.punkte}/{level.maxPunkte} - {String(Math.floor(level.time / 60)).padStart(2, '0')}:{String(level.time % 60).padStart(2, '0')}</li>
            {/if}
        {/each}
    </ul>

</div>  

{#if hasSmtpCredentials}
    <div class="logoutContainer" >
        <h1>Statistik per E-Mail schicken</h1>
        <p>Gib deine E-Mail-Adresse ein und wir senden dir einen Bericht mit allen Zeiten und Punkten zu.</p>
        <form on:submit|preventDefault={sendMail}>
            <label for="email">E-Mail-Adresse:</label><br />
            <input type="text" id="email" bind:value={email} on:input={checkMail} name="email" placeholder="E-Mail-Adresse" required autocomplete="off"/><br />
            <button id="sendMail" type="submit">Senden</button>
        </form>
    </div>
{:else}
    <div class="logoutContainer" >
        <h1>Statistik per E-Mail schicken</h1>
        <p>Der Versand per E-Mail ist derzeit nicht verfügbar, da keine SMTP-Zugangsdaten hinterlegt sind.</p>
    </div>
{/if}

<div class="logoutContainer">
    <h1>Zertifikat</h1>
    <p>Hier kannst du ein Zertifikat für deine Leistung erstellen.</p>
    <input type="text" id="name" placeholder="Name" value={$nameStore} on:input={checkName} required autocomplete="off"/><br />
    <button class="button createCertificate" on:click={createCertificate}>Zertifikat erstellen</button>
</div>

<button class="ende" on:click={logOut}>Beenden</button>
