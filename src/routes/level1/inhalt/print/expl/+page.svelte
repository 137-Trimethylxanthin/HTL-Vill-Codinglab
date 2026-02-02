<script lang="ts">
  import InteractiveCodeExample from "../../../../../components/InteractiveCodeExample.svelte";
  import LessonPage from "../../../../../components/LessonPage.svelte";

  const exampleCode = 'print("Hello World")';
  const exampleOutput = "> Hello World";
</script>

<LessonPage title="print" nextHref="aufg" backHref="../../aufgabe">
  <p>
    Print ist ein Befehl, der Text auf dem Bildschirm anzeigt. <br>
    PS: Kommentare werden mit # gemacht. Sie werden bei Ablauf des Programmes ignoriert.<br>
    <code class="inline-input comment"># Kommentar</code> <br>
    Hier ist ein Beispiel:
  </p>
  <InteractiveCodeExample code={exampleCode} output={exampleOutput} />
</LessonPage>