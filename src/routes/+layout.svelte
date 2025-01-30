<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Fira+Sans">
<script>
	import { invoke } from "@tauri-apps/api/core";
    import { getCurrentWindow } from "@tauri-apps/api/window"
    import "./style.css"
	import { goto } from "$app/navigation";
    import { nameStore } from "../utils/stores";
    import { exit } from '@tauri-apps/plugin-process';
    import { open } from '@tauri-apps/plugin-shell';
    import { level1Store } from "../utils/stores";

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
        console.log("logOut");
        if (window.location.pathname !== '/') {
            let level = 1;
            let time = $level1Store["total"].time;
            let errors = $level1Store["total"].errors;
        
            let sublevelsCompleted = 0;
            let totalSublevels = 4;
            let evenStartedLevel1 = false;
            
            if (Object.keys($level1Store)) {
                for (let key in $level1Store) {
                    if (key !== "total") {
                        if ($level1Store[key].status === "✅") {
                            sublevelsCompleted++;
                        }
                        if ($level1Store[key].status === "🟡" || $level1Store[key].status === "✅") {
                            evenStartedLevel1 = true;
                        }
                    }
                }
            }
            console.log(sublevelsCompleted + " / " + totalSublevels);
            if (evenStartedLevel1) {
                invoke("level_completed", {
                    level,
                    time,
                    errors,
                    sublevelsCompleted,
                    totalSublevels,
                }).then((res) => {
                    console.log(res);
                        if (res[0]) {
                            level1Store.set({
                            "total": {
                                ...$level1Store["total"],
                                points: res[1],
                            }
                        });
                    }

                });
            }
           

            goto('/end');
        }
    }

    async function toggleFullscreen() {
        const win = getCurrentWindow();
        const isFullscreen = await win.isFullscreen();
        win.setFullscreen(!isFullscreen);
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
        invoke('get_name').then((res) => {
            if (res) {
                goto('/home');
            } else {
                goto('/');
            }
        })
    } 
    

</script>


<header>
    {#if isOpen}
        <div id="open">
            <ul>
                <li><button on:click={changeTheme}><img class="icons" src="/media/{icon}.png" alt="Theme"></button></li>
                <li></li>
                <li></li>
                <li><button on:click={goHome}><img class="icons" src="/media/home-{theme}.png" alt="Info"></button></li>
                <li></li>
                <li><button on:click={toggleFullscreen}><img class="icons" src="/media/fullscreen-{theme}.png" alt="Fullscreen"></button></li>
                <li><button on:click={logOut}><img class="icons" src="/media/logout-{theme}.png" alt="Logout"></button></li>
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
    <p class="copyLeft">© 2025 Coding Lab</p>
    <!-- svelte-ignore a11y-invalid-attribute -->
    <p class="middleLinks">Made By <a on:click={() => {open("https://github.com/137-Trimethylxanthin")}} href="#">Max</a> und <a on:click={() => {open("https://github.com/gamersi")}} href="#">Simon</a></p>
</footer>

