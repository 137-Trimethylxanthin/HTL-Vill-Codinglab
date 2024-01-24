<script lang="ts">
    import { invoke } from '@tauri-apps/api';
    


    function openCodeWithFilename(fileName: string) {
        return function() {
            invoke('open_code_with_filename', { fileName })
        }
    }
</script>

<h1>Wilkommen Freunde</h1>

<button on:click={openCodeWithFilename("level1.py")}>Start Lvl 1</button>
<button on:click={openCodeWithFilename("level2.py")}>Start Lvl 2</button>
<button on:click={openCodeWithFilename("level3.py")}>Start Lvl 3</button>