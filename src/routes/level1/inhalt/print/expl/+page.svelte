<script lang="ts">
  import LessonCard from "../../../../../components/LessonCard.svelte";
  import InteractiveCodeExample from "../../../../../components/InteractiveCodeExample.svelte";
  import NavButtons from "../../../../../components/NavButtons.svelte";
</script>

<LessonCard title="print">
  <p>
    Print ist ein Befehl, der Text auf dem Bildschirm anzeigt. <br>
    PS: Kommentare werden mit # gemacht. Sie werden bei Ablauf des Programmes ignoriert.<br>
    <code class="inline-input comment"># Kommentar</code> <br>
    Hier ist ein Beispiel:
  </p>
  <InteractiveCodeExample>
    <svelte:fragment slot="code">
      print("Hello World")
    </svelte:fragment>
    <svelte:fragment slot="output">
      > Hello World
    </svelte:fragment>
  </InteractiveCodeExample>
</LessonCard>

<NavButtons nextHref="aufg" backHref="../../aufgabe" />