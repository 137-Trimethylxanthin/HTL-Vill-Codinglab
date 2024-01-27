<script>
	import { invoke } from "@tauri-apps/api";
    import { message } from "@tauri-apps/api/dialog";
    import "./style.css"
	import { goto } from "$app/navigation";
    import { nameStore } from "../utils/stores";

    if (process.env.NODE_ENV === "production") {
        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "KeyR" && (e.ctrlKey || e.metaKey)) {
                document.location.reload();
            }
        });
    }

    //TODO: temporär später in optionenen hab dafür schon a function geschreiben :)
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

    // sollte die webview aus irgendeinem grund refreshen, wird der name aus dem backend geholt
    invoke('get_name').then((res) => {
        if (res) {
            nameStore.set(res);
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

</script>


<header>
    {#if isOpen}
        <div id="open">
            <ul>
                <li><button on:click={logOut}>Abmelden</button>
                <li>test</li>
            </ul>
            <div on:click={toggleHeader} id="openToggle">Close</div>
        </div>
    {:else}
        <div on:click={toggleHeader} id="close" ></div>
    {/if}
</header>

<slot />