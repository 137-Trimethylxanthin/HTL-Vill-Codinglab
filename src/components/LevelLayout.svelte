<script lang="ts">
  import { onMount } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/stores";
  import { level1Store } from "../utils/stores";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let levelNumber: number = 1;
  export let levelName: string = "";

  let currentTime = $level1Store["total"].time;
  let levelTime = 0;
  let tickClock = false;
  let interval: ReturnType<typeof setInterval> | undefined = undefined;

  function getLevelFromUrl(): string {
    const pathParts = $page.url.pathname.split("/");
    const mode = pathParts.pop();
    const level = pathParts.pop() as string;
    return { level, mode };
  }

  function handleUrlChange() {
    const { level, mode } = getLevelFromUrl();
    
    if (mode === "aufg") {
      tickClock = true;
    } else {
      tickClock = false;
      if (interval) {
        clearInterval(interval);
        interval = undefined;
      }
    }

    if (tickClock) {
      if (!Object.keys($level1Store).includes(level)) {
        level1Store.set({
          ...$level1Store,
          [level]: {
            time: 0,
            status: "❌",
            points: 0,
            maxPoints: 20,
            errors: 0,
          },
        });
        levelTime = 0;
      } else {
        levelTime = $level1Store[level].time;
      }

      if (!interval) {
        interval = setInterval(() => {
          levelTime += 1;
          currentTime += 1;
        }, 1000);
      }
    }
  }

  export function finishTimer(finished: boolean, error: number) {
    if (interval) {
      clearInterval(interval);
      interval = undefined;
    }

    const { level } = getLevelFromUrl();

    if (level && $level1Store[level]) {
      level1Store.set({
        ...$level1Store,
        [level]: {
          ...$level1Store[level],
          time: levelTime,
          status: finished ? "✅" : "🟡",
          errors: error,
        },
      });
    }

    let completeFinished = false;
    for (let key in $level1Store) {
      if (key !== "total") {
        if ($level1Store[key].status !== "✅") {
          completeFinished = false;
          break;
        } else {
          completeFinished = true;
        }
      }
    }

    level1Store.set({
      ...$level1Store,
      ["total"]: {
        ...$level1Store["total"],
        time: currentTime,
        maxPoints: 100,
        status: completeFinished ? "✅" : "🟡",
      },
    });

    tickClock = false;
    dispatch("timerFinished", { finished, error });
  }

  onMount(() => {
    handleUrlChange();

    const finishHandler = (e: CustomEvent) => {
      const { finished, error } = e.detail;
      finishTimer(finished, error);
    };

    document.addEventListener("finishTimer", finishHandler as EventListener);

    return () => {
      document.removeEventListener("finishTimer", finishHandler as EventListener);
      if (interval) {
        clearInterval(interval);
      }
    };
  });

  afterNavigate(handleUrlChange);
</script>

<div class="timer">
  <h2>Level {levelNumber}</h2>
  <p>
    {String(Math.floor(currentTime / 60)).padStart(2, "0")}:
    {String(currentTime % 60).padStart(2, "0")}
  </p>
  {#if levelName}
    <h3>{levelName}</h3>
    <p>
      {String(Math.floor(levelTime / 60)).padStart(2, "0")}:
      {String(levelTime % 60).padStart(2, "0")}
    </p>
  {/if}
</div>
<slot />

<style>
  .timer {
    margin-bottom: 2vh;
  }
</style>

