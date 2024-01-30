<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Fira+Sans">
<script>
	import { invoke } from "@tauri-apps/api";
    import { message } from "@tauri-apps/api/dialog";
    import "./style.css"
	import { goto } from "$app/navigation";
    import { nameStore } from "../utils/stores";
    import { exit } from '@tauri-apps/api/process';

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

    function logOut() {
        invoke('logout').then((res) => {
            if (res) {
                goto('/');
            } else {
                message("User konnte nicht abgemeldet werden, bereits abgemeldet?")
            }
        })
    }

    async function quit() {
        await exit(0);
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

</script>


<header>
    {#if isOpen}
        <div id="open">
            <ul>
                <li><button on:click={changeTheme}><img class="icons" src="/media/{icon}.png" alt="Theme"></button></li>
                <li><button on:click={() =>  {goto("/info")}}><img class="icons" src="/media/info-{theme}.png" alt="Info"></button></li> <!-- TODO: info seite -->
                <li></li>
                <li></li>
                <li></li>
                <li><button on:click={logOut}><img class="icons" src="/media/logout-{theme}.png" alt="Logout"></button></li>
                <li><button on:click={quit}><img class="icons" src="/media/close-{theme}.png" alt="Close"></button></li>
            </ul>
            <div on:click={toggleHeader} id="openToggle">Close</div>
        </div>
    {:else}
        <div on:click={toggleHeader} id="close" ></div>
    {/if}
</header>


<slot />


