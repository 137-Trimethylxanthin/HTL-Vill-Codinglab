<script lang="ts">
  import LessonCard from "../../../../../components/LessonCard.svelte";
  import InteractiveCodeExample from "../../../../../components/InteractiveCodeExample.svelte";
  import NavButtons from "../../../../../components/NavButtons.svelte";
</script>

<LessonCard title="Verzweigung">
  <p>
    <code class="inline-code">if</code> führt einen Codeblock nur aus, wenn eine <code style="color: var(--peach);">Bedingung</code> wahr ist. <br>
    <code class="inline-code">if <code style="color: var(--peach);">bedingung</code>:</code> <br>
    Die <code style="color: var(--peach);">Bedingung</code> endet mit einem Doppelpunkt, danach beginnt der eingerückte Codeblock, der ausgeführt wird, wenn die <code style="color: var(--peach);">Bedingung</code> wahr ist.<br>
    Man kann auch mehrere <code style="color: var(--peach);">Bedingungen</code> aneinanderhängen mit <code class="inline-code" style="color: var(--red)">and</code> oder <code style="color: var(--red)" class="inline-code">or</code> <br>
    <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> <code style="color: var(--red);">and</code> <code style="color: var(--peach);">bedingung2</code>:</code>
    <code class="inline-code">if <code style="color: var(--peach);">bedingung1</code> <code style="color: var(--red);">or</code> <code style="color: var(--peach);">bedingung2</code>:</code> <br>
    Bei <code class="inline-code" style="color: var(--red)">and</code> müssen alle <code style="color: var(--peach);">Bedingungen</code> wahr sein, damit der Codeblock ausgeführt wird. <br>
    Bei <code class="inline-code" style="color: var(--red)">or</code> muss nur eine <code style="color: var(--peach);">Bedingung</code> wahr sein, damit der Codeblock ausgeführt wird. <br>
    Bei der <code style="color: var(--peach);">Bedingung</code> können Variablen wie auch fixe Werte verwendet werden. <br>
    Man kann auch einen <code class="inline-code">else</code> Codeblock benutzen, der ausgeführt wird, wenn die <code style="color: var(--peach);">Bedingung</code> nicht wahr ist. <br>
    <br>
    Eine <code style="color: var(--peach);">Bedingung</code> besteht aus einem Vergleich. <br>
    Bsp: <code class="inline-code">if <code style="color: var(--peach);">variable1</code> <code style="color: var(--red);">==</code> <code style="color: var(--peach);">variable2</code>:</code><br><br>
    Vergleichsoperatoren sind: <br><br>
    <code class="inline-code">==</code> gleich <br><br>
    <code class="inline-code">!=</code> ungleich <br><br>
    <code class="inline-code">&gt;</code> größer <br><br>
    <code class="inline-code">&lt;</code> kleiner <br><br>
    <code class="inline-code">&gt;=</code> größer oder gleich <br><br>
    <code class="inline-code">&lt;=</code> kleiner oder gleich <br>
  </p>
  <InteractiveCodeExample>
    <svelte:fragment slot="code">
      if <code style="color: var(--peach);">1</code> <code style="color: var(--red);">==</code> <code style="color: var(--peach);">1</code>: <code class="comment"># True</code>
      print("1 ist gleich 1")

      alter: int = 15
      if <code style="color: var(--peach);">alter</code> <code style="color: var(--red);">&gt;</code> <code style="color: var(--peach);">18</code>: <code class="comment"># False</code>
      print("du bist erwachsen")
      else:
      print("du bist noch nicht erwachsen")

      <code class="comment"># Variable wird neu zugewiesen und die Bedingung wird neu evaluiert</code>
      alter = 20
      if <code style="color: var(--peach);">alter</code> <code style="color: var(--red);">&gt;</code> <code style="color: var(--peach);">18</code>: <code class="comment"># True</code>
      print("du bist erwachsen und noch jung")
      else:
      print("du bist nicht erwachsen oder nicht mehr jung")
    </svelte:fragment>
    <svelte:fragment slot="output">
      > 1 ist gleich 1
      > du bist noch nicht erwachsen
      > du bist erwachsen und noch jung
    </svelte:fragment>
  </InteractiveCodeExample>
</LessonCard>

<NavButtons nextHref="aufg" backHref="../../aufgabe" />
