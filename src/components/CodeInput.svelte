<script lang="ts">
  export let value: string = "";
  export let placeholder: string = "";
  export let maxLength: number | undefined = undefined;
  export let type: "text" | "number" = "text";
  export let state: "correct" | "wrong" | "nameErr" | "vergleichErr" | "bothErr" | "" = "";
  export let width: string = "auto";
  export let autofocus: boolean = false;

  let inputElement: HTMLInputElement;
</script>

<input
  bind:this={inputElement}
  autocomplete="off"
  class="inline-input {state}"
  type={type}
  {placeholder}
  {maxLength}
  bind:value
  style="width: {width}"
  {autofocus}
/>

