<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Fira+Sans">
<script>
	import { invoke } from "@tauri-apps/api";
    import { ask, message } from "@tauri-apps/api/dialog";
    import "./style.css"
	import { goto } from "$app/navigation";
    import { nameStore } from "../utils/stores";
    import { exit } from '@tauri-apps/api/process';
    import { open } from '@tauri-apps/api/shell';

    if (process.env.NODE_ENV === "production") {
        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "r" && (e.ctrlKey || e.metaKey)) {
                document.location.reload();
            }
        });
    }

    document.documentElement.dataset.theme = "dark";

    let icon = "";
    let theme = "";
    if (!localStorage.getItem('setTheme')) {
        localStorage.setItem('setTheme', 'light');
    }

    console.log(document.documentElement.dataset.theme);

    if (document.documentElement.dataset.theme === "dark"){
        icon = "sun";
        theme = "dark";
    } else {
        icon = "moon";
        theme = "light";
    }

    let isOpen = false;

    // sollte die webview aus irgendeinem grund refreshen, wird der name aus dem backend geholt | ~maxi: cool :)
    invoke('get_name').then((res) => {
        if (res) {
            nameStore.set(res);
            if (window.location.pathname === '/') {
                goto('/home');
                return;
            }
        } else {
            goto('/');
        }
    })

    function toggleHeader() {
        isOpen = !isOpen;
    }

    async function logOut() {
        if (await ask('Willst du dich wirklich abmelden?', { title: 'Abmelden' })) {
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

    async function quit() {
        if (await ask('Willst du wirklich das Coding Lab beenden?', { title: 'Beenden' }) === true) {
            await exit(0);
        } else {
            return;
        }
    }
    
    function changeTheme() {
        if (document.documentElement.dataset.theme === "dark"){
            document.documentElement.dataset.theme = "light";
            icon = "moon";
            theme = "light";
        } else {
            document.documentElement.dataset.theme = "dark";
            icon = "sun";
            theme = "dark";
        }
        localStorage.setItem('setTheme', theme);
    }


    async function goHome(){
        if (await ask('Willst du wirklich zur Startseite wechseln?', { title: 'Startseite' })) {
            invoke('get_name').then((res) => {
                if (res) {
                    goto('/home');
                } else {
                    goto('/');
                }
            })
        } else {
            return;
        }
    }

</script>


<header>
    {#if isOpen}
        <div id="open">
            <ul>
                <li><button on:click={changeTheme}><img class="icons" src="/media/{icon}.png" alt="Theme"></button></li>
                <li><button on:click={goHome}><img class="icons" src="/media/home-{theme}.png" alt="Info"></button></li>
                <li></li>
                <li></li>
                <li></li>
                <li><button on:click={logOut}><img class="icons" src="/media/logout-{theme}.png" alt="Logout"></button></li>
                <li><button on:click={quit}><img class="icons" src="/media/close-{theme}.png" alt="Close"></button></li>
            </ul>
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div on:click={toggleHeader} id="openToggle">Close</div>
        </div>
    {:else}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div on:click={toggleHeader} id="close" ></div>
    {/if}
</header>


<slot />


<footer>
    <p class="copyLeft">© 2024 Coding Lab</p>
    <p class="middleLinks">Made By <a on:click={() => {open("https://github.com/137-Trimethylxanthin")}} href="#">Max</a> und <a on:click={() => {open("https://github.com/gamersi")}} href="#">Simon</a></p>

</footer>

