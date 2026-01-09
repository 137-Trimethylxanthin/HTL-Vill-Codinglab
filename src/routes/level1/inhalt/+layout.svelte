<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { onMount } from "svelte";
  import { level1Store } from "../../../utils/stores";

  let currentTime = $level1Store["total"].time;
  let levelTime = 0;

  // read level from url
  let url = window.location.pathname.split("/");
  let tickClock = false;
  let mode = url.pop();
  let level = url.pop() as string;
  let interval: any = undefined;

  export function handleUrlChange() {
    console.log($level1Store);
    url = window.location.pathname.split("/");
    console.log(window.location.pathname);
    console.log(url);
    mode = url.pop();
    console.log(mode);
    level = url.pop() as string;
    console.log(level);
    if (mode === "aufg") {
      tickClock = true;
    }

    if (tickClock) {
      if (!Object.keys($level1Store).includes(level)) {
        console.log("new level");
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
        console.log($level1Store);
        levelTime = 0;
      } else {
        levelTime = $level1Store[level].time;
      }

      interval = setInterval(() => {
        levelTime += 1;
        currentTime += 1;
      }, 1000);
    }
  }

  export const finishTimer = (finished: boolean, error: number) => {
    clearInterval(interval);

    console.log("finishTimer");
    console.log($level1Store);

    console.log(level);
    console.log(typeof level);


    level1Store.set({
      ...$level1Store,
      [level]: {
        ...$level1Store[level],
        time: levelTime,
        status: finished ? "✅" : "🟡",
        errors: error, 
      },
    });
    console.log("level1Store");
    console.log($level1Store);

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
  };

  onMount(() => {
    handleUrlChange();

    document.addEventListener("finishTimer", (e) => {
        const { finished, error } = e.detail;
        finishTimer(finished, error);
    });
  });

  afterNavigate(handleUrlChange);
</script>

<div class="timer">
  <h2>Level 1</h2>
  <p>
    {String(Math.floor(currentTime / 60)).padStart(2, "0")}:{String(
      currentTime % 60
    ).padStart(2, "0")}
  </p>
  <h3>{level}</h3>
  <p>
    {String(Math.floor(levelTime / 60)).padStart(2, "0")}:{String(
      levelTime % 60
    ).padStart(2, "0")}
  </p>
</div>
<slot />
