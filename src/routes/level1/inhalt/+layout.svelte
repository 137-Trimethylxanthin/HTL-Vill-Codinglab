<script lang="ts">

    import { level1Store } from "../../../utils/stores";


    let currentTime = $level1Store["total"]
    let levelTime = 0;

    //read level from url
    let url = window.location.pathname.split("/");
    let currentMode = undefined;
    let tickClock = false
    let mode = url.pop();
    let level = url.pop();

    if (mode === "expl") {
        currentMode = url.pop();
    } else if (mode === "aufg") {
        currentMode = url.pop();
        tickClock = true;
    }

    if (currentMode === undefined) {
        levelTime = 0;
    } else {
        if (!Object.keys($level1Store).includes(currentMode)) {
            level1Store.set({ ...$level1Store, [currentMode]: 0 });

        } else {
            levelTime = $level1Store[currentMode];
        }
    }

    let interval = undefined;

    if (tickClock) {
        interval = setInterval(() => {            
            levelTime += 1;
            currentTime += 1;
        }, 1000);
    }


    export const finishTimer = () => {
        clearInterval(interval);
        level1Store.set({ ...$level1Store, [currentMode]: levelTime });
        level1Store.set({ ...$level1Store, ["total"]: currentTime });
    }

    



</script>


<div class="timer">
    <h2>Level 1</h2>
    <p>{String(Math.floor(currentTime / 60)).padStart(2, '0')}:{String(currentTime % 60).padStart(2, '0')}</p>
    <h3>{level}</h3>
    <p>{String(Math.floor(levelTime / 60)).padStart(2, '0')}:{String(levelTime % 60).padStart(2, '0')}</p>
</div>
<slot/>



