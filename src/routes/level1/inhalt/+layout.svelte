<script lang="ts">
  import { onMount } from "svelte";



    import { level1Store } from "../../../utils/stores";


    let currentTime = $level1Store["total"].time;
    console.log($level1Store["total"]);
    let levelTime = 0;

    //read level from url
    let url = window.location.pathname.split("/");
    let tickClock = false
    let mode = url.pop();
    let level = url.pop();
    let interval = undefined;

    //on change of url


    export function handleUrlChange() {
        url = window.location.pathname.split("/");
        mode = url.pop();
        level = url.pop();
        if (mode === "aufg") {
            tickClock = true;
        }




        if (tickClock) {
            if (!Object.keys($level1Store).includes(level)) {
            level1Store.set({ ...$level1Store, [level]: {
                time: 0,
                status: "❌",
                points: 0,
                maxPoints: 20,
                errors: 0
            } });

        } else {
            levelTime = $level1Store[level];
        }

            interval = setInterval(() => {
                levelTime += 1;
                currentTime += 1;
            }, 1000);
        }
    }

    handleUrlChange();

    //on change of url


    export const finishTimer = (finished: boolean) => {
        clearInterval(interval);
        level1Store.set({ ...$level1Store, [level]: {
            ...$level1Store[level],
            time: levelTime,
            status: finished ? "✅" : "🟡"
        } });



        level1Store.set({ ...$level1Store, ["total"]: {
            ...$level1Store["total"],
            time: currentTime,
            maxPoints: 100,
            status: "🟡"
        }
        });


        tickClock = false;

    }


    //custom event listener
    window.addEventListener("popstate", handleUrlChange);

    //finsih timer
    window.addEventListener("finishTimer", (e) => {
        finishTimer( true);
    });


</script>


<div class="timer">
    <h2>Level 1</h2>
    <p>{String(Math.floor(currentTime / 60)).padStart(2, '0')}:{String(currentTime % 60).padStart(2, '0')}</p>
    <h3>{level}</h3>
    <p>{String(Math.floor(levelTime / 60)).padStart(2, '0')}:{String(levelTime % 60).padStart(2, '0')}</p>
</div>
<slot/>



