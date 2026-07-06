# Ingest-Test (AP2)

Prueft die Kernfunktionen des Einlesens von Fotos und Scanner-PDFs:
Marker-Erkennung, perspektivische Entzerrung, Zuschnitt auf die Schreibzone
und das Ablegen in `data/submissions/`.

## Drei Befehle

```
# 1. Testabhaengigkeiten fuer die Datenerzeugung (einmalig)
pip install pdf2image pillow numpy --break-system-packages
# (fuer pdf2image wird poppler gebraucht: macOS: brew install poppler,
#  Linux: sudo apt-get install poppler-utils)

# 2. Testdaten erzeugen (aus public/templates/vorlage-linien.pdf)
python3 test/make_test_data.py

# 3. Test starten
npm run test:ingest
```

## Was erzeugt wird (`test/fixtures/`)

- `sheet_flat.png` - die Vorlage mit Handschrift-Platzhalter (Wellenlinien)
  und Beispiel-Kopfzeile (Aufgaben-Code, Kuerzel)
- `photo_skew_1.jpg`, `photo_skew_2.jpg`, `photo_skew_3.jpg` - drei
  perspektivisch verzerrte "Handyfotos" der Vorlage
- `scan_multi.pdf` - ein mehrseitiges "Scanner-PDF" (Stapel dreier Schueler)

Diese Dateien sind regenerierbar und liegen ausserhalb der Versionskontrolle
(siehe `.gitignore`).

## Was der Test prueft

1. Marker werden auf allen drei schraegen Fotos erkannt (Erkennungsrate).
2. Ein Foto wird entzerrt und auf die Schreibzone zugeschnitten (Seiten-
   verhaeltnis plausibel, Kopfzeile als Querstreifen).
3. Die Orientierung wird ueber das Asymmetrie-Quadrat sicher bestimmt.
4. Die drei Scanner-PDF-Seiten laufen durch (Marker erkannt, entzerrt).
5. Das Ergebnis wird strukturiert in `data/submissions/` abgelegt (gueltige
   PNGs plus Seiten-Index).

Der ganze Testsatz (AP4 plus AP2) laeuft mit `npm test`.

## Integrationslauf ueber die ganze App (AP13)

`test/run-integration.sh` fuehrt den kompletten Nutzerpfad per echtem HTTP
gegen eine laufende App aus (kein Ollama noetig; Erkennung und Bewertung
fallen auf den Platzhalter-Ersatz zurueck). Der Runner startet `next start`,
spielt den Pfad durch und stoppt den Server wieder.

```
# Voraussetzung: einmal bauen
npm run build

# Testbilder aus dem Fixture-PDF/-Foto vorbereiten (Base64 fuer den HTTP-Body)
mkdir -p /tmp/ap13
pdftoppm -r 150 -png test/fixtures/scan_multi.pdf /tmp/ap13/scanpage
cp test/fixtures/photo_skew_1.jpg /tmp/ap13/photo1.jpg
for p in /tmp/ap13/scanpage-*.png; do base64 -w0 "$p" > "$p.b64"; done
base64 -w0 /tmp/ap13/photo1.jpg > /tmp/ap13/photo1.jpg.b64

# Lauf starten
bash test/run-integration.sh
```

Geprueft werden der Reihe nach: Fach einrichten (Wizard-API), mehrseitiges
PDF plus Foto hochladen (Ingest), Erkennung (Platzhalter), Transkript pruefen
inklusive 409-Sperre bei unsicheren Stellen, Config zuordnen, bewerten, eine
Korrektur speichern (es muss eine DPO-Zeile entstehen), freigeben, Feedback-
PDF und Klassenuebersicht exportieren (gueltige PDFs) und der DPO-JSONL-Export.

## Hinweis zum Test-Loader

Der Test laeuft mit Node 22 (Type-Stripping). Der kleine Loader
`lib/__tests__/resolve-ts.mjs` (aus AP4 uebernommen) erlaubt extensionslose
Importe (`./raster`) auf `.ts`-Dateien, so wie es der Next-Bundler tut.
Keine zusaetzliche Test-Bibliothek noetig, nur `node --test`.
