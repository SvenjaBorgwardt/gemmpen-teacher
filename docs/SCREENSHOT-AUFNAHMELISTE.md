# Screenshot-Aufnahmeliste (interne Arbeitshilfe)

Diese Datei ist kein Endnutzer-Dokument, sondern eine Checkliste zum Erstellen der Bilder fuer
`ERSTE-SCHRITTE.md` (Deutsch) und `en/GETTING-STARTED.md` (Englisch).

## Was schon erledigt ist

Die **App-Screenshots sind fertig und in beiden Anleitungen eingebaut** - je 9 Bilder pro Sprache:
die Ollama-Download-Seite plus die acht App-Bildschirme (Einstellungen mit gruenem Status,
Einrichten-Assistent, Hochladen, Pruefen-Uebersicht, Pruefen-Detail mit gelber Markierung,
Bewerten-Uebersicht, Bewerten-Detail, Export). Deutsch und Englisch getrennt aufgenommen.
Die Bilder liegen in `docs/screenshots/` (`*.de.png` / `*.en.png`, plus das neutrale
`01-ollama-download.png`).

## Was noch fehlt: 5 Handaufnahmen

Diese fuenf brauchen deinen eigenen Rechner, ein Betriebssystem-Fenster oder einen Ausdruck und
lassen sich nicht automatisch erzeugen. Alle fuenf sind **sprachneutral**: du nimmst sie einmal auf,
dasselbe Bild wird in beide Anleitungen eingebaut. Es sind keine echten Schuelerdaten im Bild, also
unbedenklich.

**02 - install-Ordner mit den Startdateien**
Platzhalter: "install folder showing both start files" / "Ordner install mit den beiden Startdateien"
Wo: Finder (Mac) oder Explorer (Windows), im Ordner `install`. Drauf: `start-mac.command`,
`start-windows.bat` und `README.md` gut lesbar. Dateiname: `02-install-ordner.png`.

**03 - Mac-Sicherheitsmeldung mit Oeffnen-Knopf**
Platzhalter: "Mac security message with the Open button" / "Mac-Sicherheitsmeldung mit dem Knopf Oeffnen"
Wo: Nur auf einem Mac. Das zweite Fenster (nach Rechtsklick auf `start-mac.command`), das einen Knopf
"Oeffnen" zeigt. Erscheint nur beim allerersten Start - gleich dann aufnehmen, bevor du auf "Oeffnen"
klickst. Dateiname: `03-mac-sicherheitsmeldung.png`.

**04 - Windows-SmartScreen**
Platzhalter: "Windows SmartScreen with More info and Run anyway" / "Windows-SmartScreen mit Weitere
Informationen und Trotzdem ausfuehren"
Wo: Nur auf einem Windows-Rechner. Das blaue Fenster "Der Computer wurde durch Windows geschuetzt",
nach Klick auf "Weitere Informationen". Ebenfalls nur beim allerersten Start.
Dateiname: `04-windows-smartscreen.png`.

**05 - Startfenster waehrend des Downloads**
Platzhalter: "start window during the download" / "Startfenster waehrend des Downloads der Auswertung"
Wo: Das Terminal-/Startfenster, das die 6 Schritte prueft und gerade beim Download der Auswertung
steht (Schritt 4). Dateiname: `05-startfenster.png`.

**06 - Ausgedruckte Vorlage mit den vier Eckmarkern**
Platzhalter: "printed template showing the four corner markers" / "Ausgedruckte Vorlage mit den vier
Eckmarkern"
Wo: Ein wirklich ausgedrucktes Blatt (`public/templates/vorlage-linien.pdf`) gerade von oben
fotografiert, alle vier Eckmarker sichtbar. Dateiname: `06-vorlage-eckmarker.png`.

## Aufnehmen und einbauen

- Sauberes Bild: Fenster auf ruhige Groesse, Lesezeichenleiste und private Symbole ausblenden, eng
  zuschneiden, als PNG speichern, nichts Privates im Hintergrund.
- Ablegen in `docs/screenshots/` unter dem oben genannten Dateinamen.
- Dann den passenden `[SCREENSHOT: ...]`-Platzhalter durch ein Bild-Tag ersetzen. Der Pfad ist relativ
  zur jeweiligen Anleitung:
  - In `ERSTE-SCHRITTE.md` (liegt in `docs/`): `![Ordner install ...](screenshots/02-install-ordner.png)`
  - In `en/GETTING-STARTED.md` (liegt in `docs/en/`): `![install folder ...](../screenshots/02-install-ordner.png)`
- Der Text in den eckigen Klammern ist der Alt-Text (kurze Beschreibung fuer Vorlese-Programme).

## Abhaken

```
[ ] 02 install-Ordner       (Mac ODER Windows)
[ ] 03 Mac-Warnung          (nur Mac, erster Start)
[ ] 04 Windows-Warnung      (nur Windows, erster Start)
[ ] 05 Startfenster         (erster Start, waehrend Download)
[ ] 06 gedruckte Vorlage    (Ausdruck fotografieren)

[ ] alle fuenf Platzhalter in beiden Anleitungen ersetzt
[ ] diese Datei geloescht
```
