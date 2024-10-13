import { writable } from "svelte/store";

export const nameStore = writable("");

export const level1Store = writable({
    "total": {
        time: 0,
        points: 0,
        maxPoints: 0,
        status: "❌",
        errors: 0,
    },
});


export const level2Store = writable({
    "total": {
        time: 0,
        points: 0,
        maxPoints: 0,
        status: "❌",
        errors: 0,
    },
});

export const level3Store = writable({
    "total": {
        time: 0,
        points: 0,
        maxPoints: 0,
        status: "❌",
        errors: 0,
    },
});