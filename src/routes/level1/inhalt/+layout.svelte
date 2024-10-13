<script lang="ts">
  import { afterNavigate } from "$app/navigation";
  import { level1Store } from "../../../utils/stores";

  let currentTime = $level1Store["total"].time;
  console.log($level1Store["total"]);
  let levelTime = 0;

  //read level from url
  let url = window.location.pathname.split("/");
  let tickClock = false;
  let mode = url.pop();
  let level = url.pop();
  let interval = undefined;

  export function handleUrlChange() {
    url = window.location.pathname.split("/");
    mode = url.pop();
    level = url.pop();
    if (mode === "aufg") {
      tickClock = true;
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

      interval = setInterval(() => {
        levelTime += 1;
        currentTime += 1;
      }, 1000);
    }
  }

  handleUrlChange();

  export const finishTimer = (finished: boolean, error: number) => {
    clearInterval(interval);
    level1Store.set({
      ...$level1Store,
      [level]: {
        ...$level1Store[level],
        time: $level1Store[level].time + levelTime,
        status: finished ? "✅" : "🟡",
        errors: $level1Store[level].errors + error, 
      },
    });

    let completeFinished = true;

    if (Object.keys($level1Store).length === 4) {
      for (let key in $level1Store) {
        if (key !== "total") {
          if ($level1Store[key].status !== "✅") {
            completeFinished = false;
            break;
          }
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
