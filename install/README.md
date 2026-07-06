# Installation und Start

Diese Anleitung beschreibt, wie eine Lehrkraft GemmPen Teacher auf dem
eigenen Rechner startet, ohne eine Kommandozeile bedienen zu muessen.

## Was die Startskripte tun

Es gibt zwei Startskripte, eines pro Betriebssystem:

- **Mac**: `start-mac.command`
- **Windows**: `start-windows.bat`

Beide tun genau dasselbe, nur mit den jeweils passenden Bordmitteln des
Betriebssystems. Beim Doppelklick werden der Reihe nach sechs Dinge
geprueft bzw. erledigt:

1. **Ist Node.js vorhanden?** Node.js ist die Grundausstattung, auf der die
   App laeuft. Fehlt sie, erscheint ein Hinweis mit einem Link zu
   `https://nodejs.org` und einer kurzen Anleitung. Das Skript stoppt an
   dieser Stelle, bis Node.js installiert ist.
2. **Ist die Auswertung (Ollama) installiert?** Ollama ist das Programm,
   das die eigentliche Handschrift-Erkennung und Bewertung im Hintergrund
   uebernimmt. Fehlt es, erscheint ein Hinweis mit einem Link zu
   `https://ollama.com`.
3. **Laeuft die Auswertung gerade?** Falls nicht, versucht das Skript,
   sie automatisch im Hintergrund zu starten. Gelingt das nicht, erscheint
   eine Anleitung, sie von Hand zu oeffnen.
4. **Sind die benoetigten Sprachmodelle geladen?** Die Modellnamen werden
   aus `data/config/app.json` gelesen (Felder `visionModel` und
   `gradingModel`). Gibt es diese Datei noch nicht, werden dieselben
   Standardwerte verwendet wie in der App selbst
   (`DEFAULT_APP_CONFIG` in `lib/storage.ts`, aktuell `gemma3:12b` fuer
   beide Einsatzzwecke, siehe Hinweis unten). Fehlt ein Modell, laedt das
   Skript es automatisch herunter (`ollama pull`) und weist ausdruecklich
   darauf hin, dass das beim ersten Mal 10 bis 20 Minuten dauern kann und
   das Fenster offen bleiben soll.
5. **Sind die App-Bausteine installiert?** Beim allerersten Start fehlt
   der Ordner `node_modules`; das Skript fuehrt dann einmalig
   `npm install` aus.
6. **App bauen und starten.** Beim ersten Start (kein `.next`-Ordner
   vorhanden) wird die App einmalig aufbereitet (`npm run build`),
   danach gestartet (`npm run start`) und der Standardbrowser automatisch
   auf `http://localhost:3000` geoeffnet, sobald die App wirklich
   antwortet.

Jeder Fehlerfall endet mit einem Satz, was zu tun ist, und der
Aufforderung, eine Taste zu druecken, bevor sich das Fenster schliesst. Es
gibt keinen stummen Abbruch.

## Abgleich mit der App: Modellnamen

Die Startskripte pruefen/laden **dieselben** Modellnamen, die die App
selbst verwendet:

- Quelle in der App: `data/config/app.json` (Felder `visionModel`,
  `gradingModel`), mit den Defaults aus `DEFAULT_APP_CONFIG` in
  `lib/storage.ts`, falls die Datei noch nicht existiert.
- Stand dieses Arbeitspakets: beide Modelle stehen auf `gemma3:12b`. Das
  ist laut `lib/storage.ts` **ZU BESTAETIGEN durch Svenja** (siehe
  UEBERGABE.md, Abschnitt AP3). Wenn sich das aendert (z. B. weil ein
  anderes Modell auf dem Zielrechner sinnvoller ist), muss in den
  Startskripten **nichts** angepasst werden: sie lesen den aktuellen Namen
  ohnehin aus `data/config/app.json`, sobald diese Datei einmal (z. B.
  ueber die Einstellungen-Seite der App) gespeichert wurde. Nur die beiden
  Konstanten `DEFAULT_VISION_MODEL`/`DEFAULT_GRADING_MODEL` am Anfang
  jedes Skripts muessten von Hand nachgezogen werden, falls sich die
  Code-Defaults in `lib/storage.ts` aendern, damit ein ganz erster Start
  ohne vorhandene `app.json` weiterhin dieselben Namen laedt wie die App.

## Trockenlauf-Modus (nur Pruefungen, kein Start)

Beide Skripte kennen ein Argument `check`, das nur die sechs Pruefungen
durchlaeuft (inklusive `npm install`, falls noetig), die App aber
**nicht** baut und **nicht** startet. Das ist gedacht, um die Skripte
gefahrlos zu testen, ohne gleich einen Server zu starten.

Mac (Terminal):

```
cd install
./start-mac.command check
```

Windows (Eingabeaufforderung):

```
cd install
start-windows.bat check
```

## Was in dieser Sandbox getestet wurde

Diese Entwicklungsumgebung ist ein Linux-System ohne echten Mac und ohne
Windows. Deshalb:

