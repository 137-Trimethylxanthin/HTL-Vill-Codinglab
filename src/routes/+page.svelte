<script lang="ts">
    import { invoke } from '@tauri-apps/api';
	import { message } from '@tauri-apps/api/dialog';

    function openCodeWithFilename(fileName: string) {
        return function() {
            invoke('open_code_with_filename', { fileName })
        }
    }

    function setupUser() {
        invoke('setup_user', { name: "Max" }).then((res) => {
            console.log(res)
            if (res) {
                message("User wurde erstellt")
            } else {
                message("User konnte nicht erstellt werden, bereits eingeloggt?")
            }
        })
    }
</script>

<div >
    <h1>Wilkommen Freunde</h1>

    <button class="levelbtn complete" on:click={openCodeWithFilename("level1.py")}>Start Lvl 1</button>
    <button class="levelbtn amArbeiten" on:click={openCodeWithFilename("level2.py")}>Start Lvl 2</button>
    <button class="levelbtn" on:click={openCodeWithFilename("level3.py")}>Start Lvl 3</button>

    <button class="levelbtn" on:click={setupUser}>Setup User</button>
</div>
