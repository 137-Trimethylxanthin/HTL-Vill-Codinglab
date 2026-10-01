# Spickzettel für Betreuer

Für alle, die am Tag der offenen Tür zwischen den Stationen helfen. Kurz halten, Kinder selbst draufkommen lassen — die Lösung nur, wenn gar nichts mehr geht.

## Auf dem Gang

- **Übersicht am Handy:** Admin öffnen → Abschnitt **„Übersicht am Handy“** → QR-Code mit dem Handy scannen (Handy im selben Netz wie die Stationen). Die Seite zeigt alle Stationen des Events: was gerade läuft („Mission 2.1 „Runde drehen““), wie lange schon („seit 6 Min.“), wie viele Versuche — und ein rotes **HILFE**. Oben stehen Hilferufe, dann wer am längsten an einer Mission sitzt. „offline“ heißt: die Station hat sich seit 30 Sekunden nicht gemeldet. Die Seite aktualisiert sich alle 3 Sekunden. Voraussetzung: Event-Code gesetzt und gespeichert. Den Link nicht an Besucher weitergeben (er enthält den Event-Code).
- **Hilfe-Knopf:** Kinder tippen in der Mission oben auf **„Hilfe“** (Hand). Der Knopf blinkt („Hilfe kommt!“) und auf der Übersicht erscheint **HILFE**. Der Hilferuf verschwindet, wenn das Kind nochmal tippt, die Mission schafft, der nächste Besucher beginnt oder ihr ihn im Betreuungs-Menü beendet.
- **Betreuungs-Menü** (schneller als Admin): in der Mission die **Missionsnummer oben links 2 Sekunden gedrückt halten** (Tastatur: **Strg + Umschalt + H**), dann die Admin-PIN. Große Knöpfe:
  - **Lösung zeigen** — ersetzt das Programm durch die Musterlösung. Das Kind darf sie fliegen, die Mission zählt dann aber als übersprungen (0 Sterne), damit die Bestenliste fair bleibt.
  - **Zu Mission …** — direkt zu jeder freigeschalteten Mission.
  - **Hilferuf beenden**
  - **Nächster Besucher** — beendet den Besuch (zweimal tippen) und zeigt wieder den Startbildschirm.
  - **Schließen** — das Menü schließt sich auch nach 60 Sekunden ohne Eingabe von selbst.

## Allgemeine Tipps

- Häufigster Fehler überall: **„Abheben“ vergessen** („Die Drohne muss zuerst abheben.“) oder **„Landen“ vergessen** („Fast! Vergiss nicht zu landen.“).
- Rechts/Links: immer **aus Sicht der Drohne**. Hilft: „Stell dir vor, du sitzt in der Drohne.“
- Felder zählen: das Feld, auf dem die Drohne steht, zählt **nicht** mit.
- Der Coach (Glühbirne „Hilf mir“) gibt drei Tipps nacheinander, der letzte ist fast die Lösung.

## Missionen

### 1.1 · Erster Flug

**Ziel:** Zum Landeplatz fliegen und dort landen (4 Felder geradeaus).

**Lösung (Blöcke):** Abheben · Vorwärts 4 · Landen

```python
from drone import *

takeoff()
forward(4)
land()
```

**Häufige Fehler:** Abheben vergessen; Vorwärts 1 statt 4 (kein Landeplatz); Vorwärts 5 (Ende der Karte).

**Was du dem Kind sagen kannst:** „Zähl mal mit dem Finger, wie viele Felder es bis zum Landeplatz sind.“

### 1.2 · Um die Ecke

**Ziel:** Um die Häuser herum zum Landeplatz oben rechts.

**Lösung (Blöcke):** Abheben · Vorwärts 4 · Rechts drehen · Vorwärts 4 · Landen

```python
from drone import *

takeoff()
forward(4)
turn_right()
forward(4)
land()
```

(Geht auch andersrum: Rechts drehen, Vorwärts 4, Links drehen, Vorwärts 4.)

**Häufige Fehler:** Links statt rechts drehen (Ende der Karte); zu früh abbiegen (Haus).

**Was du dem Kind sagen kannst:** „Wohin schaut die Drohne, wenn sie oben ankommt? Wohin muss sie dann?“

### 1.3 · Paketdienst

**Ziel:** Paket holen, zum Abgabeplatz bringen, abgeben, landen.