- **`start-mac.command`**: Der Trockenlauf-Modus wurde unter Linux mit
  `bash install/start-mac.command check` mehrfach erfolgreich
  durchgespielt: (a) ohne installiertes Ollama (Schritt 2 stoppt korrekt
  mit der Ollama.com-Anleitung), (b) mit einer simulierten
  Ollama-Installation (eigene Test-Platzhalter fuer `ollama`/`curl` auf
  dem Pfad vorgeschaltet), die den kompletten Ablauf bis zum gruenen
  Trockenlauf-Ende durchlaufen liess, inklusive einer eigenen
  `data/config/app.json` mit abweichenden Modellnamen (dort wurde
  bestaetigt, dass die Skript-Ausgabe die Namen aus der Datei uebernimmt,
  nicht die Standardwerte). Das Skript ist bewusst in einfachem,
  POSIX-nahem Bash geschrieben (kein `local -n`, keine Bash-4-only
  Arrays), damit es sowohl unter der auf dem Mac vorinstallierten Bash 3.2
  als auch unter neueren Versionen laeuft. Die einzige mac-spezifische
  Stelle ist der Browser-Aufruf `open "http://localhost:3000"`; sie ist
  hinter einer `uname -s`-Weiche (`IS_MAC`) gekapselt und kommentiert,
  unter Linux erscheint dort nur eine Textzeile statt eines Fehlers.
- **`start-windows.bat`**: **Kein echter Testlauf moeglich.** Es gibt in
  dieser Entwicklungsumgebung kein Windows. Das Skript wurde stattdessen
  sorgfaeltig von Hand gegengelesen, Zeile fuer Zeile gegen die
  Mac-Fassung gespiegelt (dieselben sechs Schritte, dieselbe Reihenfolge,
  dieselben Meldungstexte, derselbe Trockenlauf-Modus) und auf bekannte
  Batch-Fallstricke geprueft (spaete Auswertung von Variablen in
  Klammerbloecken ueber `EnableDelayedExpansion`/`!Variable!`,
  `errorlevel`-Abfragen direkt nach dem jeweiligen Befehl, `goto`s die
  nicht versehentlich in eine falsche Ebene springen). **Das ersetzt
  keinen echten Test.** Bevor das Skript an eine fremde Lehrkraft mit
  Windows-Rechner geht, sollte es einmal echt ausprobiert werden.

## Wo Svenja auf dem Mac wirklich testet

Der Trockenlauf in der Sandbox zeigt nur, dass die Ablauflogik nicht
abstuerzt und die Meldungen stimmen. Ein echter Test mit echtem Ollama,
echtem Download eines Modells und einem echten Browser-Start ist nur auf
einem echten Rechner moeglich. Empfohlener Testweg fuer Svenja auf ihrem
Mac:

1. Ollama vorher **deinstallieren** oder testweise umbenennen, damit
   Schritt 2 ("nicht gefunden") einmal echt durchlaufen wird; danach
   Ollama wieder verfuegbar machen.
2. Ollama beenden (falls es laeuft) und `install/start-mac.command`
   doppelklicken: Schritt 3 sollte Ollama automatisch starten.
3. Falls das Modell aus `data/config/app.json` (oder der Standard
   `gemma3:12b`) noch nicht lokal vorhanden ist: einmal den echten
   Download-Fortschritt und die Wartezeit-Meldung ("10 bis 20 Minuten")
   erleben.
4. Beim allerersten Start: pruefen, dass `npm install` und danach
   `npm run build` automatisch laufen, ohne dass Svenja selbst etwas in
   der Kommandozeile eintippen muss.
5. Pruefen, dass sich am Ende automatisch ein Browserfenster mit
   `http://localhost:3000` oeffnet.
6. Das Fenster schliessen und **ein zweites Mal** doppelklicken: jetzt
   sollten Schritt 5 und der Bauschritt in Schritt 6 uebersprungen werden
   ("bereits installiert"/"bereits aufbereitet"), und die App sollte
   deutlich schneller starten.
7. Den Trockenlauf einmal separat ausprobieren (siehe oben,
   `./start-mac.command check` im Terminal), um zu sehen, dass dort
   wirklich nichts gebaut oder gestartet wird.

Dieser Testweg entspricht keinem der vier Pruef-Gates aus dem Bauplan
(die drehen sich um Handschrift-Erkennung, Ollama-Anbindung als API,
Durchklick durch die App und den kompletten Foto-bis-PDF-Durchlauf); er
ist zusaetzlich sinnvoll, sobald AP10 an Svenja uebergeben wird, weil die
Startskripte selbst in keinem der Gates einzeln erwaehnt sind.

## Bekannte Grenzen dieser Version

- Kein signierter Installer, kein Autostart-Eintrag, keine
  Desktop-Verknuepfung wird automatisch angelegt. Die Lehrkraft startet
  die App jedes Mal ueber einen Doppelklick auf die jeweilige
  Startdatei (siehe auch Abschnitt "Nicht-Ziele der v1" im Bauplan).
- Der automatische Ollama-Start (Schritt 3) funktioniert nur, wenn
  `ollama` auf dem Befehlspfad (PATH) liegt, was bei einer Standard-
  installation von `https://ollama.com` der Fall ist.
- Windows: der automatische Browser-Start und die Erreichbarkeitspruefung
  nutzen PowerShell (`Invoke-WebRequest`), das auf jeder unterstuetzten
  Windows-Version vorhanden ist. Ein zusaetzliches Werkzeug wie `curl`
  ist nicht vorausgesetzt.
