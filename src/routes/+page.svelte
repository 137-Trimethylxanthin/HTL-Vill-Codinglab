<script lang="ts">
    import { invoke } from '@tauri-apps/api';

    function openCodeWithFilename(fileName: string) {
        return function() {
            invoke('open_code_with_filename', { fileName })
        }
    }

    function setupUser() {
        invoke('setup_user', { name: "ms" }).then((res) => {
            console.log(res)
        })
    }
</script>

<div >
    <h1>Wilkommen Freunde</h1>

<<<<<<< HEAD
    <button class="levelbtn complete" on:click={openCodeWithFilename("level1.py")}>Start Lvl 1</button>
    <button class="levelbtn amArbeiten" on:click={openCodeWithFilename("level2.py")}>Start Lvl 2</button>
    <button class="levelbtn" on:click={openCodeWithFilename("level3.py")}>Start Lvl 3</button>
</div>
=======
<button on:click={openCodeWithFilename("level1.py")}>Start Lvl 1</button>
<button on:click={openCodeWithFilename("level2.py")}>Start Lvl 2</button>
<button on:click={openCodeWithFilename("level3.py")}>Start Lvl 3</button>

<button on:click={setupUser}>setup user</button>
>>>>>>> cffab3d (added setup_user)
