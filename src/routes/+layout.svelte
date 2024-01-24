<script>

    import "./style.css"
    //TODO: temporär später in optionenen hab dafür schon a function geschreiben :)
    document.documentElement.dataset.theme = "dark";

    let icon = "";
    let theme = "";
    if (!localStorage.getItem('setTheme')){
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

    function toggleHeader(){
        isOpen = !isOpen;
    }

</script>


<header>
    {#if isOpen}
        <div id="open">
            <ul>
                <li>test</li>
                <li>test</li>
            </ul>
            <div on:click={toggleHeader} id="openToggle">Close</div>
        </div>
    {:else}
        <div on:click={toggleHeader} id="close" ></div>
    {/if}
</header>

<slot />