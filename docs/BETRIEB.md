# Betrieb am Tag der offenen Tür

Kurzanleitung für alle, die Stationen aufbauen und betreuen.

## Erster Start

Beim ersten Start fragt die App nach einer **Admin-PIN** (4–8 Ziffern), zweimal. Ohne PIN geht es nicht weiter. Die PIN schützt alle Einstellungen, die E-Mail-Liste und den Verlauf.

PIN vergessen? App schließen, im Datenordner (siehe unten) die Datei `admin.pin` löschen, neu starten.

## Admin öffnen

- Tastatur: **Strg + Umschalt + A**
- Touch: **„HTL VILLACH“** auf dem Startbildschirm **3 Sekunden gedrückt halten**

Danach die PIN eingeben. Nach 2 Minuten ohne Eingabe sperrt sich der Admin-Bereich von selbst. Schließen ohne Änderung setzt den aktuellen Besucher nicht zurück.

## Station einstellen

| Einstellung | Wofür |
|---|---|
| Name der Station | erscheint in der Bestenliste und im Logbuch, z. B. „Halle A“ |
| **Event-Code** | **auf allen Stationen eines Events gleich setzen.** Nur Stationen mit demselben Code tauschen Ergebnisse aus. Ohne Code gibt es keinen Austausch. |
| Zurücksetzen nach Sekunden | ohne Eingabe erscheint „Bist du noch da?“, 10 s später beginnt die Station von vorn (Standard 90 s) |
| Vollbild (Kiosk-Modus) | Standard an; zum Aufbauen ausschalten |
| Missionen | welche Missionen auf der Karte stehen |
| Link im QR-Code | wohin der QR-Code am Ende führt |

Nach **Speichern** gilt die Einstellung sofort.

## Netzwerk („Schwarm“)

Die Stationen finden sich im selben Netz von selbst — kein Server, keine Einrichtung. Im Logbuch unter „Stationen im Netz“ sieht man, wer verbunden ist.

- Offenes Schul-WLAN? Besser ein **eigenes Netz oder einen Hotspot** verwenden, zusammen mit dem Event-Code.
- Handys/Tablets oder Netze, die das Finden blockieren: unter **„Stationen von Hand“** die IP-Adressen der anderen Stationen eintragen (z. B. `192.168.1.20, 192.168.1.21:47800`).
- Die Stationen verwenden Port **47800** (TCP). Eine Firewall muss ihn im lokalen Netz erlauben.

## E-Mail

1. SMTP-Server, Port, STARTTLS, Benutzer, Passwort und Absender eintragen, **Speichern**.
2. **Test-Mail senden** an die eigene Adresse.

Besucher bekommen ihr Zertifikat nur, wenn sie der Speicherung zugestimmt haben. Unter „Gespeicherte E-Mails“: **Als CSV exportieren** (für Excel) und nach dem Event **Alle löschen**.

## Zertifikate drucken

Die App speichert jedes Zertifikat als PDF im Datenordner, Unterordner `certificates`:

- Linux: `~/.local/share/at.htlvillach.codinglab/certificates`
- Windows: `%APPDATA%\at.htlvillach.codinglab\certificates`
- macOS: `~/Library/Application Support/at.htlvillach.codinglab/certificates`

Von dort ausdrucken. (Am Handy gibt es das Zertifikat nur per E-Mail.)

## Logbuch

Besuche pro Tag und Jahr, wie gut jede Mission läuft und wo Besucher aufhören. **Verlauf als CSV exportieren** für eigene Auswertungen.

- **Namen löschen nach Tagen** (Standard 7): danach bleibt nur die Statistik, ohne Namen.
- **Verlauf dieser Station löschen** löscht nur hier; andere Stationen schicken ihre Einträge wieder.

## Updates

Admin → **Updates** → „Nach Updates suchen“ → „Update installieren“. Die App startet danach neu. Nur am Computer, mit Internet.

## Wenn etwas hängt

App schließen und neu starten. Es geht nichts verloren: Einstellungen, E-Mails und Verlauf sind gespeichert. Wenn Python nicht lädt („Python konnte nicht geladen werden“), ebenfalls neu starten.
