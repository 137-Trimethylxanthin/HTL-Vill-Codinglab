<script lang="ts">
  import InteractiveCodeExample from "../../../../../components/InteractiveCodeExample.svelte";
  import LessonPage from "../../../../../components/LessonPage.svelte";

  const exampleCode = `if 1 == 1: # True
  print("1 ist gleich 1")

alter: int = 15
if alter > 18: # False
  print("du bist erwachsen")
else:
  print("du bist noch nicht erwachsen")

# Variable wird neu zugewiesen und die Bedingung wird neu evaluiert
alter = 20
if alter > 18: # True
  print("du bist erwachsen und noch jung")
else:
  print("du bist nicht erwachsen oder nicht mehr jung")`;

  const exampleOutput = `> 1 ist gleich 1
> du bist noch nicht erwachsen
> du bist erwachsen und noch jung`;
</script>

<LessonPage title="Verzweigung" nextHref="aufg" backHref="../../aufgabe">
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
  <InteractiveCodeExample code={exampleCode} output={exampleOutput} />
</LessonPage>
