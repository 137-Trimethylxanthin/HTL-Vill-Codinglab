import { writable } from "svelte/store";

export const nameStore = writable("");

export const level1Store = writable({"total":0});


export const level2Store = writable(Date.now());
export const level3Store = writable(Date.now());