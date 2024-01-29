''' 
Bei Level 1 wird das Ausgeben und Einlesen von Werten gezeigt
Auch if - Abfragen werden vorgestellt und geübt. 
'''
# Ausgabe von Werten am Bildschirm

# Beispiel 1:
# Gib "Hello World!" auf dem Bildschirm aus

''' 
notwendige Informationen:
print("Text") --> gibt Text auf der Console aus
'''

# Aufgabe 2: 
# Gib den heutigen Wochentag am Bildschirm aus

# Aufgabe 3: 
# Gib dein Lieblingsfach am Bildschirm aus

# Anlegen von Variablen und Ausgabe der eingelesenen Variablen

#Beispiel 2: 
#Schreibe ein Programm, das den Benutzer nach seinem Namen fragt und ihn dann begrüßt

'''
 notwendige Informationen:
 Daten werden in sogenannten Variablen gespeichert.
 Variablen sind wie ein Schrank mit vielen kleinen Schubladen. 
 In jede Schublade kann nur ein Inhalt gesteckt werden. 
 Wird ein neuer Inhalt in eine Schublade gesteckt, fällt der alte Inhalt raus.
Unser virtueller Schrank hat beliebig viele Schubladen. 
Deswegen müssen diese über einen Namen eindeutig gekennzeichnet werden.
So können wir Beispielsweise eine Schublade beschriften mit "vorname". 
Somit wissen wir, dass wir in dieser Schublade einen Vornamen finden.
Um nun die Schublade zu nutzen, also etwas in der Schublade (Variablen) abzulegen,
wird dem Variablennamen über ein Gleichheitszeichen ein Inhalt zugewiesen.

# text:str = ""                                  --> Anlegen einer Variablen 
# text = input("Gib mir einen Text")             --> Die Eingabe der Tastatur wird in text gespeichert
# print(f"Der eingegebene Text lautet: {text})   --> Ausgabe mit Variablen
# f wird benötigt um den Platzhalter {text} mit dem Inhalt der Variable text zu ersetzen
'''

# Verzweigung - Bedingung

# Beispiel 3:
# Einlesen von Ganzzahlen und Überprüfen der Werte auf Zutreffen einer Bedingung
'''
Hinweise: 
Um Ganzzahlen von der Tastatur einlesen zu können, muss vor input int --> steht für Integer stehe,
Ganzzahl angegeben werden.
Man kann Variablen auf Bedingungen prüfen (>, <, >=, <= , == , != )

Beispiel: 
temperatur:int = 0
temperatur = int(input("Gib mir die aktuelle Temperatur als Ganzzahl ein: "))

if temperatur < 20:
    print("Puh ist das kalt")
else: 
    print("Ja, das ist angenehm warm, so kann es bleiben!")
'''

# Aufgabe: Lies das Alter und den Namen des Benutzers ein 
# Wenn er jünger als 18 ist begrüße ihn mit "Hallo {name}!"
# Sonst begrüße ihn mit "Guten Tag {name}!"

''' Schreibe hier deine Lösung'''

# Aufgabe: Frage den Benutzer nach einer Zahl und gib zurück, ob die Zahl 
# größer gleich 100 ist oder nicht