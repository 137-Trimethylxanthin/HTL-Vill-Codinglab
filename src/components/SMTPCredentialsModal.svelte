<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  let url = "";
  let username = "";
  let password = "";
  let isLoading = false;
  let errorMessage = "";

  async function handleSubmit() {
    isLoading = true;
    errorMessage = "";

    try {
      await invoke("store_smtp_credentials", { url, username, password });
      dispatch("close");
    } catch (error) {
      errorMessage = `Failed to store credentials: ${error}`;
    } finally {
      isLoading = false;
    }
  }

  function handleClose() {
    dispatch("close");
  }

  function handleIgnore() {
    dispatch("ignore");
    dispatch("close");
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="modal-backdrop" on:click={handleClose}>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal" on:click|stopPropagation>
    <h1>SMTP Credentials</h1>
    <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
        <label for="url">SMTP Server URL:</label>
        <input type="text" id="url" bind:value={url} required />
      </div>
      <div class="form-group">
        <label for="username">Username:</label>
        <input type="text" id="username" bind:value={username} required />
      </div>
      <div class="form-group">
        <label for="password">Password:</label>
        <input type="password" id="password" bind:value={password} required />
      </div>
      {#if errorMessage}
        <p class="error">{errorMessage}</p>
      {/if}
      <div class="button-group">
        <button type="button" on:click={handleIgnore}>Ignore</button>
        <button type="button" on:click={handleClose}>Cancel</button>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .modal {
    padding: 20px;
    border-radius: 5px;
    background: var(--crust);
    width: 300px;
  }

  .form-group {
    margin-bottom: 15px;
  }

  label {
    display: block;
    margin-bottom: 5px;
  }

  input {
    width: 100%;
    padding: 5px;
  }

  .button-group {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 20px;
  }

  .error {
    color: red;
    margin-top: 10px;
  }
</style>
