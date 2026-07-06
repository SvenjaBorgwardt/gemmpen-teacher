# Machbarkeitstest Handschrifterkennung (AP12)

Dieser Ordner prueft, ob Ollamas Vision-Modelle die handschriftlichen
Klausuren (Exam4) zuverlaessig genug lesen koennen, um sie in gemmpen-teacher
zu verwenden. Das Ergebnis entscheidet Gate 1 (siehe BAUPLAN_gemmpen-teacher.md):
Weiter mit Handschrift-Upload, oder Pivot auf getippte Texte.

## Voraussetzungen

- Python 3.10 oder neuer
- poppler (liefert die Programme `pdftoppm` und `pdfinfo`, werden von
  pdf2image im Hintergrund benutzt): `brew install poppler`
- Fuer den echten Test (nicht fuer den Mock-Lauf): Ollama muss laufen und ein
  Vision-Modell muss geladen sein, z.B. mit `ollama pull gemma3:27b`

Primaerdaten sind read-only. Dieses Skript liest nur aus `Exam4/`, es schreibt
niemals dorthin. Alle Ausgaben landen unter `eval/out/` und `eval/ERGEBNIS.md`.

## Die drei Befehle fuer Svenja

### 1. Abhaengigkeiten installieren (einmalig)

```
cd Produkt/gemmpen-teacher/eval
pip3 install --break-system-packages -r requirements.txt
brew install poppler
```

### 2. Zuordnung pruefen (kein Ollama-Aufruf, dauert nur so lange wie das Rendern der Seiten)

```
python3 handschrift_test.py --check-mapping
```

Das Skript zerlegt die beiden PDFs in Einzelseiten und schreibt
`eval/out/page_mapping.csv`. Diese Tabelle sagt, welche PDF-Seiten zu welchem
Schueler-Kuerzel gehoeren. Bitte die Datei oeffnen (Excel, Numbers oder ein
Texteditor) und pruefen:

- Stimmen die Seitenbereiche (page_start bis page_end) wirklich mit dem
  jeweiligen Schueler ueberein? Am einfachsten mit den Original-PDFs
  gegenpruefen (jede Seite traegt das Schueler-Kuerzel oben rechts).
- Zeilen mit "gleichverteilt (PRUEFEN)" in der Spalte "quelle" sind reine
  Schaetzungen (das Skript kannte die genaue Seitenzahl pro Schueler nicht
  aus der Ground-Truth-Datei und hat gleichmaessig verteilt). Diese Zeilen
  von Hand korrigieren (page_start/page_end anpassen), sonst vergleicht der
  Test die Seiten des jeweils anderen Schuelers.
- Die Spalte "korrigiert_von_svenja" ist Platz fuer Notizen, wird vom Skript
  nicht gelesen.

Erst wenn die Zuordnung stimmt, macht Schritt 3 sinnvolle Aussagen.

Achtung: `--check-mapping` erzeugt die Tabelle jedes Mal neu und ueberschreibt
dabei Handkorrekturen. Nach dem Pruefen und Korrigieren also nicht nochmal
`--check-mapping` ausfuehren, sondern direkt mit Schritt 3 weitermachen.

### 3. Test starten (echter Lauf mit Ollama)

```
python3 handschrift_test.py --model gemma3:27b
```

Das Skript schickt jede zugeordnete Seite dreimal an Ollama (drei
Prompt-Varianten: roh, mit Aufgabenkontext, zeilenweise), vergleicht das
Ergebnis gegen die Ground-Truth-Transkripte und schreibt:

- `eval/out/results.json` -- alle Einzelwerte
- `eval/out/raw_responses/` -- die rohen Modellantworten pro Seite und Variante
- `eval/ERGEBNIS.md` -- lesbarer Bericht mit Einschaetzung

Modellname ist frei waehlbar (`--model <name>`), muss ein bei Ollama
geladenes Vision-Modell sein (`ollama list` zeigt geladene Modelle).

## Mock-Modus (ohne Ollama, zum Pruefen der Auswertungslogik)

```
python3 handschrift_test.py --mock
```

Simuliert Ollama-Antworten, indem die Ground-Truth-Texte mit kuenstlichen
Fehlern versehen werden (Zeichentausch, Loeschen, Einfuegen, gelegentlich
verschluckte Woerter). Kein Ollama noetig. Nuetzlich, um zu pruefen, dass die
komplette Auswertungskette (Zuordnung, WER/CER-Berechnung, ERGEBNIS.md)
fehlerfrei durchlaeuft, bevor der echte (langsamere) Lauf gestartet wird.

## Weitere Optionen

- `--exam4-dir <pfad>`: Falls der Exam4-Ordner nicht am Standardort liegt
- `--pdf iaf31=<pfad>`: Einzelnen PDF-Pfad ueberschreiben (falls Dateinamen
  abweichen), kann mehrfach angegeben werden
- `--host <url>`: Ollama-Host, falls nicht localhost:11434
- `--limit-students N`: Nur die ersten N Schueler auswerten (schneller
  Testlauf, z.B. um eine neue Zuordnung schnell zu pruefen)
- `--seed N`: Zufalls-Seed fuer den Mock-Modus (Reproduzierbarkeit)

## Interpretation des Ergebnisses (in ERGEBNIS.md ausformuliert)

Die Wortfehlerrate (WER) entscheidet:

- unter 5% WER: pilotfaehig
- 5-15% WER: nur mit Schueler-Selbstpruefung des Transkripts einsetzbar
- ueber 15% WER: Pivot auf getippte Texte empfohlen

## Bekannte Einschraenkungen

- Die Zuordnung Seite-zu-Schueler verlaesst sich auf die Reihenfolge der
  Schueler in `Exam4/transkripte/*.jsonl` und auf ein Feld
  `pages_transcribed` (oder verschachtelt unter `transcript.pages_transcribed`)
  in der Ground-Truth-Datei. Ist dieses Feld nicht vorhanden, verteilt das
  Skript die Seiten gleichmaessig und markiert die betroffenen Zeilen deutlich
  als PRUEFEN in `page_mapping.csv`. Deshalb ist Schritt 2 (Zuordnung pruefen)
  ein Pflichtschritt vor Schritt 3, kein optionaler.
- 300-dpi-Rendering von PDFs mit vielen Seiten (in den echten Exam4-Dateien
  ueber 100 Seiten pro Klasse) kann mehrere Minuten dauern. Das ist normal,
  das Skript rendert einmalig und legt die Bilder unter `eval/out/pages/` ab
  (Cache: ein zweiter Lauf rendert nicht erneut).
- Das Skript entfernt vor dem Vergleich die Transkriptions-Markierungen
  ([struck: ...], [inserted: ...], [unclear: ...], [illegible]) aus der
  Ground Truth, weil das Vision-Modell diese Metadaten nicht auf dem Papier
  sehen kann. Der Vergleich ist dadurch fair, aber nicht 1:1 identisch mit der
  rohen Ground-Truth-Datei.