**Lösung (Blöcke):** Abheben · Vorwärts 3 · Paket nehmen · Rechts drehen · Vorwärts 4 · Paket abgeben · Landen

```python
from drone import *

takeoff()
forward(3)
pick_up()
turn_right()
forward(4)
drop()
land()
```

**Häufige Fehler:** „Paket nehmen“ vergessen („Du hast kein Paket dabei.“); neben dem Abgabeplatz abgeben („Hier ist kein Abgabeplatz.“); Links drehen (die Drohne schaut am Anfang nach links!).

**Was du dem Kind sagen kannst:** „Die Drohne schaut nach links. Wenn sie beim Paket ist — wohin muss sie sich drehen, um nach oben zu fliegen?“

### 2.1 · Runde drehen

**Ziel:** Durch alle drei Ringe fliegen und wieder am Start (Landeplatz) landen.

**Lösung (Blöcke):** Abheben · Wiederhole 4 { Vorwärts 2 · Rechts drehen } · Landen

```python
from drone import *

takeoff()
for i in range(4):
    forward(2)
    turn_right()
land()
```

**Häufige Fehler:** Wiederhole 3 (endet nicht am Start); Abheben oder Landen in die Schleife gelegt („Die Drohne fliegt schon.“); Links drehen (Ende der Karte); alles ohne Schleife gebaut — geht, gibt aber weniger Sterne.

**Was du dem Kind sagen kannst:** „Die Runde hat vier gleiche Seiten. Was machst du bei einer Seite? Das wiederholst du.“

### 2.2 · Solarpark-Inspektion

**Ziel:** Jede der 6 Solarzellen fotografieren, dann auf dem Landeplatz am Ende landen.

**Lösung (Blöcke):** Abheben · Wiederhole 6 { Vorwärts 1 · Foto } · Vorwärts 1 · Landen

```python
from drone import *

takeoff()
for i in range(6):
    forward(1)
    photo()
forward(1)
land()
```

**Häufige Fehler:** Foto vor Vorwärts in der Schleife (fotografiert den leeren Start, die letzte Zelle fehlt); das letzte Vorwärts 1 zum Landeplatz vergessen; Wiederhole 7.

**Was du dem Kind sagen kannst:** „Was muss über jeder Solarzelle passieren? Erst hinfliegen, dann …?“

### 3.1 · Nebel

**Ziel:** Im Nebel mit dem Hindernis-Sensor den Landeplatz finden. (Der Rand der Karte zählt auch als Hindernis.)

**Lösung (Blöcke):** Abheben · Wiederhole 9 { Wenn Hindernis { Rechts drehen } sonst { Vorwärts 1 } } · Landen

```python
from drone import *

takeoff()
for i in range(9):
    if obstacle_ahead():
        turn_right()
    else:
        forward(1)
land()
```

**Häufige Fehler:** Vorwärts und Drehen vertauscht (Vorwärts bei „Wenn Hindernis“ → Absturz); falsche Zahl bei Wiederhole (8: noch nicht da, 10: am Landeplatz vorbei); Links statt rechts drehen.

**Was du dem Kind sagen kannst:** „Was soll die Drohne tun, wenn vor ihr etwas ist? Und was, wenn frei ist?“

### 3.2 · Rettungsflug

**Ziel:** Erste Hilfe (Paket) zum Wanderer (Abgabeplatz) bringen, dann auf dem Landeplatz landen. Das Programm ist schon da — nur **zwei Zahlen im Python-Code** stimmen nicht (im Python-Code auf eine Zahl tippen, dann ändern).

**Lösung (Blöcke):** Abheben · Vorwärts 1 · Paket nehmen · Links drehen · Vorwärts **4** · Paket abgeben · Rechts drehen · Vorwärts **3** · Landen

```python
from drone import *

takeoff()
forward(1)
pick_up()
turn_left()
forward(4)
drop()
turn_right()
forward(3)
land()
```

**Häufige Fehler:** Kinder bauen das Programm neu, statt nur die Zahlen zu ändern; falsch gezählt (2 statt 4, 1 statt 3); das falsche Vorwärts geändert.

**Was du dem Kind sagen kannst:** „Das Programm stimmt fast. Zähl die Felder vom Paket bis zum Wanderer — welche Zahl muss im Code stehen?“
