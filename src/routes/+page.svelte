<script>
    import { invoke } from '@tauri-apps/api';
    
    import { writable } from 'svelte/store';

    const tauriMessage = writable('Loading...');
    
    invoke('hello').then((message) => {
        console.log(message);
        tauriMessage.set(message);
    });
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>
<p>Message from tauri: {$tauriMessage}</p>