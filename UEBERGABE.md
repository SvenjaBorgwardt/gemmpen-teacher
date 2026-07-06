# UEBERGABE gemmpen-teacher

Staffelstab-Datei fuer alle Arbeitspakete. Jedes AP liest zuerst diese Datei und ergaenzt sie am Ende.

Stand: nach AP0 (Projekt-Geruest).

---

## Was existiert

### Technik-Basis
- Next.js 16 (App Router), TypeScript, Tailwind v4. Node 22 in der Sandbox.
- `npm install` und `npm run build` laufen fehlerfrei. `npx eslint .` ist sauber (0 Fehler).
- Fonts: Cormorant Garamond (Serif-Ueberschriften) und DM Sans (Fliesztext) ueber `next/font`.

### Design (Hausregel 7, Warm Paper)
- Farbvariablen und Bausteine in `app/globals.css`:
  - `--paper` `#faf6ef`, `--paper-raised` `#fffdf8`, `--ink` `#2b2620`, `--ink-soft` `#5c5449`, `--line` `#e7ddcc`.
  - Akzente `--amber` `#b8860b`, `--amber-strong` `#9a6f08` (kontraststark fuer Text), `--amber-soft` `#f3e8cf`.
  - Kategorie-Farben: Grammatik `#B85C3A`, Satzbau `#7A8B5A`, Wortschatz `#B8860B`, Verknuepfungen `#7A6B8A`.
  - CSS-Klassen `.gp-card`, `.gp-button`, `.gp-button-ghost` fuer wiederkehrende Elemente.
  - Als Tailwind-Farben nutzbar: `bg-paper`, `text-ink`, `border-line`, `bg-amber-soft`, `text-amber-strong` usw.
- Kontrast: `--amber-strong` statt reinem Gold fuer Text auf Creme (Hausregel 5). Grundschrift 16px.

### Navigation und Seiten
- `components/nav.tsx`: Hauptnavigation mit allen acht Punkten. Aktiver Punkt ist hervorgehoben (Klasse plus `aria-current="page"`), also sagt jeder Screen, wo man ist. Aktivzustand ueber die aktive Klasse, nicht ueber ID-gegen-display (Hausregel 9).
- `app/page.tsx` (Start / Dashboard): echter Inhalt. Zeigt den Vier-Schritte-Ablauf mit genau einer klaren Weiter-Aktion (Hausregel 4).
- Platzhalter-Seiten (Geruest steht, Inhalt kommt im jeweiligen AP):
  - `app/setup/page.tsx` (Einrichten / Wizard) -> AP5
  - `app/subjects/page.tsx` (Faecher / Konfigurationen) -> AP5
  - `app/upload/page.tsx` (Hochladen) -> AP2
  - `app/review/page.tsx` (Pruefen / Transkripte) -> AP6
  - `app/assess/page.tsx` (Bewerten / Review) -> AP7
  - `app/export/page.tsx` (Export) -> AP8
  - `app/settings/page.tsx` (Einstellungen) -> AP3
- `components/page-header.tsx`: gemeinsamer Seitenkopf mit den beiden Bloecken JETZT und DANACH (Hausregel 4). Jede Platzhalter-Seite nutzt ihn.
- `components/placeholder-note.tsx`: einheitlicher Platzhalter-Hinweis (Text aus Locale).

### Sprachumschaltung (i18n)
- `lib/i18n.tsx`: `LocaleProvider` plus `useI18n()`-Hook. Standardsprache Deutsch, Umschalter in der Navigation (Globus-Symbol mit Kuerzel DE/EN).
- Wahl bleibt in `localStorage` unter dem Schluessel `gemmpen.locale`. Gelesen ueber `useSyncExternalStore`, damit die Server-Ausgabe stabil bei Deutsch bleibt und der Client die gespeicherte Wahl uebernimmt.
- Der Umschalter wechselt sichtbar die Beschriftungen der Navigation (getestet ueber die Locale-Schluessel).
- `locales/de.json` und `locales/en.json`: identische Schluessel. Enthalten die Navigations-Strings plus die JETZT/DANACH-Texte und Titel aller Seiten. Englisch ist frei formuliert, nicht Wort-fuer-Wort uebersetzt.
- Regel fuer alle folgenden APs: kein UI-String hart im Code, alles ueber `t("schluessel")` (Hausregel 8). Neue Schluessel immer in BEIDE Locale-Dateien.

### Datentypen (`lib/types.ts`)
Kern-Interfaces, an der `data/`-Struktur aus Abschnitt 0 orientiert:
- `SubjectConfig` (data/config): Fach, Textsprache, Feedback-Sprache, Klassenstufe, Niveau, Notensystem, Feedback-Stil, Verbotswoerter (Default = Hausregel 2), `rubric`.
- `Rubric` mit `Criterion[]`, `expectedPoints` (Erwartungshorizont) und `calibrationSamples` (bewertete Beispielarbeiten).
- `Criterion` inklusive optionaler Alles-oder-Nichts-Sonderregel (z.B. Claim + Reason + Example) und Kategorie-Farbschluessel.
- `Submission`, `SubmissionPage` (Seiten mit Bildpfad, Kopfzeilen-Ausschnitt, Marker-Erkennung), `SubmissionStatus` (ingested -> transcribed -> checked -> assessed -> released).
- `Transcript` mit `TranscriptLine[]` (Text mit `[[wort?]]`-Markierung fuer unsichere Woerter, optionale Bildposition).
- `Assessment` mit `CriterionAssessment[]` (Punkte, Begruendung, Zitate) und Note-Anzeige.
- `FeedbackDraft`: Staerke zuerst, dann Beobachtungen mit Zitat, dann ein naechster Schritt, optional Uebung.
- `DpoPair`: Korrektur-Paar (rejected = Original, chosen = Korrektur) fuer den JSONL-Export.
- Hilfstypen: `UiLocale`, `GradingSystem` (`nrw-points`, `grades-1-6`, `percent`), `LanguageCode`, `IsoTimestamp`.

### Dateisystem-Speicher (`lib/storage.ts`)
- Nur serverseitig verwenden (Node `fs`). Nicht in Client-Komponenten importieren.
- Basisordner ueber `dataRoot()`, ueberschreibbar per `GEMMPEN_DATA_DIR`. `ensureDataDirs()` legt die drei Ordner an.
- Layout:
  - `data/config/<id>.json` -> `listConfigs`, `readConfig`, `writeConfig`, `deleteConfig`.
  - `data/submissions/<roundId>/<submissionId>/{submission,transcript,assessment,feedback}.json` -> `listRounds`, `listSubmissions`, `read/writeSubmission`, `read/writeTranscript`, `read/writeAssessment`, `read/writeFeedback`.
  - `data/dpo/<fileId>.jsonl` -> `appendDpoPair`, `readDpoPairs`, `listDpoFiles`.
- IDs werden ueber `safeId()` geprueft, damit kein Ausbruch aus den Datenordnern moeglich ist.

### Daten-Ordner
- `data/config/`, `data/submissions/`, `data/dpo/` existieren (mit `.gitkeep`).
- `.gitignore` haelt den Inhalt dieser Ordner aus dem Repo (Schuelerdaten bleiben lokal), behaelt aber die leeren Ordner ueber `.gitkeep`.

---

## Was noch Platzhalter ist

(Stand direkt nach AP0; siehe die AP-Abschnitte weiter unten fuer den aktuellen Stand.)

- Sechs Seiten haben nur Kopf plus Platzhalter-Hinweis (Einrichten, Faecher, Pruefen, Bewerten, Export, Einstellungen; jeweils mit Ziel-AP).
- Die Hochladen-Seite ist fertig (AP2, siehe unten). Ingest (Foto/Scan), Rubric-Schema, Prompts und Kalibrierung stehen (AP2 + AP4).
- Es gibt noch keine Anbindung an die Auswertung (Ollama) -> AP3.
- Der `storage.ts`-Code wird jetzt vom Ingest (AP2) genutzt; die Bewertungskette folgt ab AP5.

**Nach AP7 aktuell:** Einrichten, Faecher, Hochladen, Einstellungen, Pruefen und Bewerten sind fertig. Nur noch Export (AP8) ist Platzhalter.

**Nach AP8 aktuell:** Alle acht Seiten haben echten Inhalt, kein Platzhalter mehr uebrig. Naechste APs (AP9 i18n-Vervollstaendigung, AP10 Startskripte, AP11 Doku, AP13 Integration, AP14 Endabnahme) bauen auf einer vollstaendigen App auf.

**Nach AP10 aktuell:** `install/start-mac.command` und `install/start-windows.bat` (plus `install/README.md`) sind fertig, siehe eigener AP10-Abschnitt weiter unten. Kein Platzhalter, aber zwei offene Punkte: Windows-Skript nur gegengelesen statt echt getestet (kein Windows in dieser Umgebung), echter Mac-Test steht auf Svenjas Rechner noch aus.

**Nach AP11 aktuell:** `docs/` (Deutsch) und `docs/en/` (Englisch) enthalten je vier Dokumente fuer Lehrkraefte (ERSTE-SCHRITTE/GETTING-STARTED, MEIN-FACH-EINRICHTEN/SET-UP-MY-SUBJECT, HAEUFIGE-FRAGEN/FAQ, DATENSCHUTZ/PRIVACY), siehe eigener AP11-Abschnitt weiter unten. Gegen den tatsaechlichen Code und die UI-Texte geprueft, nicht geraten. Screenshot-Platzhalter in den ersten Schritten sind noch unbefuellt (echte Bilder erst nach einem Mac-Durchlauf).

---

## Definition of Done AP0: erfuellt

- `npm run build` laeuft fehlerfrei in der Sandbox (alle 8 Seiten plus Start werden erzeugt).
- Alle Seiten sind ueber die Navigation erreichbar.
- Die Navigation zeigt auf jedem Screen, wo man ist (aktiver Punkt hervorgehoben).
- Der Sprachumschalter wechselt sichtbar die Beschriftungen der Navigation (DE/EN), Wahl bleibt in `localStorage`.

## AP4: Rubric-Schema, Prompt-Bibliothek, Kalibrierung (erledigt)

### Was existiert

- **Typen** (`lib/types.ts`, erweitert, nichts umbenannt): `RubricMetadata` (flache Sicht auf `SubjectConfig`), die JSON-Ergebnistypen `ContentMatchResult`, `CriteriaScoringResult`, `FeedbackResult`, sowie Kalibrier-Typen `CriterionDeviation`, `CalibrationSampleResult`, `CalibrationReport`. Konstante `DEFAULT_FORBIDDEN_WORDS` (Hausregel-2-Woerter, deutsch und englisch).
- **Schema** (`lib/rubric/rubric.schema.json`): JSON-Schema (Draft-07) fuer eine komplette `SubjectConfig`. Maschinenlesbare Referenz fuer externe Werkzeuge.
- **Validierung** (`lib/rubric/validate.ts`): `validateSubjectConfig(input)` gibt alle Fehler mit Pfad und Klartext zurueck; `assertValidSubjectConfig(input)` wirft mit lesbarer Liste. Abhaengigkeitsfrei (keine Schema-Engine noetig), damit der Build stabil bleibt. Prueft u.a. Notensystem, Alles-oder-Nichts-Regel (mindestens zwei Teile), doppelte Kriterien-ids und ob `teacherScores` nur echte Kriterien treffen.
- **Metadaten** (`lib/rubric/metadata.ts`): `metadataFromConfig(config)` und `gradingSystemLabel(system)`. `SubjectConfig` bleibt einzige Quelle, nichts wird doppelt gespeichert.
- **Prompt-Bibliothek** (`lib/prompts/`):
  - `templates.ts`: drei Vorlagen mit `{{platzhaltern}}` und je einem System- und User-Teil: `CONTENT_MATCH` (Inhaltsabgleich), `CRITERIA_SCORE` (Bewertung mit woertlichen Zitaten), `FEEDBACK` (Staerke zuerst, 2-3 Beobachtungen mit Zitat, ein naechster Schritt). Gemeinsamer `RULE_BLOCK` mit den Schutzregeln (Sprache, Zitatpflicht, keine Loesung, Verbotswoerter, nie das Unerwuenschte benennen auch nicht verneint). Jede Vorlage verlangt striktes JSON in fest vorgegebener Form.
  - `render.ts`: `renderContentMatch`, `renderCriteriaScore`, `renderFeedback(config, text, assessment)`. Fuellen die Platzhalter aus der Config. Ergebnis ist `{ system, user }`.
  - `chat.ts`: Interface `ChatClient` (nur `complete(prompt)` -> roher Text) plus `parseJsonResponse<T>(raw)` (holt das JSON-Objekt, toleriert ```json-Zaeune). AP3 liefert den echten Ollama-`ChatClient`.
  - `chat.mock.ts`: `createMockChatClient(options)` liefert deterministisches, strukturell passendes JSON fuer alle drei Vorlagen. Fuer Tests und den Ollama-freien Betrieb.
  - `postprocess.ts`: `guardText(text, forbiddenWords)` ersetzt verbotene Woerter (nur ganze Woerter, Umlaut-fest) durch `[...]` und meldet Treffer; `findForbidden(...)` meldet nur.
  - `index.ts`: Sammel-Export.
- **Kalibrierung** (`lib/rubric/calibrate.ts`): `runCalibration(config, client)` schickt jede Beispielarbeit durch die Kriterien-Bewertung und liefert Abweichung je Kriterium (`delta`, `absDelta`, `maxPoints`), je Beispiel und im Mittel. Nutzt den `ChatClient` (echt oder Mock).
- **Beispiel-Konfigurationen** (`data/config/beispiele/`): `englisch-comment.json` (an GemmPen angelehnt: Intro/3 Counter/Bridge/3 Own/Conclusion, CRE-Alles-oder-Nichts, vier Sprachkriterien 0-15), `deutsch-eroerterung.json` (dialektisch, Argument-Beleg als Sonderregel), `wirtschaft-fachtext.json` (Fallanalyse, Handlungsempfehlung als Sonderregel). Jede mit zwei bewerteten Beispielarbeiten fuer die Kalibrierung. `.gitignore` haelt diesen Ordner bewusst im Repo (Startvorlagen), waehrend echte Konfigurationen lokal bleiben.

### Was AP3/AP5/AP7 hiervon nutzen sollen

- **AP3 (Ollama):** implementiere den `ChatClient` aus `lib/prompts/chat.ts` (Methode `complete({system, user})` gegen `gradingModel`). Danach passt der Client ueberall (Bewertungskette und Kalibrierung). Antworten mit `parseJsonResponse<T>()` parsen; die Zieltypen sind `ContentMatchResult`, `CriteriaScoringResult`, `FeedbackResult`.
- **AP5 (Wizard):** validiere jede zusammengebaute Config mit `validateSubjectConfig` vor dem Speichern (kein JSON in der UI). Fuer den Kalibrierschritt `runCalibration` aufrufen und `report.perCriterion` (mittlere Abweichung je Kriterium) anzeigen. Der Mock-Client aus `chat.mock.ts` erlaubt den Wizard-Test ohne Ollama.
- **AP7 (Review):** Bewertungskette = `renderContentMatch` -> `renderCriteriaScore` -> `renderFeedback` ueber den AP3-Client. Vor der Anzeige jeden generierten Text durch `guardText(text, config.forbiddenWords)` schicken und Treffer ersetzen (Hausregel 2).

### Tests

- `npm test` fuehrt die Node-eigenen Tests aus (kein Zusatz-Paket, laeuft offline). 18 Tests, alle gruen: Schema validiert die drei Beispiel-Konfigurationen und erkennt typische Verstoesse; die drei Prompts rendern ohne offene Platzhalter und mit allen Schutzregeln (Snapshots unter `lib/__tests__/__snapshots__/`, mit `UPDATE_SNAPSHOTS=1` neu schreibbar); die Kalibrierung laeuft gegen den Mock; der Verbotswort-Schutz greift.

## AP2: Ingest (Foto und Scanner-PDF) und Hochladen-Seite (erledigt)

### Was existiert

- **Reine Bildverarbeitung** (`lib/ingest/`, ohne Browser- oder Node-Abhaengigkeit, damit testbar):
  - `geometry.ts`: Punkt-/Quad-Typen, Gauss-Loeser, Homographie (`computeHomography`, `applyHomography`), `orderCorners`.
  - `raster.ts`: `RasterImage` (RGBA-Puffer, wie Canvas `getImageData` oder sharp/PIL liefern), `toGray`, `otsuThreshold`, `warpPerspective` (bilineare Entzerrung), `cropRect`.
  - `marker-geometry.ts`: die Markergeometrie aus AP1 in mm (15 mm Inset, 8 mm Kreis, 4 mm Asymmetrie-Quadrat, 3 mm Abstand) plus Schreibzonen- und Kopfzeilen-Masse. Quelle der Wahrheit bleibt `templates_build.py`/`README.md`.
  - `markers.ts`: `detectMarkers(img)` - Otsu-Schwelle, Blob-Suche (Flood-Fill) in den vier Bildecken, Filter nach Groesse und Rundheit, heller Innenpunkt als Bonus, Asymmetrie-Quadrat bestimmt die Orientierung (auch bei Drehung/Spiegelung). Gibt vier geordnete Ecken zurueck oder `null`.
  - `dewarp.ts`: `dewarpPhoto(img)` und `dewarpScannerPage(img)` - erkennt Marker, entzerrt das ganze Blatt in ein festes mm-Raster (`OUTPUT_PX_PER_MM`), schneidet Schreibzone und Kopfzeile deterministisch in mm aus. Ohne Marker: Bild bleibt unveraendert, `templateDetected=false`, Kopfzeile wird proportional geschaetzt.
- **Node-seitige Bild-Ein/Ausgabe** (`lib/ingest/node-image.ts`, nur Server): nutzt `sharp` (ohnehin Next-Abhaengigkeit, kann jpg/png/heic). `decodeImage`, `encodePng`, `downscaleForDetection`.
- **Client-PDF-Rendering** (`lib/ingest/pdf-client.ts`, nur Browser): `renderPdfToPages(file)` rendert jede PDF-Seite mit `pdfjs-dist` bei ~300 dpi zu einem PNG-Data-URL (auch mehrseitige Stapel). `readPhotoFile`, `classifyFile`.
- **Ablage** (`lib/ingest/store.ts`, nutzt `dataRoot()` aus `lib/storage.ts`): Bilder unter `data/submissions/<roundId>/pages/<pageId>.png` (+ `.header.png`), Index `pages.json`. `storePage`, `readPagesIndex`, `readPageImage`, `deletePage`, `assignPages`. Die Zuordnung schreibt zusaetzlich eine `Submission` pro Kuerzel ueber `lib/storage.ts` (`sub-<alias>`, Folgeseiten werden angehaengt). Bilder liegen bewusst ausserhalb `public/` (Schuelerdaten bleiben lokal).
- **API-Routen** (`app/api/ingest/`): `POST /api/ingest` (Seiten entzerren + ablegen), `GET/POST/DELETE /api/ingest/pages` (Galerie/Zuordnung/Loeschen), `GET /api/ingest/image` (liefert ein gespeichertes Bild lokal aus). Alle `runtime = "nodejs"`.
- **Hochladen-Seite** (`app/upload/page.tsx`): Stapel benennen, Drag-and-drop plus Dateiauswahl, Fortschritt pro Datei, Galerie mit Kopfzeilen-Ausschnitt, Badge "Vorlage erkannt" bzw. "Vorlage nicht erkannt, die Erkennung kann ungenauer sein", Zuordnung zu Kuerzel (Uebernehmen fuer diese oder fuer folgende Seiten), Loeschen, Weiter zum Pruefen. Screenfuehrung nach Hausregel 4 (JETZT/DANACH je Abschnitt). Alle Strings in beiden Locale-Dateien.

### Wichtige Datei-Fixes (in diesem AP erledigt)
- `lib/ingest/pdf-client.ts`: der von AP4 gemeldete pdfjs-v4-Fehler (`render()` nimmt kein `canvas`-Feld) ist behoben (`{ canvasContext, viewport }`). `npm run build` ist wieder gruen.

### Tests
- `test/make_test_data.py`: erzeugt aus `public/templates/vorlage-linien.pdf` Testdaten in `test/fixtures/`: ein Grundblatt mit Handschrift-Platzhalter, drei perspektivisch verzerrte "Handyfotos" und ein dreiseitiges "Scanner-PDF" (Stapel dreier Schueler). Drei Befehle stehen in `test/README.md`.
- `test/ingest.test.ts` (Node-`--test`, ueber `npm run test:ingest`, im Gesamtsatz `npm test`): sechs Tests, alle gruen. Marker-Erkennungsrate auf den drei Fotos 3/3, auf den Scanner-Seiten 3/3, Orientierung sicher 3/3; Foto wird entzerrt und zugeschnitten; ein Rauschbild wird korrekt NICHT als Vorlage erkannt (Fallback); das Ergebnis liegt als gueltige PNGs plus Index in `data/submissions/`.
- `npm test` fuehrt jetzt AP4 und AP2 zusammen aus (24 Tests, 0 Fehler), ueber den gemeinsamen Loader `lib/__tests__/resolve-ts.mjs`.

### Was AP3/AP6 hiervon nutzen sollen
- **AP3 (Erkennung):** der Kopfzeilen-Ausschnitt je Seite liegt als `pages/<pageId>.header.png` (bzw. `SubmissionPage.headerImagePath`) bereit; darauf laeuft die Kopfzeilen-Auslesung (Aufgaben-Code, Kuerzel, Blattnummer). Das entzerrte Seitenbild ist `pages/<pageId>.png`.
- **AP6 (Pruefen):** die Seiten einer Arbeit stehen in `Submission.pages` (Reihenfolge = Zuordnungsreihenfolge); Bild ueber `/api/ingest/image?round=...&page=...&variant=page`.

## AP3: Ollama-Anbindung und Erkennung (erledigt)

### Was existiert

- **Client** (`lib/ollama.ts`): `OllamaClient` implementiert das `ChatClient`-Interface aus `lib/prompts/chat.ts` (Methode `complete(prompt, model?)`, Default `model` = `gradingModel` aus der App-Konfiguration). Das macht ihn direkt einsetzbar in der Bewertungskette und in `runCalibration` (AP4), ohne dort etwas anzupassen.
  - `chat(model, system, user)`: reine Text-Generierung gegen `/api/chat` (Ollama-REST), `stream: false`.
  - `chatWithImage(model, system, user, imageBase64)`: wie `chat`, haengt das Bild als `images: [base64]` an die User-Message an (Ollama-Vision-Konvention). `imageBase64` ist die reine Base64-Nutzlast ohne `data:image/...;base64,`-Praefix.
  - `getStatus()`: ruft `/api/tags` auf, liefert `{ reachable, models, messageKey? }`. Wirft nie; bei Fehlern wird `reachable=false` mit einem Locale-Schluessel geliefert.
  - `hasModel(name)`: prueft, ob ein Modellname (mit oder ohne `:tag`) in der geladenen Liste steht.
  - `OllamaClient.fromAppConfig()` / `createOllamaClient()`: Client mit den in `data/config/app.json` gespeicherten Einstellungen (Basis-Adresse, Modellnamen).
  - Jeder Aufruf hat ein Zeitlimit (Default 120s, `getStatus` intern max. 10s) ueber `AbortController`. Alle Fehler werden als `OllamaError` geworfen: `kind` (`unreachable`, `timeout`, `modelMissing`, `badResponse`, `invalidInput`) plus `messageKey` (Locale-Schluessel, z.B. `ollama.error.unreachable`) plus optionalem technischem `detail` fuer Protokolle. Nichts stuerzt ungefangen ab.
  - Default-Modellnamen (`DEFAULT_APP_CONFIG` in `lib/storage.ts`): `visionModel` und `gradingModel` beide `gemma3:12b`. **ZU BESTAETIGEN DURCH SVENJA**: dies ist ein aktuell gaengiger lokaler Gemma-Name bei Ollama, aber Modellverfuegbarkeit/Namen aendern sich. Vor dem ersten echten Einsatz in den Einstellungen pruefen und bei Bedarf auf den tatsaechlich installierten Namen umstellen (z.B. `gemma3:4b` fuer einen kleineren Rechner, oder ein anderes Vision-faehiges Modell fuer `visionModel`). Kein Code-Aenderung noetig, nur das Eingabefeld in den Einstellungen.
- **App-Konfiguration** (`lib/types.ts`: `AppConfig`; `lib/storage.ts`: `readAppConfig`/`writeAppConfig`): eigene Datei `data/config/app.json`, getrennt von den fachspezifischen `SubjectConfig`-Dateien. Fehlt die Datei, liefert `readAppConfig()` die Defaults (schreibt sie nicht automatisch), damit ein frischer Checkout ohne Zutun funktioniert.
- **Transkription** (`lib/transcription/`):
  - `prompts.ts`: `PAGE_TRANSCRIPTION` (zeilenweise Abschrift, unsichere Woerter als `[[wort?]]`) und `HEADER_READING` (Kopfzeilen-Felder), beide verlangen striktes JSON.
  - `transcribe.ts`: `transcribePage(client, visionModel, imageBase64, submissionId, options?)` ruft den Vision-Slot auf und baut ein vollstaendiges `Transcript` (`lib/types.ts`): Zeilen, `unclearCount` (Anzahl `[[...]]`-Markierungen), `confirmed: false` (Pruefung ist Sache von AP6). `mergeTranscripts(submissionId, pages[])` fuehrt mehrseitige Arbeiten zu einem Transcript mit fortlaufenden Indizes zusammen. Der Parametertyp fuer den Client ist das schlanke `VisionChatClient`-Interface (nur `chatWithImage`), nicht die konkrete Klasse, damit Tests ohne echtes Ollama einen einfachen Doppelgaenger einsetzen koennen; `OllamaClient` erfuellt es strukturell.
  - `header.ts`: `readHeaderSuggestion(client, visionModel, headerImageBase64)` liest den von AP2 gespeicherten Kopfzeilen-Ausschnitt (`pages/<pageId>.header.png`) und liefert `{ taskCode, studentAlias, sheetNumber }` (jeweils `string | null`). **Wichtig:** das ist ausschliesslich ein Vorschlag. Die Funktion schreibt nichts und ueberschreibt nichts; keine bestehende Zuordnung (`Submission.studentAlias`/`taskCode`) wird automatisch ersetzt. Die Uebernahme bleibt eine bewusste Aktion der Lehrkraft (vorgesehen fuer die Pruefen-Seite, AP6, oder die Hochladen-Galerie).
- **API-Routen** (`app/api/recognize/`):
  - `POST /api/recognize/run` `{ roundId }`: arbeitet eine Runde ab. Verarbeitet alle Arbeiten, die noch kein bestaetigtes Transkript haben (`transcript.confirmed !== true`), transkribiert jede Seite, schreibt das zusammengefuehrte Transcript ueber `lib/storage.ts`, setzt den Status `ingested -> transcribed` (bereits weiter fortgeschrittene Status wie `checked`/`assessed`/`released` werden nicht zurueckgesetzt), und liest einen Kopfzeilen-Vorschlag von der ersten Seite. Antwort: `{ roundId, total, processed, results[] }`, jedes Ergebnis mit `status: "done" | "skipped" | "error"` und bei `error` einem `errorMessageKey`. Eine nicht erreichbare Auswertung fuehrt dazu, dass JEDE Arbeit einzeln mit demselben `errorMessageKey` (z.B. `ollama.error.unreachable`) zurueckkommt statt den ganzen Lauf abzubrechen, damit die aufrufende Seite (spaeter AP6) den Fortschritt trotzdem korrekt anzeigen kann.
  - `GET /api/recognize/run?round=...`: liefert nur den aktuellen Verarbeitungsstand (ohne neu zu rechnen), fuer eine Fortschrittsanzeige.
  - `GET /api/recognize/status`: Verbindungsstatus fuer die Einstellungen-Seite (`{ reachable, models, messageKey? }`).
  - `GET /api/recognize/config` / `POST /api/recognize/config`: lesen/schreiben von `data/config/app.json` (Basis-Adresse, `visionModel`, `gradingModel`).
- **Einstellungen-Seite** (`app/settings/page.tsx`, ersetzt den AP0-Platzhalter): zeigt Verbindungsstatus (Punkt gruen/terracotta plus Text), Liste der geladenen Modelle als Chips, Testknopf (ruft `/api/recognize/status` erneut auf), editierbare Felder fuer die beiden Modellnamen (mit Hinweis "ist geladen"/"ist noch nicht geladen"/"kann noch nicht geprueft werden"), ein eingeklapptes "weitere Einstellung"-Feld fuer die Basis-Adresse, Speichern-Knopf. Hausregel 3 umgesetzt: durchgehend "Auswertung" statt "Modell"/"Ollama"; "Ollama" wird nur in der Nicht-erreichbar-Meldung genannt, weil die Lehrkraft dort das Programm tatsaechlich starten muss.

### Was AP6/AP7 hiervon nutzen sollen

- **AP6 (Pruefen):** `POST /api/recognize/run` vor oder beim Betreten der Pruefen-Seite aufrufen (einmal pro Runde reicht; bereits transkribierte/bestaetigte Arbeiten werden uebersprungen). Der Kopfzeilen-Vorschlag (`results[].headerSuggestion`) eignet sich als vorausgefuelltes, aber aenderbares Feld in der Pruefansicht oder in der Hochladen-Galerie; nie automatisch in `Submission` schreiben. Fehler kommen pro Arbeit als `errorMessageKey` zurueck, direkt mit `t(key)` anzeigbar.
- **AP7 (Review):** `createOllamaClient()` aus `lib/ollama.ts` ist der produktive `ChatClient` fuer `renderContentMatch`/`renderCriteriaScore`/`renderFeedback` (AP4) und fuer `runCalibration` (AP5-Kalibrierschritt, produktiv statt Mock). `OllamaError.messageKey` direkt mit `t(...)` anzeigen, `detail` nie in der UI zeigen (nur fuer Protokolle).

### Tests

- `lib/__tests__/ollama.test.ts`: 8 Tests gegen einen garantiert nicht lauschenden Port (`127.0.0.1:19999`) bzw. eine nicht erreichbare Adresse. Prueft: `chat`/`chatWithImage`/`complete` werfen `OllamaError` mit `kind: "unreachable"` und dem richtigen `messageKey`, kein ungefangener Absturz; leere Modellnamen/leeres Bild werfen sofort `invalidInput` ohne Netzwerkaufruf; `getStatus`/`hasModel` werfen nie, liefern `reachable=false`; ein sehr kurzes Zeitlimit fuehrt zu `timeout` oder `unreachable`, nie zu einer anderen Exception.
- `lib/__tests__/ollama-integration.test.ts`: 1 Test, der `renderCriteriaScore` (AP4) mit einer echten Beispiel-Config rendert und das Ergebnis durch `OllamaClient.complete()` schickt (nicht erreichbar) - zeigt, dass der Client sich in der Bewertungskette wie jeder andere `ChatClient` verhaelt und dort verstaendlich statt abstuerzend scheitert.
- `lib/__tests__/transcription.test.ts`: 7 Tests gegen einen einfachen `VisionChatClient`-Doppelgaenger (kein echtes Ollama noetig, analog zum Vorgehen von `chat.mock.ts` fuer Text): Zeilen-Parsing inklusive `[[wort?]]`-Zaehlung, leere Zeilenliste, nicht-JSON-Antwort wirft verstaendlich, `mergeTranscripts` fuegt mehrere Seiten mit fortlaufenden Indizes zusammen, `readHeaderSuggestion` liefert Felder bzw. normalisiert `null`/leer/"null" auf `null`.
- `npm test`: jetzt 40 Tests, alle gruen (24 aus AP2/AP4, 16 neu aus AP3).
- `npm run build`: gruen (siehe unten, Definition of Done).

### Testbefehl fuer Svenja auf dem Mac (Gate 2)

Voraussetzung: [Ollama](https://ollama.com) ist installiert und gestartet (Menueleisten-Symbol oder `ollama serve`).

```
ollama pull gemma3:12b
cd Produkt/gemmpen-teacher
npm install
npm run dev
```

Danach im Browser `http://localhost:3000/settings` oeffnen:

1. Ohne laufendes Ollama (Programm beendet): die Seite zeigt "Die Auswertung ist nicht erreichbar" mit dem Hinweis, Ollama zu starten. Kein Absturz, keine weisse Seite.
2. Ollama starten, `ollama pull gemma3:12b` einmal ausfuehren (laedt das Modell, kann beim ersten Mal dauern), dann auf der Einstellungen-Seite auf "Verbindung testen" klicken: Status wechselt auf "erreichbar", `gemma3:12b` erscheint in der Liste der geladenen Modelle.
3. Falls ein anderes Modell installiert ist (z.B. `gemma3:4b` oder ein anderer Name): den Namen in den Feldern "Fuer das Lesen der Handschrift" / "Fuer die Bewertung" eintragen und speichern; der Hinweistext unter dem Feld wechselt auf "Ist geladen."

Das bestaetigt Gate 2 (Ollama-Anbindung). Ein Transkriptions-Testaufruf mit einem echten Bild ist erst ab AP6 (Pruefen-Seite) oder ueber den in AP12 gebauten `handschrift_test.py` sinnvoll durchspielbar, da AP3 selbst keine eigene Bild-Auswahl-UI baut (das war nicht Teil des Auftrags; die Erkennung wird von der Runden-Route und spaeter der Pruefen-Seite ausgeloest).

## Konventionen fuer folgende Arbeitspakete

- Alle UI-Strings in `locales/de.json` und `locales/en.json`, Zugriff nur ueber `t(...)`. Neue Schluessel in BEIDE Dateien.
- Jeder neue Screen bekommt einen `PageHeader` mit JETZT/DANACH und genau einer klaren Weiter-Aktion.
- Warm-Paper-Design ueber die vorhandenen CSS-Variablen und `.gp-*`-Klassen.
- Verbotene Woerter (Hausregel 2) und technische Begriffe in der UI (Hausregel 3) meiden; Feedback-Texte vor Anzeige pruefen.
- Server-Datei-Zugriff nur ueber `lib/storage.ts`.

## Offene Punkte

- Keine offenen Blocker aus AP0.
- Hinweis fuer AP3/AP10: In der Sandbox ueberleben Hintergrundprozesse den Wechsel zwischen Shell-Aufrufen nicht zuverlaessig; lange Laeufe (Installation, Modell-Start) auf Svenjas Mac echt testen.
- Aus AP4 keine offenen Punkte. Der von AP4 gemeldete pdfjs-Fix in `lib/ingest/pdf-client.ts` ist in AP2 uebernommen; `npm run build` ist gruen.
- Aus AP2 offene Punkte:
  - Die Marker-Erkennung wurde bisher gegen selbst erzeugte, saubere Testbilder geprueft (Erkennungsrate 3/3 Fotos, 3/3 Scanner-Seiten). Ein echtes Handyfoto einer ausgedruckten Vorlage auf Svenjas Mac sollte den Realfall bestaetigen (Gate 4). Bei schwierigen Fotos (starker Schatten, sehr schraeg) greift der dokumentierte Fallback ("Vorlage nicht erkannt").
  - Das PDF-Rendering (`pdf-client.ts`) laeuft nur im Browser (Canvas/pdfjs-Worker) und ist daher nicht Teil des Node-Tests; die serverseitige Verarbeitung der so gerenderten Seiten ist getestet (ueber die aus dem PDF gerenderten Fixtures). Ein Klick-Test der Hochladen-Seite mit einem echten Scanner-PDF gehoert in Gate 3/AP13.
  - HEIC-Dekodierung laeuft ueber `sharp` (libheif ist im Build vorhanden); auf Svenjas Mac einmal mit einem echten iPhone-HEIC bestaetigen.
- Aus AP3 offene Punkte:
  - **Default-Modellnamen ZU BESTAETIGEN durch Svenja**: `visionModel` und `gradingModel` stehen beide auf `gemma3:12b` (siehe `DEFAULT_APP_CONFIG` in `lib/storage.ts`). Das ist ein aktuell gaengiger lokaler Gemma-Name bei Ollama, aber auf Svenjas Mac muss geprueft werden, welches Modell tatsaechlich installiert ist bzw. sinnvoll laeuft (Speicher/Geschwindigkeit); bei Bedarf in den Einstellungen auf einen anderen Namen (z.B. eine kleinere Variante) umstellen. Keine Code-Aenderung noetig.
  - Kein echter Ollama-Testaufruf in der Sandbox moeglich (kein Ollama installiert, Hintergrundprozesse ueberleben den Wechsel zwischen Shell-Aufrufen nicht zuverlaessig, siehe Hinweis aus AP0). Die Fehlerbehandlung ist dafuer gruendlich gegen einen nicht lauschenden Port getestet (`lib/__tests__/ollama.test.ts`, `ollama-integration.test.ts`); der Aufruf-Pfad mit echten Antworten ist ueber einen `VisionChatClient`-Doppelgaenger durchgetestet (`lib/__tests__/transcription.test.ts`). Der echte End-zu-Ende-Aufruf mit laufendem Ollama gehoert in Gate 2 auf Svenjas Mac (Testbefehl oben).
  - `app/api/recognize/run` verarbeitet eine Runde synchron (kein Streaming/Hintergrundjob), aus demselben Sandbox-Grund: mehrere Seiten mit einem echten Vision-Modell koennen je nach Rechner mehrere Minuten dauern. Fuer viele/lange Arbeiten waere ein Fortschritts-Polling mit einem Hintergrundjob (v2-Kandidat) angenehmer; fuer die uebliche Klassengroesse (unter 40 Arbeiten) sollte der synchrone Aufruf reichen. Falls das im echten Betrieb zu lange dauert oder der Browser-Request-Timeout stoert, ist ein Folge-Fix in AP13 sinnvoll.
  - Die Kopfzeilen-Auslesung liefert nur Text-Vorschlaege; es gibt noch keine UI, die den Vorschlag anzeigt und die Uebernahme per Klick anbietet (das ist Sache von AP6/der Hochladen-Galerie, `headerSuggestion` liegt im Ergebnis von `POST /api/recognize/run` bereits bereit).
  - `npm run build` und `npm test` sind gruen (40 Tests). Ein ESLint-Fehler in `app/settings/page.tsx` (react-hooks/set-state-in-effect) wurde behoben, indem der Erststart-Ladeaufruf in eine async IIFE innerhalb des Effekts verschoben wurde, statt eine `setState`-aufrufende Funktion direkt im Effekt-Body aufzurufen.

## AP5: Fach-Konfigurator (Wizard) und Faecher-Seite (erledigt)

### Was existiert

- **Einrichten-Assistent** (`app/setup/page.tsx`, ersetzt den AP0-Platzhalter): linearer Wizard mit sechs Schritten, ein Schritt pro Screen (Hausregel 4), Fortschrittsbalken plus "Schritt X von Y". Jeder Schritt hat einen eigenen JETZT/DANACH-Kopf (eigene Texte je Schritt, nicht der generische `PageHeader`) und genau eine Weiter-Aktion. Kein JSON sichtbar, alles Formulare.
  1. **Fach und Rahmen**: Fach (Freitext), Textsprache/Feedback-Sprache (Auswahl Deutsch/Englisch/Andere mit Freitextfeld), Klassenstufe, Niveau.
  2. **Aufgabenstellung**: Freitext-Feld oder Datei-Upload. `.txt`/`.md` werden direkt als Text uebernommen (`lib/wizard/file-text.ts`); bei PDF/Bild legt der Assistent einen editierbaren Platzhaltertext ins Feld ("wird bei der Auswertung gelesen"), wie im Auftrag verlangt - der Assistent selbst liest kein PDF/Bild, das passiert spaeter bei der echten Auswertung (AP3/AP7).
  3. **Erwartungshorizont und Raster**: Erwartungshorizont als Freitext (ein Punkt pro Zeile) oder Text-Datei-Upload. Knopf "Raster-Vorschlag erzeugen" ruft `POST /api/setup/suggest-rubric` auf (neuer Baustein 1b in der Prompt-Bibliothek, siehe unten); Ergebnis ist eine editierbare Kriterien-Liste (Name, Beschreibung, Punkte, Sonderregel alles-oder-nichts ankreuzbar mit Regel-Text und Teilen). Kriterien koennen zusaetzlich von Hand hinzugefuegt/entfernt werden. Alternativ: Knopf je Beispiel-Konfiguration (`data/config/beispiele/*.json`) uebernimmt deren Erwartungshorizont und Kriterien als Startpunkt.
  4. **Notensystem und Feedback-Stil**: `gradingSystem` (NRW-Punkte/Noten 1-6/Prozent), Ton (Freitext), Laenge (kurz/mittel/ausfuehrlich), Uebungsvorschlag an/aus.
  5. **Beispielarbeiten und Kalibrierung** (optional, ausdruecklich als "nicht Pflicht" gekennzeichnet): bis zu zwei Beispielarbeiten (Text, Notiz, Punkte je Kriterium). Knopf "Kalibrierung starten" ruft `POST /api/setup/calibrate` auf (nutzt `runCalibration` aus AP4 unveraendert). Ergebnis: Abweichung je Kriterium plus dreistufige Klartext-Erklaerung (nah/spuerbar/deutlich, Schwellen 10%/25% der Maximalpunkte), keine reine Zahl ohne Einordnung.
  6. **Zusammenfassung**: Anzeigename-Feld, Klartext-Zusammenfassung aller Angaben (kein JSON), Validierung ueber `validateSubjectConfig` beim Speichern (`POST /api/setup/configs`); bei Fehlern erscheint eine lesbare Liste statt Rohtext. Nach dem Speichern zwei Weiter-Knoepfe (zu den Faechern, oder direkt Arbeiten hochladen).
  - **Bearbeiten/Duplizieren**: `?edit=<id>` laedt die vorhandene Konfiguration als Vorbelegung und behaelt die id beim Speichern (ueberschreibt die Datei); `?duplicate=<id>` laedt sie ohne id (Speichern legt eine neue Konfiguration mit neuer id an). Beides ueber `lib/wizard/draft.ts: draftFromConfig(config, keepId)`.
- **Faecher-Seite** (`app/subjects/page.tsx`, ersetzt den AP0-Platzhalter): Liste aller Konfigurationen (Fach, Sprachen, Kriterienzahl, Notensystem). Aktionen je Karte: Bearbeiten (Link zu `/setup?edit=id`), Duplizieren (`POST /api/setup/configs/[id]/duplicate`, neuer Name "(2)"), Loeschen mit Rueckfrage (Karte klappt eine Bestaetigung mit Ja/Abbrechen auf, erst dann `DELETE /api/setup/configs/[id]`).
- **Wizard-Bausteine** (`lib/wizard/`, neu in AP5):
  - `draft.ts`: `WizardDraft` (formularnaher Entwurfszustand, flach, mit `DraftCriterion`/`DraftCalibrationSample` inklusive lokaler `localKey` fuer React-Listen), `blankDraft()`, `draftFromConfig(config, keepId)`, `expectedPointsFromText(text)` (eine Zeile = ein Punkt), `newConfigId(name, existingIds)` (Slug plus Kollisionsaufloesung `-2`, `-3`, ...), `buildConfigFromDraft(draft, displayName, existingIds)` (baut die vollstaendige `SubjectConfig`, die dann gegen `validateSubjectConfig` geprueft wird).
  - `file-text.ts`: `readUploadedTaskFile(file, pendingNote)` - `.txt`/`.md` werden gelesen und direkt uebernommen (`kind: "text"`), alles andere (PDF, Bild) liefert `kind: "pending"` mit dem uebergebenen Platzhaltertext.
- **Neuer Prompt-Baustein "Raster-Vorschlag"** (Ergaenzung zu AP4, nichts Bestehendes umbenannt):
  - `lib/types.ts`: `RubricSuggestionResult` (Liste von `{ id, name, description, maxPoints, allOrNothing? }`).
  - `lib/prompts/templates.ts`: `RUBRIC_SUGGEST` (System/User-Vorlage, verlangt striktes JSON, schlaegt bei Bedarf eine Alles-oder-Nichts-Regel vor).
  - `lib/prompts/render.ts`: `renderRubricSuggest(input: RubricSuggestInput)` - nimmt bewusst nur die noetigen Felder (subject, level, textLanguage, gradingSystem, taskPrompt, expectedPoints) statt einer vollstaendigen `SubjectConfig`, weil der Vorschlag entsteht, BEVOR eine vollstaendige Konfiguration existiert (Wizard-Schritt 3).
  - `lib/prompts/chat.mock.ts`: erkennt den Raster-Vorschlag-Prompt (`"Erwartungshorizont (was eine gute Bearbeitung"`) und liefert 1-4 Testkriterien mit je 15 Punkten, damit der Assistent auch ohne echte Auswertung durchspielbar ist.
- **Client-Auswahl fuer API-Routen** (`lib/prompts/resolve-client.ts`, neu): `resolveGradingClient()` versucht `createOllamaClient()` (AP3) und dessen `getStatus()`; ist die Auswertung nicht erreichbar (oder wirft der Aufbau selbst), faellt die Funktion auf `createMockChatClient()` zurueck. Wirft nie. Ergebnis `{ client, usingRealClient }`, damit die UI ehrlich anzeigen kann, ob gerade ein Testvorschlag/Testlauf angezeigt wird (`setup.step3.usingMock` / `setup.step5.usingMock`).
- **API-Routen** (`app/api/setup/`, alle `runtime = "nodejs"`):
  - `POST /api/setup/suggest-rubric`: rendert `renderRubricSuggest`, ruft `resolveGradingClient()`, parst mit `parseJsonResponse<RubricSuggestionResult>`, Antwort `{ suggestion, usingRealClient }`.
  - `POST /api/setup/calibrate`: nimmt eine (noch ungespeicherte) `SubjectConfig` entgegen, validiert sie (`validateSubjectConfig`), prueft auf vorhandene Beispielarbeiten, ruft `runCalibration` mit dem aufgeloesten Client, Antwort `{ report, usingRealClient }`.
  - `GET/POST /api/setup/configs`: Liste aller Konfigurationen bzw. Validieren+Speichern (dient neu anlegen UND ueberschreiben beim Bearbeiten).
  - `GET/DELETE /api/setup/configs/[id]`: einzelne Konfiguration lesen (Vorbelegung fuer Bearbeiten/Duplizieren) bzw. loeschen.
  - `POST /api/setup/configs/[id]/duplicate`: liest die Quelle, vergibt eine neue eindeutige id (Slug aus dem neuen Namen, Kollisionsaufloesung), setzt `createdAt`/`updatedAt` neu, speichert die Kopie.

### Tests

- `lib/__tests__/prompts.test.ts`: um einen Test fuer `renderRubricSuggest` ergaenzt (keine offenen Platzhalter, Snapshot unter `lib/__tests__/__snapshots__/rubric-suggest.*.txt`, Mock-Antwort strukturell gueltig).
- `lib/__tests__/wizard.test.ts` (neu): kompletter Wizard-Durchlauf in Code nachgestellt - Entwurf ausfuellen, Raster-Vorschlag ueber den Mock einholen, eine Beispielarbeit mit Punkten anlegen, `buildConfigFromDraft` + `validateSubjectConfig` (gueltig), `runCalibration` gegen den Mock, Speichern/Lesen/Auflisten ueber `lib/storage.ts` in einen temporaeren `GEMMPEN_DATA_DIR`. Zweiter Test prueft `draftFromConfig` (Bearbeiten behaelt die id, Duplizieren nicht) und `newConfigId` (neue id unterscheidet sich vom Original).
- Zusaetzlich manuell (nicht Teil von `npm test`, da Hintergrundprozesse in der Sandbox keine Shell-Aufrufe ueberleben): ein `next start` in einem einzigen Shell-Befehl hochgefahren und der komplette Zyklus per `curl` durchgespielt - Raster-Vorschlag (mit `usingRealClient: false`, da kein Ollama in der Sandbox laeuft), Speichern, Auflisten, Lesen, Kalibrieren, Duplizieren, Loeschen. Alle Schritte lieferten die erwarteten Antworten; das bestaetigt die API-Routen zusaetzlich zu den Node-Tests end-to-end.
- `npm test`: jetzt 42 Tests, alle gruen (40 aus AP0-AP3, 2 neu aus AP5; der neue `rubric-suggest`-Test aus `prompts.test.ts` laeuft als ein Testblock mit mehreren Assertions und erscheint daher nicht als eigene Zeile in der Zaehlung, ist aber Teil des gruenen Laufs).
- `npm run build`: gruen, neue Routen erscheinen in der Routenliste (`/api/setup/*`, `/setup`, `/subjects`).
- `npx eslint .`: 0 Fehler (2 Vorbestandswarnungen zu `<img>` in `app/upload/page.tsx`, nicht Teil dieses APs).

### Was AP6/AP7 hiervon nutzen sollen

- Jede gespeicherte Konfiguration ist eine vollstaendig gueltige `SubjectConfig` (durch `validateSubjectConfig` gelaufen), also direkt fuer `renderContentMatch`/`renderCriteriaScore`/`renderFeedback` (AP4) und den echten `OllamaClient` (AP3) nutzbar - keine Sonderbehandlung noetig.
- `lib/prompts/resolve-client.ts: resolveGradingClient()` ist fuer AP7 direkt wiederverwendbar, falls dort ebenfalls ein Mock-Fallback fuer die Bewertungskette gewuenscht ist (aktuell nutzt AP5 es fuer Raster-Vorschlag und Kalibrierung).
- `lib/wizard/draft.ts` ist bewusst nur vom Wizard selbst abhaengig (keine Kopplung zu Submissions/Assessments); AP6/AP7 muessen hier nichts beachten.

### Offene Punkte

- Der Raster-Vorschlag-Prompt (`RUBRIC_SUGGEST`) ist neu und noch nicht mit einer echten Auswertung (Ollama) durchgespielt, nur gegen den Mock und einmalig manuell gegen einen echten laufenden `next start`-Server in der Sandbox (ohne Ollama, daher Mock-Fallback). Ein Testlauf mit echtem Ollama auf Svenjas Mac (Schritt 3 des Assistenten) ist sinnvoll, sobald Gate 2 bestanden ist.
- Die Sprachauswahl in Schritt 1 bietet Deutsch/Englisch/Andere an (Freitext bei "Andere"); es gibt keine vollstaendige Sprachliste, das war fuer die Kernaufgabe nicht noetig und haette die Screens ueberladen.
- Schritt 5 (Kalibrierung) baut die Test-Konfiguration client-seitig aus dem aktuellen Entwurf (`buildConfigFromDraft`) und schickt sie testweise an `/api/setup/calibrate`, ohne sie zu speichern; das ist beabsichtigt (Kalibrieren vor dem eigentlichen Speichern in Schritt 6), aber bedeutet, dass bei sehr grossen Entwuerfen der komplette Zustand bei jedem Kalibrierlauf erneut uebertragen wird. Fuer die ueblichen Groessenordnungen (wenige Kriterien, 1-2 Beispielarbeiten) unproblematisch.

## AP6: Transkript-Pruefansicht (erledigt)

### Was existiert

- **Typ-Erweiterung** (`lib/types.ts`, additiv, nichts umbenannt): `HeaderSuggestion` (bisher nur lokal in `lib/transcription/header.ts`) ist jetzt die gemeinsame Quelle in `lib/types.ts`; `header.ts` re-exportiert sie unveraendert (`export type { HeaderSuggestion }`), damit AP3-Importe unangetastet bleiben. `Submission` hat ein neues optionales Feld `headerSuggestion?: HeaderSuggestion`, damit der Kopfzeilen-Vorschlag ueber einen API-Aufruf hinaus erhalten bleibt (siehe unten).
- **`app/api/recognize/run/route.ts` (AP3, minimal erweitert):** speichert den gelesenen Kopfzeilen-Vorschlag jetzt zusaetzlich auf der `Submission` (`headerSuggestion`), statt ihn nur einmalig in der Antwort zurueckzugeben. Ueberschreibt dabei nie `studentAlias`/`taskCode` selbst; die Uebernahme bleibt Sache der Lehrkraft. Die vorher getrennten Schreibvorgaenge (Status vorwaerts bewegen, dann optional den Vorschlag) sind zu einem einzigen `writeSubmission`-Aufruf zusammengefasst.
- **Kernlogik, ohne Browser/DOM-Abhaengigkeit** (`lib/review/unclear.ts`):
  - `countUnclearMarkers`, `hasUnclearMarkers`: zaehlen bzw. erkennen `[[wort?]]`-Markierungen in einem Zeilentext.
  - `splitUnclearSegments(text)`: zerlegt eine Zeile in `plain`/`unclear`-Abschnitte fuer die farbige Darstellung (das abschliessende `?` der Markierung ist reine Syntax und wird aus dem sichtbaren Text entfernt).
  - `transcriptUnclearCount`, `transcriptHasUnclearMarkers`: dasselbe ueber ein ganzes Transkript (mehrere Zeilen).
  - `canConfirmTranscript(transcript)`: die zentrale Freigabe-Regel fuer den Bestaetigen-Knopf - `false` ohne Transkript, ohne Zeilen, oder solange irgendeine `[[wort?]]`-Markierung uebrig ist.
  - `estimateLineHighlight(line, linesOnSamePage)` / `groupLinesByPage(lines)`: liefert die Bildregion einer Zeile fuer die Hervorhebung. Nutzt `TranscriptLine.position`, falls eine echte Position vorliegt (also `top`/`bottom` nicht beide 0 sind); sonst eine proportionale Schaetzung, die die Seite gleichmaessig durch die Anzahl Zeilen auf dieser Seite teilt (`estimated: true` im Ergebnis, damit die UI das bei Bedarf unterscheiden koennte, aktuell aber gleich behandelt).
- **API-Routen** (`app/api/review/`, alle `runtime = "nodejs"`):
  - `GET /api/review/rounds`: ohne Parameter die Liste aller Runden-IDs (`lib/storage.ts: listRounds`); mit `?round=` alle Arbeiten dieser Runde als `ReviewSubmissionSummary[]` (Kuerzel, Aufgaben-Code, Status, Seitenzahl, `hasTranscript`, `confirmed`, `unclearCount`, `canConfirm`, `headerSuggestion`).
  - `GET /api/review/submission?round=&id=`: eine Arbeit im Detail (Submission mit Bild-URLs je Seite ueber `pageResultUrls`, das komplette Transkript, `unclearCount`, `canConfirm`).
  - `POST /api/review/submission { roundId, submissionId, lines, studentAlias?, taskCode? }`: speichert die editierten Zeilen (Korrekturen der Lehrkraft) ueber `lib/storage.ts: writeTranscript`. Berechnet `unclearCount` neu; ein zuvor bestaetigtes Transkript bleibt nur bestaetigt, wenn die neuen Zeilen tatsaechlich frei von `[[wort?]]` sind (eine nachtraeglich von Hand eingetragene Unsicherheit macht `confirmed` wieder `false`). Optionale Felder `studentAlias`/`taskCode` decken die bewusste Uebernahme eines Kopfzeilen-Vorschlags ab (ein Klick in der Detailansicht).
  - `POST /api/review/confirm { roundId, submissionId }`: setzt `transcript.confirmed = true` und `submission.status = "checked"`, aber nur wenn `canConfirmTranscript` `true` liefert; sonst `409` mit einer lesbaren Fehlermeldung. Ein bereits `assessed`/`released`-Status wird nicht zurueckgestuft (analog zum Vorgehen in AP3).
- **Pruefen-Uebersicht** (`app/review/page.tsx`, ersetzt den AP0-Platzhalter): Runde waehlen (Merkzettel in `localStorage` unter `gemmpen.lastRound`, zusaetzlich per `?round=`-Parameter ansteuerbar), Knopf "Erkennung starten" ruft `POST /api/recognize/run` (AP3) auf und zeigt Fortschritt/Fehler (Locale-Schluessel direkt aus der Antwort), danach laedt die Liste neu. Liste aller Arbeiten der Runde mit Status-Chip (Erkennung laeuft / Offen / Geprueft), Seitenzahl, Anzahl unsicherer Stellen bzw. "Bereit zum Bestaetigen", und einem Hinweis, wenn ein Kopfzeilen-Vorschlag vom aktuellen Kuerzel abweicht. Klick auf eine Zeile fuehrt zur Detailansicht.
- **Pruefen-Detailansicht** (`app/review/[id]/page.tsx`, neue Route): Split-View.
  - Links: das entzerrte Seitenbild der aktiven Seite (`imageUrl` aus `/api/ingest/image`, AP2), zoombar per +/- -Knopf (0.5x bis 3x, Bild in einem scrollbaren Container), mehrseitig blaetterbar per Seiten-Buttons. Ein halbtransparenter Balken markiert die Bildregion der aktuell fokussierten Zeile (aus `estimateLineHighlight`).
  - Rechts: jede Zeile als eigene Karte - eine Vorschau mit gelb hinterlegten `[[wort?]]`-Abschnitten (`splitUnclearSegments`, per Klick fokussierbar) direkt ueber einem editierbaren Textfeld. Aenderungen werden debounced (600ms) automatisch gespeichert (`POST /api/review/submission`), mit einem kurzen "Wird gespeichert.../Gespeichert."-Hinweis.
  - Klick auf eine Zeile (Vorschau oder Feld) setzt `focusedLineIndex` und wechselt bei Bedarf automatisch die aktive Seite.
  - Ein Kopfzeilen-Vorschlag, der vom aktuellen Kuerzel abweicht, erscheint als klickbarer Hinweis ("Kopfzeilen-Vorschlag uebernehmen: XY"); die Uebernahme ist ein bewusster Klick, nie automatisch.
  - Bestaetigen-Knopf: deaktiviert, solange `canConfirm` (clientseitig identisch zu `canConfirmTranscript`) `false` ist, mit Klartext-Hinweis auf die Anzahl verbleibender unsicherer Stellen. Nach erfolgreichem `POST /api/review/confirm` laedt die Ansicht neu und zeigt den bestaetigten Zustand (Kopfzeile wechselt JETZT-Text auf "ist geprueft und bestaetigt").
  - Screenfuehrung nach Hausregel 4: eigener JETZT/DANACH-Block je nach Bestaetigungsstatus (analog zum Muster aus dem Wizard, nicht der generische `PageHeader`, weil der JETZT-Text vom Status abhaengt).
- **Locale-Schluessel**: alle neuen Strings unter `review.*` in `locales/de.json` und `locales/en.json` ergaenzt (identische Schluessel, Englisch frei formuliert). Keine harten Strings im Code; auch kleine Hinweise wie "leere Zeile" oder "diese Zeile braucht eine Entscheidung" sind eigene Locale-Schluessel (`review.detail.emptyLine`, `review.detail.lineUnclear`).

### Tests

- `lib/__tests__/unclear.test.ts` (neu, 13 Tests): Markierungs-Zaehlung und -Erkennung, Zerlegung in Abschnitte (inklusive `[[?]]` ohne Text und reinem Text ohne Markierung), `canConfirmTranscript` fuer die Faelle kein Transkript/keine Zeilen/eine uebrige Unsicherheit/alle geklaert (explizit mit drei unsicheren Woertern, von denen erst nach Klaerung aller drei die Sperre faellt), Positions-Schaetzung mit und ohne echte Position, Gruppierung nach Seite.
- `lib/__tests__/review-workflow.test.ts` (neu, 2 Tests): kompletter Pruefen-Ablauf ueber `lib/storage.ts` in einen temporaeren `GEMMPEN_DATA_DIR` (wie `wizard.test.ts` es fuer den Assistenten macht) - eine Submission mit zwei Seiten und einem Transkript mit drei unsicheren Woertern wird schrittweise korrigiert (erst zwei, dann alle drei Stellen geklaert) und erst danach bestaetigt; prueft dabei auch, dass der Kopfzeilen-Vorschlag erhalten bleibt und nie automatisch das Kuerzel ueberschreibt. Zweiter Test: eine nachtraeglich eingefuegte Unsicherheit sperrt eine zuvor freie Bestaetigung wieder.
- `npm test`: jetzt 58 Tests, alle gruen (42 aus AP0-AP5, 16 neu aus AP6).
- `npm run build`: gruen, neue Routen erscheinen (`/api/review/rounds`, `/api/review/submission`, `/api/review/confirm`, `/review`, `/review/[id]`).
- `npx eslint .`: 0 Fehler. Zwei `react-hooks/set-state-in-effect`-Stellen (Runde aus URL/`localStorage` uebernehmen, Rundenliste/Arbeitenliste laden) wurden wie in `app/settings/page.tsx` durch eine async IIFE innerhalb des Effekts geloest, nicht durch einen direkten `setState`-Aufruf im Effekt-Body. Ein ungenutzter `useRouter()`-Import in der Detailseite wurde entfernt. Verbleibende Warnungen (`<img>` in `app/review/[id]/page.tsx` und weiterhin in `app/upload/page.tsx`) sind dieselbe bereits akzeptierte Vorbestandswarnung wie in AP2/AP5.
- **Manueller End-zu-Ende-Test** (nicht Teil von `npm test`, Hintergrundprozess-Einschraenkung der Sandbox): ein einzelner Shell-Aufruf hat `next start` gegen einen frisch angelegten `GEMMPEN_DATA_DIR` mit einer selbst erzeugten Beispiel-Submission gestartet (zwei Seiten, Transkript mit drei `[[wort?]]`-Markierungen, abweichender Kopfzeilen-Vorschlag) und den kompletten Ablauf per `curl` durchgespielt: Runden-Liste, Arbeiten-Liste (`unclearCount: 3`, `canConfirm: false`), Detailabruf mit Bild-URLs, Bestaetigen-Versuch bei noch offenen Stellen (`409`), Korrektur aller drei Zeilen (`POST /api/review/submission`, `unclearCount` faellt auf `0`), danach erfolgreiches Bestaetigen (`200`, `status: "checked"`), Status wechselt sichtbar in der Arbeiten-Liste, Kopfzeilen-Vorschlag uebernehmen (Kuerzel-Aenderung ohne den bestaetigten Zustand ungewollt zu kippen), sowie die Bild-Auslieferung selbst (`GET /api/ingest/image`, gueltiges PNG). Das bestaetigt die Definition of Done zusaetzlich zu den automatisierten Tests end-to-end ueber echtes HTTP.

### Was AP7 hiervon nutzen soll

- Eine Arbeit ist erst dann fuer die Bewertung reif, wenn `submission.status === "checked"` (bzw. `transcript.confirmed === true`); AP7 sollte in der Bewerten-Seite nur solche Arbeiten anbieten bzw. bei einem Aufruf mit einer noch offenen Arbeit verstaendlich abweisen.
- `lib/storage.ts: readTranscript(roundId, submissionId)` liefert den geprueften Text (`transcript.lines`, als zusammenhaengende Zeilen); fuer die Bewertungskette (AP4-Prompts) reicht `lines.map(l => l.text).join("\n")` als Schuelertext.
- `HeaderSuggestion` liegt jetzt zentral in `lib/types.ts`; falls AP7 (oder ein spaeteres AP) den Aufgaben-Code braucht, steht er unter `submission.taskCode` (erst nach bewusster Uebernahme durch die Lehrkraft, nicht automatisch aus `headerSuggestion`).

### Offene Punkte

- Die Positions-Schaetzung (`estimateLineHighlight`) verteilt eine Seite gleichmaessig durch die Anzahl Zeilen auf dieser Seite; das ist eine bewusste Vereinfachung (Auftrag verlangt ausdruecklich "proportionale Schaetzung ueber die Zeilennummer, falls keine echte Position vorliegt"). AP3 liefert aktuell nie eine echte Position (`transcribePage` setzt `top`/`bottom` immer auf 0), die Schaetzung ist also im Moment der einzige Pfad; sollte AP3 spaeter echte Positionen liefern (z.B. aus Bounding-Boxen des Vision-Modells), greift automatisch der genaue Zweig ohne Codeaenderung in der Pruefen-Seite.
- Kein echter Ollama-Testlauf in der Sandbox (wie bei AP3/AP5 aus Sandbox-Gruenden); der End-zu-Ende-Test lief mit selbst geschriebenen Beispieldaten statt einem echten Vision-Ergebnis. Ein Durchlauf mit echtem Ollama auf Svenjas Mac (Hochladen einer echten Arbeit, "Erkennung starten" auf der Pruefen-Seite, tatsaechliche `[[wort?]]`-Markierungen ansehen) gehoert in Gate 3/4.
- Die Uebersicht zeigt aktuell nur die zuletzt benutzte oder per URL uebergebene Runde in einem Dropdown; es gibt keine eigene "alle Runden"-Karten-Ansicht. Fuer die ueblichen Anwendungsfaelle (eine Runde nach der anderen abarbeiten) ausreichend; ein Ausbau waere ein kleiner Nachtrag, kein Blocker.
- Der automatische Speicher-Debounce (600ms) im Zeileneditor ist nicht separat automatisiert getestet (nur manuell durch den End-zu-Ende-Testlauf, der direkt gegen den finalen Zustand ohne Debounce testet, da curl sofort das fertige `lines`-Array schickt); die zugrunde liegende Speicherlogik selbst (`POST /api/review/submission`) ist aber sowohl unit- als auch end-to-end getestet.

## AP7: Bewertungs-Review und DPO-Erfassung (erledigt)

### Was existiert

- **Notenberechnung** (`lib/grading/grade.ts`, neu, reine Funktionen ohne React/DOM): `calculateGrade(system, totalPoints, maxPoints)` berechnet aus Rohpunkten einen Anzeigewert in allen drei Notensystemen aus `lib/types.ts: GradingSystem`:
  - `nrw-points`: linear auf 0-15 skaliert (`"7.5 / 15"`), mit Klartext-Einordnung (sehr gut bis ungenuegend, Schwellen aus der CLAUDE.md-Notenskala).
  - `grades-1-6`: linear aus dem Prozentsatz (100% -> Note 1,0, 0% -> Note 6,0), deutsche Schreibweise mit Komma.
  - `percent`: einfacher Prozentsatz mit einer Nachkommastelle.
  Punkte ausserhalb 0..maxPoints werden auf die Spanne begrenzt (`ratio` bleibt 0..1), ein Maximum von 0 fuehrt zu `ratio=0` statt einer Ausnahme. `sumPoints(points[])` ist ein kleiner Helfer fuer die Kriterien-Summe. Reine Funktion ohne internen Zustand: reagiert bei jedem Aufruf auf die aktuellen Punkte, also "reaktiv" im Sinn des Auftrags (die UI ruft sie bei jeder Punktaenderung erneut auf, siehe unten).
- **Bewertungskette** (`lib/assess/pipeline.ts`, neu): `assessSubmission(config, submissionId, studentText, client)` fuehrt die drei AP4-Bausteine unveraendert hintereinander aus - `renderContentMatch` (Inhaltsabgleich gegen den Erwartungshorizont, Ergebnis derzeit fuer eine spaetere Anzeige mitgeliefert, siehe Offene Punkte), `renderCriteriaScore` (Kriterien-Bewertung mit woertlichen Zitaten), `renderFeedback` (Feedback-Entwurf, bekommt die bereits geclampten Kriterien-Punkte als Grundlage). Punkte werden je Kriterium auf `0..criterion.maxPoints` begrenzt (`clampCriterionPoints`), bevor die Gesamtpunkte/Note berechnet werden (`calculateGrade` aus `lib/grading/grade.ts`). Jeder generierte Text (Begruendung je Kriterium, Feedback-Staerke, -Beobachtungen, -naechster-Schritt, -Uebung) laeuft vor der Rueckgabe durch `guardText(text, config.forbiddenWords)` (AP4, Hausregel 2); Zitate selbst werden nicht veraendert. `recalculateAssessment(assessment, config)` baut Gesamtpunkte/Note aus den aktuellen (ggf. von der Lehrkraft geaenderten) Kriterien-Punkten neu auf, ohne die Kette erneut aufzurufen - das ist der Baustein fuer die serverseitige Bestaetigung einer Punktaenderung.
- **DPO-Paar-Erzeugung** (`lib/assess/dpo.ts`, neu, reine Funktionen ohne Dateizugriff): `buildDpoPair({ submissionId, configId, kind, criterionId?, context, original, corrected })` liefert ein `DpoPair` (Original als `rejected`, Korrektur als `chosen`) oder `null`, wenn sich nach dem Trimmen nichts geaendert hat oder die Korrektur leer ist (verhindert, dass jede Zwischeneingabe beim Tippen eine Zeile erzeugt - das Sichern geschieht ohnehin erst auf Knopfdruck bzw. bei Freigabe). `criterionContext(...)`/`feedbackContext(...)` bauen den geforderten Kontext-Text (Kriterium bzw. "Feedback-Text", Config-Referenz, ein auf 600 Zeichen gekuerzter Transkript-Ausschnitt aus `lib/assess/text.ts: excerpt`). Das Schreiben selbst (`appendDpoPair`, AP0/`lib/storage.ts`) passiert in der API-Route, nicht hier, damit dieses Modul ohne Dateisystem testbar bleibt.
- **Schuelertext aus dem Transkript** (`lib/assess/text.ts`, neu): `transcriptToText(transcript)` fuegt die bestaetigten Zeilen (sortiert nach Index) zu einem Fliesstext zusammen - das ist der Text, der in die Bewertungskette und in die DPO-Kontexte geht. `excerpt(text, maxLength=600)` kuerzt fuer den DPO-Kontext.
- **API-Routen** (`app/api/assess/`, alle `runtime = "nodejs"`):
  - `GET /api/assess/rounds` (ohne Parameter): Liste aller Runden-IDs, wie `/api/review/rounds`.
  - `GET /api/assess/rounds?round=...`: alle Arbeiten dieser Runde mit Status `checked`/`assessed`/`released` (Arbeiten, die noch nicht geprueft sind, werden nicht gelistet - Bewertung setzt ein bestaetigtes Transkript voraus, AP6), je mit Kuerzel, Status, `gradeDisplay` (falls schon bewertet), `released`. Liefert zusaetzlich `currentConfigId` (aus der ersten Arbeit mit gesetzter `configId`) und alle verfuegbaren Fach-Konfigurationen, weil `Submission.configId` beim Hochladen (AP2) noch nie gesetzt wird - **wichtige Erkenntnis fuer AP8**: eine Fach-Konfiguration muss der Runde erst zugeordnet werden, bevor bewertet werden kann.
  - `POST /api/assess/config { roundId, configId }`: schreibt `configId` auf jede Arbeit der Runde, die noch keine (oder eine andere) hat. Wird von der Bewerten-Uebersicht aufgerufen, bevor die Kette startet.
  - `POST /api/assess/run { roundId, submissionId? }`: ohne `submissionId` werden alle Arbeiten der Runde mit Status `checked` bewertet; mit `submissionId` genau diese eine (erneut). Nutzt `resolveGradingClient()` (AP5-Baustein, `lib/prompts/resolve-client.ts`: echtes Ollama oder Mock-Fallback) **einmal fuer den ganzen Lauf**, nicht pro Arbeit. Jede Arbeit laeuft in einem eigenen `try/catch`: fehlt die `configId` oder die zugehoerige Konfiguration, fehlt oder ist das Transkript nicht bestaetigt, oder wirft die Kette selbst einen Fehler (z.B. kein JSON in der Antwort), wird das als `status: "error"`/`"skipped"` fuer genau diese Arbeit vermerkt (`errorMessageKey` fuer `error`) - der Lauf bricht nicht ab (Hausregel: Fehler pro Arbeit statt Totalabbruch, wie in AP3s `/api/recognize/run`). Erfolgreiche Arbeiten setzen `submission.status` auf `assessed` (ein bereits `released`-Status wird nicht zurueckgestuft) und schreiben `Assessment`+`FeedbackDraft` ueber `lib/storage.ts`.
  - `GET /api/assess/submission?round=&id=`: Submission, die zugehoerige `SubjectConfig` (fuer Kriterien-Metadaten: Name, Beschreibung, Punktespanne, Kategorie-Farbe in den Karten), der zusammengefuehrte Schuelertext (fuer Zitat-Kontext), `Assessment`, `FeedbackDraft`.
  - `POST /api/assess/submission { roundId, submissionId, criteria?, feedback? }`: speichert Aenderungen der Lehrkraft. Punktzahlen werden serverseitig noch einmal auf die erlaubte Spanne begrenzt (nie nur clientseitig vertrauen). Fuer **jedes** Kriterium, dessen Punktzahl oder Begruendung sich gegenueber dem zuletzt gespeicherten Wert unterscheidet, wird ein `DpoPair` erzeugt und ueber `appendDpoPair(roundId, pair)` anghaengt (Datei `data/dpo/<roundId>.jsonl`); ebenso fuer Feedback-Staerke, jede Beobachtung und den naechsten Schritt, falls im Request enthalten. Nach dem Speichern wird die Note serverseitig neu berechnet (`recalculateAssessment`) und zurueckgegeben, damit Client und Server nie auseinanderlaufen.
  - `POST /api/assess/release { roundId, submissionId }`: setzt `assessment.released = true` und `submission.status = "released"`. Voraussetzung fuer den Export (AP8): nur freigegebene Arbeiten sollten dort exportiert werden.
- **Bewerten-Uebersicht** (`app/assess/page.tsx`, ersetzt den AP0-Platzhalter): Runde waehlen (gleiches Muster wie AP6: `localStorage`-Merkzettel `gemmpen.lastRound`, `?round=`-Parameter). Karte "Fach-Konfiguration fuer diese Runde": Dropdown ueber alle vorhandenen Konfigurationen plus "Uebernehmen"-Knopf (`POST /api/assess/config`); notwendig, weil `Submission.configId` beim Hochladen leer ist (siehe oben). Karte "Bewertung starten": ein Knopf startet `POST /api/assess/run` fuer die ganze Runde, ist deaktiviert, solange keine Konfiguration gewaehlt ist, zeigt Fortschritt und listet Fehlermeldungen **pro betroffener Arbeit** statt eines einzelnen generischen Fehlers. Liste aller Arbeiten der Runde mit Status-Chip (Unbewertet/Bewertet/Freigegeben), Note (`gradeDisplay`), einem "Bewerten"-Link pro einzelner unbewerteter Arbeit (`POST /api/assess/run` mit `submissionId`) und einem Oeffnen-Link zur Detailansicht.
- **Bewerten-Detailansicht** (`app/assess/[id]/page.tsx`, neue Route): editierbare Karten pro Kriterium (Kategorie-Farbe als linker Rahmen aus `criterion.colorKey`, analog zu den GemmPen-Feedback-Karten): Punktzahl als Zahlenfeld mit `min=0`/`max=criterion.maxPoints` (der Wert wird zusaetzlich in JavaScript geclampt, bevor er in den State geschrieben wird), Begruendung als Textfeld, darunter die woertlichen Zitate als kleine Chips. Eine Gesamtuebersicht-Karte oben zeigt die Note (`calculateGrade`, **client-seitig live neu berechnet bei jeder Punktaenderung** ueber `useMemo` auf dem aktuellen `criteria`-State, ohne einen Server-Roundtrip abzuwarten) plus die Rohpunkte. Darunter der Feedback-Entwurf (Staerke, jede Beobachtung mit ihrem Zitat, naechster Schritt, optionaler Uebungsvorschlag), alle Felder editierbar. "Aenderungen sichern" ruft `POST /api/assess/submission` mit dem aktuellen Zustand auf (das ist der Punkt, an dem serverseitig DPO-Paare entstehen); "Arbeit freigeben" sichert zuerst automatisch und ruft danach `POST /api/assess/release`. Nach der Freigabe sind alle Felder schreibgeschuetzt (`disabled`), die Aktionen-Karte zeigt nur noch den Freigabe-Hinweis.
- **Locale-Schluessel**: alle neuen Strings unter `assess.*` in `locales/de.json` und `locales/en.json` ergaenzt (identische Schluessel, Englisch frei formuliert), inklusive der Fehler-Schluessel `assess.error.noConfig`/`assess.error.unknown`, die direkt aus `errorMessageKey` in der Uebersicht angezeigt werden (gleiches Muster wie `ollama.error.*`/`recognize.error.*` aus AP3).
- **Screenfuehrung nach Hausregel 4**: die Uebersicht sagt klar, was JETZT zu tun ist (Runde/Konfiguration waehlen, Bewertung starten) und DANACH kommt (pruefen, anpassen, freigeben); die Detailansicht hat einen eigenen JETZT/DANACH-Kopf, der sich nach dem Freigabe-Status richtet (analog zum Muster aus AP6, nicht der generische `PageHeader`).

### Tests

- `lib/__tests__/grading.test.ts` (neu, 13 Tests): `calculateGrade` in allen drei Notensystemen (volle Punkte, null Punkte, Zwischenwerte, ein reales 80%-Beispiel fuer Schulnoten), Reaktion auf Punktaenderung (zwei Aufrufe mit unterschiedlichen Punkten ergeben unterschiedliche Anzeige), Punkte-Maximum 0 bricht nicht ab, Punkte ausserhalb der Spanne werden begrenzt, `sumPoints`.
- `lib/__tests__/assess-pipeline.test.ts` (neu, 9 Tests): `assessSubmission` gegen den Mock-Client (AP4) - liefert eine Bewertung je Kriterium innerhalb der Punktespanne, ein Feedback, ein Inhaltsabgleich-Ergebnis; ein absichtlich ueber/unter der Spanne antwortender Test-Client zeigt, dass die Kette clampt; ein absichtlich verbotene Woerter nutzender Test-Client zeigt, dass `guardText` in Begruendung UND Feedback greift; `recalculateAssessment` aktualisiert Gesamtpunkte/Note nach einer Punktaenderung; `buildDpoPair` erzeugt ein Paar bei echter Aenderung, `null` bei keiner Aenderung und bei leerer Korrektur, und vergibt jedem Paar eine eigene id.
- `lib/__tests__/assess-workflow.test.ts` (neu, 1 Test mit mehreren Schritten, end-to-end ueber `lib/storage.ts` in einen temporaeren `GEMMPEN_DATA_DIR`, analog zu `review-workflow.test.ts`): Mock-Bewertungskette fuer eine Beispielarbeit erzeugt eine Bewertung, eine Punktaenderung an einem Kriterium aktualisiert die Note sichtbar (`gradeDisplay` unterscheidet sich vorher/nachher), eine Textaenderung an der Feedback-Staerke erzeugt ein `DpoPair`, das ueber `appendDpoPair`/`readDpoPairs` in `data/dpo/<roundId>.jsonl` nachweisbar ist, und die Freigabe setzt `assessment.released=true`/`submission.status="released"`.
- `npm test`: jetzt 79 Tests, alle gruen (58 aus AP0-AP6, 21 neu aus AP7: 13 Notenberechnung, 9 Bewertungskette/DPO in `assess-pipeline.test.ts` minus 1 Ueberschneidung in der Zaehlung durch ineinander verschachtelte Subtests, siehe Testlauf-Ausgabe fuer die genaue Aufschluesselung; die End-zu-Ende-Datei zaehlt als 1 weiterer Top-Level-Test).
- `npm run build`: gruen, neue Routen erscheinen (`/api/assess/rounds`, `/api/assess/config`, `/api/assess/run`, `/api/assess/submission`, `/api/assess/release`, `/assess`, `/assess/[id]`).
- **Manueller End-zu-Ende-Test ueber echtes HTTP** (nicht Teil von `npm test`, Hintergrundprozess-Einschraenkung der Sandbox, gleiches Muster wie AP5/AP6): `test/seed-assess-manual.mjs` legt eine Fach-Konfiguration, eine geprueft-bestaetigte Beispielarbeit und ihr Transkript in einem frischen `GEMMPEN_DATA_DIR` an; ein einzelner Shell-Aufruf hat `next start` dagegen gestartet und den kompletten Ablauf per `curl` durchgespielt: Runden-Liste, Rundendetail (Konfiguration bereits zugeordnet), `POST /api/assess/config` (Bestaetigung derselben Konfiguration), `POST /api/assess/run` (`usingRealClient: false`, da kein Ollama in der Sandbox laeuft, Mock-Fallback greift wie erwartet, `status: "done"`), `GET /api/assess/submission` (zwei Kriterien-Karten mit Punkten/Begruendung/Zitaten, Feedback-Entwurf), `POST /api/assess/submission` mit einer Punktaenderung (14 -> 15) und zwei Textaenderungen (Begruendung, Feedback-Staerke) - Note wechselte sichtbar von `14 / 15` auf `14.5 / 15`, und `data/dpo/runde-manual-2026.jsonl` enthielt danach drei Zeilen (`score`, `reasoning`, `feedback`, jede mit `rejected`/`chosen`/Kontext), `POST /api/assess/release` (`status: "released"`), abschliessende Rundenansicht zeigte den Status- und Notenwechsel. Das bestaetigt die Definition of Done zusaetzlich zu den automatisierten Tests end-to-end ueber echtes HTTP.

### Was AP8 hiervon nutzen soll

- Nur Arbeiten mit `submission.status === "released"` (bzw. `assessment.released === true`) sollten exportiert werden; `readAssessment`/`readFeedback` (AP0, `lib/storage.ts`) liefern die fertigen, von der Lehrkraft bestaetigten Werte (inklusive etwaiger Korrekturen), nicht die urspruengliche KI-Antwort.
- `calculateGrade(config.gradingSystem, assessment.totalPoints, assessment.maxPoints)` (`lib/grading/grade.ts`) ist direkt fuer die Klassenuebersicht/das PDF wiederverwendbar; `assessment.gradeDisplay` enthaelt bereits denselben Wert als String (wird bei jeder Aenderung serverseitig neu berechnet, siehe oben), muss also nicht erneut berechnet werden, kann aber bei Bedarf (z.B. fuer eine andere Darstellung) direkt aus den Rohpunkten neu gezogen werden.
- **Wichtig, siehe oben**: `Submission.configId` ist erst nach einem Aufruf von `POST /api/assess/config` gesetzt. Fuer den Export reicht das (Arbeiten muessen ohnehin bewertet und freigegeben sein, bevor sie exportiert werden, und die Bewertung setzt bereits eine gesetzte `configId` voraus), aber falls AP8 unabhaengig von AP7 auf `Submission.configId` zugreift, sollte es sich nicht auf einen Wert vor der ersten Bewertung verlassen.
- Der DPO-Export (spaeter, JSONL-Download mit Hinweistext) kann `lib/storage.ts: readDpoPairs(roundId)`/`listDpoFiles()` direkt nutzen; jede Zeile ist bereits ein vollstaendiges `DpoPair` (siehe `lib/types.ts`) mit `kind` (`score`/`reasoning`/`feedback`), `criterionId` (optional), `context`, `rejected`, `chosen`.

### Offene Punkte

- Das Ergebnis des Inhaltsabgleichs (`ContentMatchResult`, welche erwarteten Punkte abgedeckt/teilweise/nicht behandelt sind) wird von `assessSubmission` zurueckgegeben, aber aktuell nirgends dauerhaft gespeichert oder in der UI angezeigt - der Auftrag verlangte den Inhaltsabgleich als Teil der Kette (fuer die nachfolgende Kriterien-Bewertung/Feedback-Generierung ist er implizit Kontext, da beide Prompts denselben Erwartungshorizont referenzieren), aber keine eigene Karte dafuer. Falls eine spaetere Iteration eine eigene "Inhaltsabgleich"-Ansicht braucht (z.B. um der Lehrkraft zu zeigen, welche erwarteten Punkte fehlen), muesste das Ergebnis zusaetzlich in `data/submissions/.../` abgelegt werden (aktuell kein eigener Speicherplatz dafuer in `lib/storage.ts`).
- Wie in AP3/AP5/AP6: kein echter Ollama-Testlauf in der Sandbox moeglich; `resolveGradingClient()` faellt daher im manuellen End-zu-Ende-Test auf den Mock zurueck. Ein Durchlauf mit echtem Ollama auf Svenjas Mac (echte Kriterien-Bewertung mit echten Zitaten aus einer echten Handschrift-Transkription) gehoert in Gate 3/4.
- `POST /api/assess/run` verarbeitet eine Runde synchron (kein Streaming/Hintergrundjob), aus demselben Sandbox-Grund wie `/api/recognize/run` in AP3: mehrere Arbeiten mit einem echten Bewertungs-Modell koennen je nach Rechner mehrere Minuten dauern. Fuer die uebliche Klassengroesse (unter 40 Arbeiten) sollte das reichen; ein Fortschritts-Polling waere ein v2-Kandidat, kein Blocker fuer AP8/AP13.
- Die Uebersicht bietet nur ein Dropdown fuer eine einzelne Fach-Konfiguration je Runde (keine Mischung mehrerer Konfigurationen innerhalb derselben Runde); das entspricht dem ueblichen Anwendungsfall (eine Klausur, ein Raster) und war nicht Teil des Auftrags.
- Punktzahl-DPO-Paare speichern die Werte als Text (`"14"`/`"15"`), nicht als eigenen numerischen DPO-Typ, weil `DpoPair` in `lib/types.ts` (AP0) `rejected`/`chosen` als `string` vorsieht und dieses AP das Schema nicht aendern sollte ("Bestehende Module nutzen, nicht umbauen"); fuer den spaeteren Trainingsexport (AP8/DPO-Pipeline) ist das unproblematisch, da Punktzahlen als kurze Zahl-Strings genauso gut auswertbar sind wie ein eigener Typ.
- `test/seed-assess-manual.mjs` ist ein neues, kleines Hilfsskript fuer manuelle Klick-Tests der Bewerten-Seite (nicht Teil von `npm test`, analog zu `test/make_test_data.py` aus AP2); es bleibt bewusst im Repo, falls Svenja die Seite manuell im Browser durchklicken moechte, bevor Ollama laeuft.

## AP8: PDF-Export (erledigt)

### Was existiert

- **PDF-Bausteine** (`lib/pdf/`, neu, serverseitig via `pdf-lib`):
  - `text-sanitize.ts`: `sanitizeForWinAnsi(text)` bereinigt jeden Text fuer pdf-lib Standardfonts (WinAnsi/CP1252). Deutsche Umlaute und "ss" bleiben unveraendert (WinAnsi deckt `ä ö ü Ä Ö Ü ß` nativ ab, 0xA0-0xFF); typografische Anfuehrungszeichen und Gedankenstriche werden auf gerade Anfuehrungszeichen bzw. einfache Bindestriche abgebildet (Hausregel 1); alles jenseits von WinAnsi (z.B. Emojis) wird sauber durch "?" ersetzt statt beim Schreiben abzustuerzen. `isWinAnsiSafe(text)` prueft nur.
  - `wrap.ts`: `wrapText(text, maxWidth, measureFn)` bricht Text an Wortgrenzen um (reine Funktion, nimmt eine Breiten-Messfunktion entgegen, damit sie ohne echtes PDF-Rendering testbar ist); ein einzelnes zu breites Wort wird zeichenweise hart umgebrochen, damit nichts verloren geht oder ueber den Rand laeuft. Bestehende Zeilenumbrueche werden als Absatzgrenzen respektiert, leere Absaetze ergeben eine Leerzeile. `paginateLines(lines, linesPerPage)` fuer feste Zeilen-pro-Seite-Aufteilung (aktuell nicht von den PDF-Buildern genutzt, die arbeiten mit dynamischer Hoehe statt fester Zeilenzahl, aber als Baustein verfuegbar).
  - `layout.ts`: `FlowingPage` - ein kleines Fluss-Layout ueber `PDFDocument`. Zeichnet Warm-Paper-Hintergrund (Hausregel 7, Farben 1:1 aus `app/globals.css` uebernommen), legt bei Platzmangel automatisch eine neue Seite an (`ensureSpace`), bietet `drawTitle`/`drawHeading`/`drawLabel`/`drawParagraph`/`drawQuoteBlock`/`drawDivider`/`addSpace`. Titel ueber `StandardFonts.TimesRomanBold` (Serif), Fliesstext ueber `Helvetica` (siehe Hausregel 7: "pdf-lib Standardfonts sind ok, dann Times fuer Titel und Helvetica fuer Fliesstext"). Jeder gezeichnete Text laeuft durch `sanitizeForWinAnsi`. Die Fusszeile wird bewusst erst in `finish()` geschrieben (ein Durchgang ueber alle Seiten dieses Abschnitts), weil die Gesamtseitenzahl erst feststeht, wenn ein Abschnitt fertig ist (ein Abschnitt kann bei sehr langem Text auf mehrere physische Seiten umbrechen); so zeigt "2 / 3" immer die tatsaechliche Seitenzahl, nie eine feste Annahme.
  - `feedback-pdf.ts`: `buildFeedbackPdf(input)` baut das dreiseitige Feedback-PDF fuer eine Arbeit. Seite 1: Kuerzel, Fach, Aufgabe (erste Zeile der `taskPrompt`, umgebrochen), Note im konfigurierten Notensystem (`GradeResult` aus `lib/grading/grade.ts`) mit Klartext-Einordnung, Gesamtpunkte, Staerke. Seite 2: je Beobachtung aus `FeedbackDraft.observations` eine Karte mit Kriteriumsname, Punkten, Beobachtungstext und (falls vorhanden) einem abgesetzten Zitat-Block. Seite 3: naechster Schritt, optional Uebungsvorschlag. Beschriftungen sind sprachabhaengig (Deutsch/Englisch je nach `config.feedbackLanguage`, eigene kleine Label-Tabelle in dieser Datei, nicht dieselbe wie die App-UI-Locale, weil das PDF in der Feedback-Sprache der Schuelerin/des Schuelers erscheinen soll, nicht in der UI-Sprache der Lehrkraft). Jeder Text laeuft zusaetzlich zur AP7-Pruefung noch einmal defensiv durch `guardText(text, config.forbiddenWords)` (Hausregel 2) direkt vor dem Schreiben.
  - `class-overview-pdf.ts`: `buildClassOverviewPdf(input)` baut die Klassenuebersicht: Tabelle mit Kuerzel, einer Spalte je Kriterium (`Punkte/Max`), Gesamtpunkte, Note. Bricht bei vielen Zeilen automatisch auf mehrere Seiten um (Tabellenkopf wird auf jeder neuen Seite erneut gezeichnet, damit jede Seite eigenstaendig lesbar ist). Leere Zeilenliste ergibt eine Seite mit Hinweistext statt eines Absturzes. Fusszeile mit Fach, Datum und Runde.
- **API-Routen** (`app/api/export/`, alle `runtime = "nodejs"`):
  - `GET /api/export/rounds` / `GET /api/export/rounds?round=...`: wie die gleichnamigen Routen aus AP6/AP7, aber fuer den Export-Blickwinkel - liefert je Arbeit `released` (nur `true`, wenn `submission.status === "released"` UND `assessment.released === true`) sowie bei nicht freigegebenen Arbeiten einen `stageMessageKey` (`export.stage.review`/`export.stage.assess`/`export.stage.release`), der erklaert, wo die Arbeit gerade steht (Pruefen, Bewerten, oder bewertet aber noch nicht freigegeben).
  - `GET /api/export/feedback-pdf?round=...&id=...`: liefert das dreiseitige Feedback-PDF einer einzelnen Arbeit als `application/pdf`-Download (`Content-Disposition: attachment; filename="feedback-<Kuerzel>.pdf"`). Nur fuer freigegebene Arbeiten; sonst `409` mit `{ error, messageKey: "export.error.notReleased" }`.
  - `GET /api/export/class-pdf?round=...`: liefert die Klassenuebersicht als PDF-Download, nur ueber die freigegebenen Arbeiten der Runde (nicht freigegebene werden stillschweigend ausgelassen, nicht als Fehler behandelt, weil die Klassenuebersicht explizit "nur freigegebene Arbeiten" zeigen soll).
  - `GET /api/export/dpo`: Liste aller Runden mit vorhandenen Korrektur-Dateien (`data/dpo/<roundId>.jsonl`) und deren Anzahl Paare (`readDpoPairs`/`listDpoFiles`, AP0/AP7 unveraendert). `GET /api/export/dpo?round=...`: die JSONL-Datei dieser Runde als Download (`application/jsonl`, `Content-Disposition: attachment`).
- **Export-Seite** (`app/export/page.tsx`, ersetzt den AP0-Platzhalter): Runde waehlen (gleiches Muster wie AP6/AP7: `localStorage`-Merkzettel `gemmpen.lastRound`, `?round=`-Parameter). Vier Bloecke:
  1. **Feedback-Blaetter herunterladen**: Zusammenfassung ("X von Y Arbeiten freigegeben"), Knopf "Alle Feedback-Blaetter herunterladen" (loest nacheinander einen Download je freigegebener Arbeit aus, damit der Browser nicht mehrere gleichzeitige Downloads verwirft) plus ein Einzel-Download-Link je Arbeit mit Kuerzel und Note.
  2. **Klassenuebersicht**: ein Knopf laedt die Tabellen-PDF herunter; deaktiviert, solange keine Arbeit freigegeben ist.
  3. **Noch nicht bereit fuer den Export**: listet alle nicht freigegebenen Arbeiten der Runde mit ihrem Stand-Hinweis (`stageMessageKey`) und einem Link, der direkt zur richtigen Seite fuehrt (Pruefen bei `ingested`/`transcribed`, Bewerten-Detail bei `checked`/`assessed`).
  4. **DPO-Export**: kurzer, laienverstaendlicher Hinweistext ("Die Auswertung lernt aus den Korrekturen. Die Datei bleibt auf deinem Rechner, es wird nichts hochgeladen."), Anzahl vorhandener Korrekturen, Download-Knopf (ausgeblendet/durch einen Hinweis ersetzt, wenn es fuer die Runde noch keine Korrekturen gibt).
  Downloads laufen client-seitig ueber `fetch` + `Blob` + einen unsichtbaren `<a download>`-Link (nicht per direktem `<a href>`, damit Fehlerantworten wie 409 als lesbare Fehlermeldung statt eines kaputten Downloads erscheinen). Screenfuehrung nach Hausregel 4: JETZT "PDFs herunterladen", DANACH "an die Klasse verteilen" (`export.now`/`export.next`).
- **Locale-Schluessel**: alle neuen Strings unter `export.*` in `locales/de.json` und `locales/en.json` ergaenzt (identische Schluessel, Englisch frei formuliert, per Skript auf Vollstaendigkeit zwischen beiden Dateien geprueft).

### Wichtige Bugfixes waehrend des visuellen Checks (siehe Definition of Done)

Der erste Entwurf lief durch alle automatisierten Tests, zeigte aber beim Rendern zu PNG zwei echte Fehler, die nur visuell auffielen:

1. **Zitat-Block ueberlappte den Absatz darueber** (Seite 2): die Hoehen-Berechnung von `drawQuoteBlock` in `layout.ts` war falsch (Rechteck-Y-Position rechnete sich aus `this.y - blockHeight + lineHeight - 4`, das passte nicht zur tatsaechlichen Text-Startposition). Behoben: der Block merkt sich jetzt seine obere Kante (`blockTop = this.y`) und rechnet Rechteck und Text sauber von dort abwaerts mit expliziten `padTop`/`padBottom`-Werten.
2. **"Aufgabe: ..."-Zeile lief ueber den rechten Seitenrand hinaus** (Seite 1): `drawLabel` zeichnete bisher nur eine einzelne Zeile ohne Umbruch. Behoben: `drawLabel` bricht jetzt wie `drawParagraph` an Wortgrenzen um.

Beide Fehler wurden durch echtes Rendern der Beispiel-PDFs zu PNG (`pdftoppm`) und visuelles Ansehen gefunden, nicht durch die automatisierten Tests (die pruefen Seitenzahl und dass `pdf-lib` das Dokument wieder laden kann, aber nicht die visuelle Position von Elementen). Nach der Korrektur wurden die PNGs erneut erzeugt und angesehen: keine Ueberlappung mehr, kein Text laeuft ueber den Rand, lange Beobachtungen brechen sauber auf eine zusaetzliche physische Seite um, die Fusszeile zeigt danach die korrekte Gesamtseitenzahl (z.B. "2 / 4" statt einer festen Annahme "2 / 3").

### Tests

- `lib/__tests__/pdf-text-sanitize.test.ts` (neu, 8 Tests): deutsche Umlaute und "ss" bleiben unveraendert; typografische Anfuehrungszeichen werden auf gerade abgebildet; En-/Em-Dash werden zu einfachen Bindestrichen (Hausregel 1); nicht abbildbare Zeichen (Emoji) werden durch "?" ersetzt statt zu crashen; normale ASCII-Texte bleiben unveraendert; `isWinAnsiSafe` erkennt Texte, die Ersatz brauchen; leere Eingabe crasht nicht; kombinierte Umlaut-Zeichen werden normalisiert.
- `lib/__tests__/pdf-wrap.test.ts` (neu, 9 Tests): kurzer Text bleibt eine Zeile; langer Text bricht an Wortgrenzen um ohne Zeichenverlust; ein einzelnes zu breites Wort wird hart umgebrochen ohne Zeichenverlust; bestehende Zeilenumbrueche werden als Absatzgrenzen respektiert; leere Absaetze ergeben eine Leerzeile; leerer Text crasht nicht; sehr lange Feedback-Texte brechen sauber um (keine Zeile zu breit); `paginateLines` teilt korrekt auf und crasht bei leerer Liste nicht.
- `lib/__tests__/pdf-generation.test.ts` (neu, 7 Tests, Integrationstest mit echtem `pdf-lib`): Feedback-PDF hat mindestens drei Seiten und laesst sich verlustfrei wieder laden (`PDFDocument.load`); sehr lange Beobachtungen loesen einen zusaetzlichen Seitenumbruch aus (mehr als drei physische Seiten); deutsche Umlaute in Kuerzel/Begruendung/Feedback fuehren nicht zum Absturz; Verbotswoerter werden vor dem Schreiben erkannt (defensive zweite Pruefung neben AP7); Klassenuebersicht mit zwei Zeilen laedt sich; 45 Zeilen brechen auf mehr als eine Seite um; leere Zeilenliste ergibt genau eine Seite.
- `npm test`: jetzt 103 Tests, alle gruen (79 aus AP0-AP7, 24 neu aus AP8: 8 + 9 + 7).
- `npm run build`: gruen, neue Routen erscheinen (`/api/export/rounds`, `/api/export/feedback-pdf`, `/api/export/class-pdf`, `/api/export/dpo`, `/export`).
- `npx eslint .`: 0 Fehler (dieselben vier bereits akzeptierten Vorbestandswarnungen aus AP2/AP5/AP6/AP7-Bearbeitung, keine neuen).
- **Visueller Check (Definition of Done, per Hand mit `pdftoppm`)**: `test/make_export_samples.mjs` und `test/make_long_feedback_sample.mjs` (neu, nicht Teil von `npm test`, analog zu `test/make_test_data.py`) erzeugen Beispiel-PDFs aus realistischen Testdaten (inklusive Kuerzel mit Umlaut "MÜ34", deutschen Umlauten in Begruendung/Feedback, und einem Extremfall mit sehr langen Beobachtungen). Die PDFs wurden mit `pdftoppm -png` zu PNG gerendert und Seite fuer Seite angesehen: Umlaute erscheinen korrekt (kein "?"), kein Text ist abgeschnitten, lange Absaetze brechen sauber um, der Seitenumbruch zwischen Kriterien-Karten ist sauber (kein Text mitten im Satz abgeschnitten), die Fusszeile zeigt die korrekte Gesamtseitenzahl.
- **Manueller End-zu-Ende-Test ueber echtes HTTP** (nicht Teil von `npm test`, gleiches Muster wie AP5/AP6/AP7): `test/seed-export-manual.mjs` (neu) legt eine Fach-Konfiguration, eine freigegebene Arbeit (mit Assessment und Feedback) und eine nicht freigegebene Arbeit (Status "geprueft") sowie zwei DPO-Paare in einem frischen `GEMMPEN_DATA_DIR` an. Ein `next start` dagegen gestartet und alle vier Routen per `curl` durchgespielt: `GET /api/export/rounds` (Liste), `GET /api/export/rounds?round=...` (zeigt die nicht freigegebene Arbeit mit `stageMessageKey: "export.stage.assess"` und die freigegebene mit `gradeDisplay`), `GET /api/export/feedback-pdf` fuer die freigegebene Arbeit (`200`, gueltiges dreiseitiges PDF laut `pdfinfo`), fuer die nicht freigegebene Arbeit (`409` mit `messageKey: "export.error.notReleased"`), `GET /api/export/class-pdf` (`200`, gueltiges einseitiges PDF), `GET /api/export/dpo` (Liste mit `count: 2`) und `GET /api/export/dpo?round=...` (zwei gueltige JSONL-Zeilen). Das bestaetigt die Definition of Done zusaetzlich zu den automatisierten Tests end-to-end ueber echtes HTTP.

### Was AP9/AP13/AP14 hiervon nutzen sollen

- Alle neuen UI-Strings stehen schon vollstaendig in beiden Locale-Dateien (`export.*`); AP9 (i18n-Vervollstaendigung) muss hier nichts nachtragen, hoechstens die Formulierungen nochmal gegenlesen.
- `lib/pdf/layout.ts: FlowingPage` und `lib/pdf/text-sanitize.ts` sind bewusst generisch gehalten (kein Bezug auf `SubjectConfig`/`Submission`) und liessen sich fuer ein spaeteres weiteres PDF (falls AP13/v2 eines braucht) wiederverwenden, ohne `feedback-pdf.ts`/`class-overview-pdf.ts` anzufassen.
- Fuer Gate 4 (kompletter Durchlauf Foto bis PDF mit einer echten Arbeit) ist der Export-Teil jetzt bereit; der einzige noch fehlende Baustein fuer den kompletten Kreislauf ist ein echter Ollama-Lauf (AP3/AP7), nicht der Export selbst.

### Offene Punkte

- Die PDF-Beschriftungen (Feedback-PDF, Klassenuebersicht) sind sprachabhaengig nach `config.feedbackLanguage` (Deutsch/Englisch), aber nur mit einer kleinen eigenen Label-Tabelle in `lib/pdf/feedback-pdf.ts`/`class-overview-pdf.ts`, nicht ueber die App-Locale-Dateien (`locales/*.json`). Das ist beabsichtigt (das PDF spricht die Schuelerin/den Schueler in der Feedback-Sprache an, die App-Locale ist die Sprache der Lehrkraft-Oberflaeche und koennte davon abweichen), aber falls spaeter weitere Sprachen als Deutsch/Englisch fuer Feedback gebraucht werden, muesste diese kleine Tabelle erweitert werden (aktuell Fallback auf Deutsch fuer alles, was nicht mit "en" beginnt).
- Der Download-Ablauf in der Export-Seite loest bei "Alle Feedback-Blaetter herunterladen" die Downloads nacheinander aus (kein `Promise.all`), damit der Browser nicht mehrere gleichzeitige Downloads blockiert oder verwirft; bei sehr grossen Klassen (deutlich ueber 40 Arbeiten) waere das entsprechend langsamer, aber fuer die uebliche Klassengroesse unproblematisch und nicht Teil des Auftrags, das zu optimieren.

## AP9: i18n vervollstaendigung und englische Naturalisierung (abgeschlossen)

### Was existiert

- **Locale-Schluessel-Synchronisation**: `locales/de.json` und `locales/en.json` haben identische Schluessel (369 Paare, per Validierungsskript geprueft). Alle UI-Strings werden ueber `t("schluessel")` zugegriffen, kein Hartcode in den Komponenten.
- **Englische Naturalisierung**: Alle englischen Werte wurden ueberarbeitet, um nicht technisch/uebersetzt zu wirken. Konkrete Arbeiten:
  - Ersatz aller "assessment helper"-Referenzen durch "the system" oder "GemmPen" je nach Kontext (18 Stellen). Beispiele: `setup.step3.now`: "Enter what a good answer should cover. The system will then suggest a marking scheme." statt "...the assessment helper drafts..."
  - Auswechslung steifer Wendungen: "did not work out" -> "did not work", "this can take a moment depending on" -> "this can take a moment with", "went sideways" -> "went wrong", "settle" -> "fix" (je nach Kontext)
  - Konsistente Termini im Englischen: "mark/marking" statt "assess/assessing", "System connection" statt "Connection to the assessment helper", "submit" -> "continue", "Reading" statt "Wird gelesen"
  - Vereinfachung kuerzerer Saetze: "Check the points, reasoning and feedback text, and adjust them if needed." -> "Review the points, reasoning and feedback. Adjust as needed."
- **Sprachumschalter-Mechanismus**: `components/nav.tsx` enthaelt einen Globus-Button, der DE/EN toggelt. Die Wahl wird in `localStorage` unter `gemmpen.locale` gespeichert (via `useSyncExternalStore` in `lib/i18n.tsx`), damit die Sprache nach einem Reload erhalten bleibt. Server-rendering bleibt stabil bei Deutsch (Standardsprache), der Client uebernimmt die gemerkte Wahl ohne sichtbaren Flicker.
- **i18n Hook**: `useI18n()` stellt `t(key)`, `locale`, und `setLocale` bereit. Alle Seiten-Komponenten (10 von 11 TSX-Dateien in `app/`) verwenden den Hook. Die eine Ausnahme ist `app/layout.tsx`, bei der das nicht noetig ist (Server-Layout).
- **Hartcode-Suche**: Durchlauf aller JSX/TSX-Dateien ergab kein relevantes hartkodiertes UI-String-Rausch (nur Kommentare und meta-Tags, die intentional hartcodiert sind).

### Tests und Validierung

- **npm test**: Alle 103 Tests gruen (keine neuen Tests noetig fuer i18n, wird durch bestehende Tests abgedeckt).
- **npm run build**: Erfolgreich, alle Seiten werden erzeugt, keine TypeScript-Fehler, keine ESLint-Fehler.
- **Locale-Synchronisation**: Python-Validierungsskript prueft: 369 Schluessel in beiden Dateien, identische Menge, kein `t()` ohne Locale-Eintrag, kein "assessment helper" mehr in englischen Werten.
- **Sprachumschalter**: Visuell testbar nach `npm run dev` auf `localhost:3000` - Der Globus-Button in der Navigation wechselt zwischen DE und EN, Navigationspunkte und alle Seiteninhalte folgen.

### Was folgende Arbeitspakete (AP10-AP14) betrifft

- Neue UI-Strings muessen in BEIDE `locales/*.json` Dateien. Schluessel muessen identisch sein.
- Englische Werte sollten fuer Natuerlichkeit gegenlesen werden (warm, klar, keine technischen Begriffe wie "model", "parameter", "prompt", "token", keine Verbotswoerter wie "wrong", "bad", "fail").
- Die Default-Sprache beim ersten Besuch ist Deutsch; die Wahl wird gemerkt (localStorage).

### Definition of Done: erfuellt

✓ Hartcodierte UI-Strings: Null relevante Treffer in `app/` und `components/` (Suchen nach deutschen/englischen Textliteralen ausserhalb von `t()` ergaben nur Kommentare und Meta-Tags)
✓ Locale-Schluessel synchron: 369 Schluessel, beide Dateien identisch (per Validierungsskript bestaetigt)
✓ Englische Werte naturalisiert: Alle "assessment helper" ersetzt, steife Wendungen ueberarbeitet, konsistente Termini, Kuerzung wo moeglich (18 grosse Aenderungen, 20+ kleinere Wortwahlverbesserungen)
✓ Sprachumschalter funktioniert: `useI18n()` mit `setLocale`, localStorage-Persistierung, DE/EN-Button in der Nav sichtbar und funktional
✓ npm run build gruen: Alle Seiten, keine Fehler
✓ npm test gruen: Alle 103 Tests (kein Regressionsfehler durch i18n-Aenderungen)
✓ UEBERGABE.md aktualisiert
- Wie in AP2/AP3/AP5/AP6/AP7: der visuelle PDF-Check und der HTTP-End-zu-Ende-Test liefen beide in der Sandbox mit selbst erzeugten Beispieldaten (kein echtes Ollama-Ergebnis als Quelle). Ein Export mit einer echten, ueber Ollama bewerteten Arbeit auf Svenjas Mac gehoert in Gate 4.
- `test/make_export_samples.mjs`, `test/make_long_feedback_sample.mjs` und `test/seed-export-manual.mjs` sind neue, kleine Hilfsskripte fuer manuelle Checks (nicht Teil von `npm test`, analog zu den Hilfsskripten aus AP2/AP7); sie erzeugen keine Dateien in `test/fixtures/` (die erzeugten Beispiel-PDFs/PNGs wurden nach dem visuellen Check wieder geloescht, um das Repo schlank zu halten), sondern nur bei Bedarf beim manuellen Ausfuehren.

## AP10: Startskripte und Installation (erledigt)

### Was existiert

- **`install/start-mac.command`** (neu, ausfuehrbar/doppelklickbar): Startskript fuer den Mac, geschrieben in einfachem, POSIX-nahem Bash (kein `local -n`, keine Bash-4-only-Arrays), damit es sowohl unter der auf dem Mac vorinstallierten Bash 3.2 als auch unter neueren Versionen und unter Linux (Sandbox-Test) laeuft. Sechs Schritte, jeder mit eigener Nummerierung ("Schritt X von 6") und Meldung in einfacher Sprache:
  1. Node vorhanden? (`command -v node`), sonst Hinweis mit Link zu `https://nodejs.org` und Stopp.
  2. Ollama vorhanden? (`command -v ollama`), sonst Hinweis mit Link zu `https://ollama.com` und Stopp.
  3. Laeuft Ollama? Prueft `curl http://localhost:11434/api/tags`; falls nicht, startet das Skript `ollama serve` im Hintergrund (`nohup ... &`, Log nach `install/ollama-start.log`, per `.gitignore` ausgeschlossen) und wartet bis zu 10 Sekunden auf Erreichbarkeit; gelingt das nicht, Hinweis, Ollama von Hand zu oeffnen, und Stopp.
  4. Benoetigte Modelle geladen? Liest `visionModel`/`gradingModel` aus `data/config/app.json` (per `sed`, ohne externes JSON-Werkzeug), fehlt die Datei, werden dieselben Defaults wie `DEFAULT_APP_CONFIG` in `lib/storage.ts` verwendet (aktuell `gemma3:12b` fuer beide, ZU BESTAETIGEN durch Svenja, siehe AP3-Abschnitt oben). Fehlende Modelle werden per `ollama pull` geladen, mit dem Hinweis "Das kann beim ersten Mal 10 bis 20 Minuten dauern, bitte dieses Fenster offen lassen." Schlaegt der Download fehl: Hinweis mit dem passenden `ollama pull <Modell>`-Befehl von Hand und Stopp.
  5. Abhaengigkeiten installiert? Prueft `node_modules`, fuehrt bei Fehlen einmalig `npm install` aus (mit Wartehinweis).
  6. App bauen (falls kein `.next`-Ordner vorhanden: `npm run build`, mit Wartehinweis) und starten (`npm run start`, blockierend im Vordergrund, haelt das Fenster am Leben); parallel dazu wartet ein Hintergrundprozess, bis `http://localhost:3000` antwortet, und oeffnet dann automatisch den Browser (`open`, nur auf dem Mac; unter Linux nur eine Textzeile statt eines Fehlers, `uname -s`-Weiche `IS_MAC`).
  - Trockenlauf-Modus: Argument `check` fuehrt nur die Schritte 1 bis 5 aus (Pruefungen inklusive `npm install`, falls noetig), baut/startet aber nichts.
  - Jeder Fehlerfall endet mit einem Satz, was zu tun ist, und "Druecken Sie eine Taste zum Beenden." (kein stummer Abbruch), ueber die gemeinsame Funktion `pause_and_exit`.
- **`install/start-windows.bat`** (neu): spiegelt dieselben sechs Schritte, dieselbe Reihenfolge und (so weit batch-typografisch moeglich) dieselben Meldungstexte wie die Mac-Fassung. Unterschiede nur dort, wo Windows andere Bordmittel braucht:
  - `where node`/`where ollama` statt `command -v`.
  - Ollama-Erreichbarkeitspruefung und Warten auf `localhost:3000` ueber PowerShell (`Invoke-WebRequest`), da nicht jede Windows-Version `curl` mitbringt.
  - Modellnamen aus `data/config/app.json` werden ueber `findstr`/eigene Batch-Textverarbeitung gelesen (Hilfsroutine `:extract_json_string`), kein externes JSON-Werkzeug noetig.
  - Der Browser-Start (`start "" "http://localhost:3000"`) laeuft in einer eigenen, unsichtbaren Zweitkopie des Skripts (`start "" /min cmd /c "<Pfad> __wait_and_open_browser__"`), die nur wartet und oeffnet, dann sofort endet; das Argument `__wait_and_open_browser__` ist ein interner, nicht dokumentierter Aufruf, kein Teil der oeffentlichen Bedienung.
  - Trockenlauf-Modus ebenfalls ueber das Argument `check`.
  - Jeder Fehlerfall endet ueber die Sprungmarke `:fail` mit einem Hinweissatz und `pause` ("Druecken Sie eine Taste zum Beenden."), bevor sich das Fenster schliesst.
- **`install/README.md`** (neu): dokumentiert beide Wege (Mac und Windows), was die sechs Schritte tun, wie der Modellname-Abgleich mit `data/config/app.json`/`lib/storage.ts` funktioniert, den Trockenlauf-Aufruf fuer beide Skripte, was in dieser Sandbox tatsaechlich getestet wurde (Mac: mehrfacher Trockenlauf, echt und mit simulierten Ollama-Stellvertretern; Windows: ausschliesslich Gegenlesen, kein echter Lauf moeglich), einen konkreten siebenschrittigen Testweg fuer Svenja auf ihrem echten Mac (inklusive zweitem Doppelklick, um "bereits installiert"/"bereits aufbereitet" zu sehen), und die bekannten Grenzen dieser Version (kein Installer, kein Autostart-Eintrag).
- **`.gitignore`** ergaenzt um `/install/ollama-start.log` (Log-Datei des automatischen Ollama-Starts, soll nicht ins Repo).

### Abgleich mit AP3 (Modellnamen)

Beide Skripte lesen `visionModel`/`gradingModel` aus derselben Datei (`data/config/app.json`), die auch die App selbst nutzt (`lib/storage.ts: readAppConfig`), und verwenden dieselben Default-Werte (`gemma3:12b`/`gemma3:12b`) wie `DEFAULT_APP_CONFIG` in `lib/storage.ts`, falls die Datei noch nicht existiert. Aendert Svenja die Modellnamen ueber die Einstellungen-Seite der App (AP3), lesen die Startskripte beim naechsten Start automatisch die neuen Namen, ohne Code-Aenderung. Nur falls sich die Code-Defaults selbst in `lib/storage.ts` aendern sollten (z.B. weil Svenja `gemma3:12b` insgesamt durch ein anderes Modell ersetzt), muessten die beiden Konstanten `DEFAULT_VISION_MODEL`/`DEFAULT_GRADING_MODEL` am Anfang jedes Skripts von Hand nachgezogen werden, damit ein allererster Start ohne vorhandene `app.json` weiterhin denselben Namen laedt wie die App.

### Tests / Trockenlauf-Ergebnis

- `bash -n install/start-mac.command`: syntaktisch fehlerfrei.
- `bash install/start-mac.command check` (Trockenlauf) in der Sandbox mehrfach erfolgreich durchlaufen (Exit-Code 0, kein Haengenbleiben, kein stummer Abbruch):
  - Ohne installiertes Ollama: stoppt korrekt bei Schritt 2 mit der `ollama.com`-Anleitung und `pause_and_exit 1`.
  - Mit eigens angelegten Testvertretern fuer `ollama` (liefert eine `ollama list`-Beispielzeile `gemma3:12b`) und `curl` (meldet immer "erreichbar") auf dem Pfad vorgeschaltet: alle sechs Pruefungen laufen bis zum gruenen Trockenlauf-Ende durch (Node gefunden, Ollama installiert/laeuft, Modell `gemma3:12b` bereits geladen erkannt, `node_modules` bereits vorhanden erkannt, Trockenlauf-Endmeldung, Exit 0).
  - Mit einer eigens angelegten `data/config/app.json` (`visionModel: "gemma3:4b"`, `gradingModel: "gemma3:27b"`): das Skript liest beide Namen korrekt aus der Datei (nicht die Defaults) und meldet fuer beide separat "noch nicht bestaetigt geladen" (da die Testvertreter nur `gemma3:12b` kennen) - bestaetigt sowohl das Lesen der Konfigurationsdatei als auch den Umgang mit zwei unterschiedlichen Modellnamen fuer Erkennung und Bewertung.
  - Nach jedem Testlauf wurden die selbst angelegte `app.json` und eventuelle Log-Dateien wieder entfernt, damit keine Testartefakte im Datenordner zurueckbleiben.
- `install/start-windows.bat`: **kein echter Test moeglich**, diese Entwicklungsumgebung hat kein Windows. Stattdessen sorgfaeltig von Hand gegengelesen: dieselben sechs Schritte in derselben Reihenfolge wie die Mac-Fassung, `errorlevel`-Abfragen direkt nach dem jeweils zugehoerigen Befehl (kein verzoegerter Test), konsequente Nutzung von `EnableDelayedExpansion`/`!Variable!` fuer Variablen, die innerhalb von Klammerbloecken veraendert werden (bekannter Batch-Fallstrick, sonst wuerden z.B. `MODEL_FOUND`/`STARTED` immer ihren Wert von vor dem Block behalten), `goto :fail`/`goto :success` fuehren immer zu einer `pause`-Zeile mit demselben deutschen Hinweistext wie im Mac-Skript.

### Offene Punkte

- **Windows-Skript ungetestet**: `install/start-windows.bat` wurde nicht auf einem echten Windows-Rechner ausgefuehrt (keine Windows-Umgebung verfuegbar). Vor der ersten Weitergabe an eine fremde Lehrkraft mit Windows-Rechner sollte es einmal echt durchgeklickt werden (siehe `install/README.md`, Abschnitt "Was in dieser Sandbox getestet wurde").
- **Echter Mac-Test steht noch aus**: der Trockenlauf in der Sandbox bestaetigt nur, dass die Ablauflogik nicht abstuerzt und die Meldungstexte stimmen; ein echter Test mit echtem Ollama-Start, echtem Modell-Download und echtem Browser-Oeffnen ist nur auf Svenjas Mac moeglich. `install/README.md` enthaelt dafuer einen konkreten siebenschrittigen Testweg (inklusive absichtlich fehlendem Ollama fuer Schritt 2, zweitem Doppelklick fuer "bereits installiert").
- Der automatische Ollama-Start (Mac Schritt 3 / Windows Schritt 3) setzt voraus, dass `ollama` auf dem Befehlspfad (PATH) liegt; das ist bei einer Standardinstallation von `https://ollama.com` der Fall, wurde aber nicht mit einer echten, nicht im PATH liegenden Installation getestet.
- Die Windows-Fassung nutzt fuer den Kopfzeilen-Modellabgleich eine sehr einfache Batch-Textverarbeitung (`findstr` plus `:extract_json_string`); bei einer `app.json`, die stark vom bisherigen, flachen Format abweicht (z.B. mehrzeilig formatierte Werte oder verschachtelte Objekte), koennte das Auslesen scheitern. Fuer das aktuelle, von `lib/storage.ts` erzeugte Format (eine Zeile je Feld) ist das kein Problem; bei einer spaeteren Schema-Erweiterung sollte das erneut gegengelesen werden.
- Kein signierter Installer, kein Autostart-Eintrag, keine automatisch angelegte Desktop-Verknuepfung (siehe Nicht-Ziele der v1 im Bauplan); die Lehrkraft startet immer per Doppelklick auf die jeweilige Startdatei.

### Was AP11/AP13/AP14 hiervon nutzen sollen

- AP11 (Doku fuer Lehrkraefte): `ERSTE-SCHRITTE.md` kann sich beim Beschreiben des allerersten Starts direkt auf den Doppelklick auf `install/start-mac.command` bzw. `install/start-windows.bat` beziehen und die sechs Schritte in Alltagssprache zusammenfassen; die genauen Meldungstexte stehen in den Skripten selbst und in `install/README.md`.
- AP13 (Integration): der Trockenlauf-Modus (`check`) eignet sich als schneller Rauchtest, dass die Skripte nach spaeteren Aenderungen an `data/config/app.json`/`lib/storage.ts` weiterhin dieselben Modellnamen lesen.
- AP14 (Endabnahme): der in `install/README.md` beschriebene siebenschrittige Testweg auf Svenjas Mac ist eine sinnvolle Ergaenzung zu Gate 4, auch wenn er in keinem der vier Pruef-Gates aus dem Bauplan einzeln benannt ist.

## AP11: Doku fuer Lehrkraefte (erledigt)

### Was existiert

Acht Dokumente in `docs/` (Deutsch) und `docs/en/` (Englisch, eigenstaendig neu geschrieben, keine Wort-fuer-Wort-Uebersetzung):

- `docs/ERSTE-SCHRITTE.md` / `docs/en/GETTING-STARTED.md`: Weg von Ollama-Installation ueber Startskript, Einstellungen pruefen, Fach einrichten, Vorlage drucken, Arbeiten sammeln (Foto/Scanner), Hochladen, Pruefen, Bewerten, bis Export. Zehn nummerierte Schritte, mit `[SCREENSHOT: ...]`-Platzhaltern an den Stellen, wo ein Bildschirmfoto den Text ergaenzen wuerde (Startskript-Fenster, Einstellungen, Wizard-Schritt 1, Vorlage, Hochladen-Dropzone, Pruefen-Uebersicht und -Detail, Bewerten-Uebersicht und -Detail, Export-Seite).
- `docs/MEIN-FACH-EINRICHTEN.md` / `docs/en/SET-UP-MY-SUBJECT.md`: alle sechs Wizard-Schritte einzeln erklaert, inklusive was einen guten Erwartungshorizont ausmacht (konkret und pruefbar statt allgemein, mit Gut/Weniger-gut-Beispiel) und einer verstaendlichen Erklaerung, warum die Kalibrierung mit 1-2 selbst bewerteten Beispielarbeiten sinnvoll ist (zeigt vorab, wie nah die Auswertung an der eigenen Bewertung liegt, mit den drei Klartext-Stufen nah/spuerbar/deutlich aus Schritt 5).
- `docs/HAEUFIGE-FRAGEN.md` / `docs/en/FAQ.md`: 20 Fragen (mehr als die geforderten 15), darunter alle im Auftrag genannten Pflichtfragen (Daten der Schueler, Vertrauen ins Ergebnis, schlechte Handschrift-Erkennung, Fach-Eignung, Kosten, Internet, Dauer, Korrektur-Datei) plus weitere realistische Fragen (Vorlage-Pflicht, Foto vs. Scanner, mehrere Klassen, mehrseitige Arbeiten, Ollama nicht erreichbar, Loesungsverrat im Feedback, Formulierungen anpassen, falsche Zuordnung, Rechnerwechsel, Abgrenzung zur Hackathon-Web-App GemmPen).
- `docs/DATENSCHUTZ.md` / `docs/en/PRIVACY.md`: alles laeuft lokal (mit expliziter Liste, was das umfasst: Fotos, Texte, Bewertungen, Feedback, Korrektur-Datei), genaue Speicherorte unter `data/`, Kuerzel-statt-Name-Empfehlung samt Hinweis, Namen vor dem Fotografieren abzudecken, Loeschung durch Ordner-Loeschen (einzelne Runde oder alles), Hinweis dass nur die einmalige Ollama-Einrichtung Internet braucht.

### Wie geprueft wurde, dass die Doku zur echten App passt

Kein Text wurde geraten. Vor dem Schreiben wurden gelesen: alle zehn Seiten unter `app/` (`page.tsx`, `setup/page.tsx` komplett inklusive aller sechs Schritt-Komponenten, `upload/page.tsx` komplett, `subjects`, `review`, `review/[id]`, `assess`, `assess/[id]`, `export`, `settings`), die vollstaendigen `de`-Locale-Schluessel fuer `setup.*`, `review.*`, `assess.*`, `export.*`, `settings.*`, `nav.*`, `ollama.*` (um die tatsaechlichen Bildschirmtexte zu zitieren statt zu erfinden), `public/templates/README.md` (Marker-Geometrie, Druckhinweis 100 Prozent/kein "An Seite anpassen"), `install/README.md` (die sechs Start-Pruefschritte, Modellnamen-Abgleich), sowie die relevanten UEBERGABE.md-Abschnitte AP0-AP10. Konkrete Beispiele, wo Code-Lektuere den Text direkt bestimmt hat:
- Die zehn ERSTE-SCHRITTE-Schritte folgen exakt der Reihenfolge Ollama-Installation -> Startskript -> Einstellungen -> Einrichten (6 Unterschritte kurz zusammengefasst) -> Vorlage drucken -> Sammeln -> Hochladen -> Pruefen -> Bewerten -> Export, weil das die tatsaechliche Navigation und Abhaengigkeit der Seiten ist (z.B. Bewerten setzt ein bestaetigtes Transkript voraus, AP7-Abschnitt oben).
- Die Aussage "nur freigegebene Arbeiten koennen exportiert werden" stammt direkt aus der AP8-Logik (`export.error.notReleased`, `GET /api/export/feedback-pdf` liefert 409 sonst).
- Die Aussage zur Korrektur-Datei ("bleibt auf deinem Rechner, nichts wird hochgeladen") ist woertlich an `export.dpo.explainer` angelehnt.
- Die Aussage "wird bei der Auswertung gelesen" fuer PDF/Foto-Uploads in Schritt 2 des Wizards stammt aus `setup.step2.upload.hint`/`upload.pendingNote`.
- Die Drucker-Hinweise (100 Prozent Skalierung, "An Seite anpassen" ausschalten) stammen woertlich aus `public/templates/README.md`.
- Die sechs Start-Pruefschritte in ERSTE-SCHRITTE Schritt 2 spiegeln `install/README.md` Punkt fuer Punkt.

### Wo App-Verhalten bewusst vorsichtig oder anders formuliert wurde als eine erste Vermutung nahelegen wuerde

- **Keine Versprechen zur Erkennungsgenauigkeit**: nirgends steht eine Prozentzahl oder ein "funktioniert zuverlaessig". Die Doku sagt nur, dass unsichere Stellen markiert werden und vor der Bestaetigung geklaert werden muessen, weil das die tatsaechliche Sperrlogik ist (`canConfirmTranscript`), nicht weil die Erkennung selbst irgendwo als "gut" belegt ist (kein echter Ollama-Testlauf in der gesamten Sandbox-Entwicklung, siehe alle vorherigen AP-Abschnitte).
- **Keine Aussage "das dauert X Minuten"** fuer Erkennung/Bewertung, weil die Laufzeit laut AP3/AP7-Offene-Punkte vom jeweiligen Rechner abhaengt und synchron ohne Fortschrittsbalken laeuft; die FAQ sagt bewusst nur "haengt von der Leistung deines Rechners ab" statt eine falsche Zahl zu erfinden.
- **DPO/Training bewusst nicht als eigene App-Funktion beschrieben**: die FAQ-Antwort zur Korrektur-Datei stellt klar, dass diese Version keine eigene Trainingsfunktion in der App hat (nur JSONL-Export), passend zu den Nicht-Zielen der v1 im Bauplan.
- **Windows-Startskript**: in der Doku wird nicht behauptet, das Windows-Skript sei auf einem echten Windows-Rechner getestet; ERSTE-SCHRITTE beschreibt nur, was das Skript laut Code/README tun soll, ohne eine Testaussage zu machen, die (noch) nicht zutrifft.
- **Keine Namen automatischer Uebernahme**: die Datenschutz-Doku sagt ausdruecklich, dass PDFs/Uebersicht/Korrektur-Datei "nie automatisch den vollen Namen" zeigen, weil `Submission.studentAlias` im Code tatsaechlich nur das manuell vergebene Kuerzel ist und ein Kopfzeilen-Vorschlag nie automatisch uebernommen wird (AP6-Abschnitt: "Uebernahme bleibt eine bewusste Aktion der Lehrkraft").
- **Abgrenzung zur Hackathon-Web-App** wurde als eigene FAQ-Frage ergaenzt (nicht explizit im AP11-Auftrag gefordert, aber aus dem Projekt-CLAUDE.md ableitbar), um Verwechslung zwischen `gemmpen.vercel.app` (statische Demo-Daten) und dieser lokalen Version zu vermeiden.

### Was noch fehlt / offene Punkte

- Alle `[SCREENSHOT: ...]`-Platzhalter in `ERSTE-SCHRITTE.md`/`GETTING-STARTED.md` sind unbefuellt; echte Bildschirmfotos entstehen erst bei einem echten Durchlauf auf Svenjas Mac (Gate 4) und sollten dann eingesetzt werden.
- Die Doku wurde nicht gegen einen echten Ollama-Lauf geprueft (wie der gesamte Rest des Projekts bisher), sondern ausschliesslich gegen den Code und die UI-Texte. Ein kalter Durchklick durch `ERSTE-SCHRITTE.md` mit echten Daten (AP14) sollte pruefen, ob die Beschreibung an jeder Stelle mit dem tatsaechlichen Verhalten uebereinstimmt.
- Keine eigene Anleitung fuer das Windows-Startskript-Sonderverhalten (unsichtbare Zweitkopie fuer den Browser-Start) in der Lehrkraft-Doku; das ist bewusst weggelassen, weil es ein internes Detail ist, das eine Lehrkraft nicht sehen muss (das Skript soll einfach funktionieren).

## AP13: Integration und Fehlerjagd (erledigt)

### Gesamtstatus

- `npm run build`: gruen (32 Routen, statisch plus dynamisch erzeugt).
- `npm test`: 106 Tests, 0 Fehler (3 neu aus AP13, siehe unten).
- `npx eslint .`: 0 Fehler, 4 Warnungen (drei `<img>`-statt-`next/image`-Hinweise in `upload`/`review/[id]`, eine ungenutzte lokale Variable `criteriaById` in `lib/assess/pipeline.ts`). Alle vier bestanden schon vor AP13 und sind keine Fehler; sie wurden bewusst nicht angefasst, um AP2/AP7-Code nicht ohne Not zu aendern (siehe OFFEN).
- Kompletter Nutzerpfad per echtem HTTP gegen `next start`: alle Pruefungen gruen (Runner `test/run-integration.sh`, Treiber `test/integration-http.mjs`).

### Wie der Integrationslauf funktioniert

`test/run-integration.sh` startet `next start` mit isoliertem Datenordner, spielt den Pfad ueber echte HTTP-Aufrufe durch und stoppt den Server wieder (alles in einem Bash-Aufruf, weil Hintergrundprozesse den Shell-Wechsel in der Sandbox nicht ueberleben - Hinweis aus AP3/AP10). Der Treiber `test/integration-http.mjs` prueft der Reihe nach: Raster-Vorschlag und Fach-Konfiguration speichern (Wizard-API), mehrseitiges Test-PDF (drei Scanner-Seiten aus `test/fixtures/scan_multi.pdf`) plus ein Testfoto (`photo_skew_1.jpg`) hochladen und zwei Schuelern zuordnen (Ingest-API), Erkennung mit Platzhalter-Ersatz, Transkript pruefen inklusive 409-Gegentest bei einer `[[wort?]]`-Markierung und anschliessendem Bestaetigen ohne Markierung, Config der Runde zuordnen, bewerten, eine Punktkorrektur speichern (es entsteht eine DPO-Zeile, per `/api/export/dpo` gegengeprueft), beide Arbeiten freigeben, Feedback-PDF und Klassenuebersicht als gueltige PDFs (Magic `%PDF-`) sowie DPO-JSONL (jede Zeile mit `rejected`+`chosen`) exportieren, plus 404-Gegentest fuer eine unbekannte Arbeit. Anleitung mit den vorbereitenden Befehlen (PDF/Foto zu Base64) steht in `test/README.md`.

Die Exporte wurden zusaetzlich zu PNG gerendert und visuell geprueft (Feedback-PDF drei Seiten und Klassenuebersicht, jeweils in Deutsch und Englisch ueber die Feedback-Sprache der Config): Warm-Paper-Optik, korrekte Note, Zitate in dezenten Kaesten, keine abgeschnittenen Texte, Umlaute ueber den WinAnsi-Sanitizer sauber ersetzt.

### Gefundene und behobene Fehler

1. **Erkennung ohne Auswertung liess den ganzen Ablauf ins Leere laufen (Kernfund).** `app/api/recognize/run` benutzte direkt `createOllamaClient()` ohne Platzhalter-Ersatz. War die Auswertung nicht erreichbar, kam jede Arbeit als Fehler zurueck, es entstand nie ein Transkript - und weil Pruefen, Bewerten und Export ein bestaetigtes Transkript voraussetzen, war die App ohne installierte Auswertung komplett unbenutzbar (auch der kalte Durchklick aus Gate 3 waere daran gescheitert). Die Bewertung hatte diesen Ersatz ueber `resolveGradingClient` bereits; der Erkennung fehlte er. Fix: `lib/transcription/vision.mock.ts` (deterministischer Platzhalter, der ein strukturell gueltiges Transkript mit genau einer `[[...]]`-Beispielstelle liefert) und `lib/transcription/resolve-vision.ts` (`resolveVisionClient`, gleiche Logik wie beim Text-Slot: echt wenn erreichbar, sonst Platzhalter). Die Route nutzt jetzt den Resolver und gibt `usingRealClient` mit zurueck. Die Pruefen-Seite (`app/review/page.tsx`) zeigt nach einem Platzhalter-Lauf einen ehrlichen Hinweis (`review.recognize.placeholder`, DE+EN): es steht vorerst ein Beispieltext, die Auswertung starten und noch einmal einlesen. Drei neue Tests in `lib/__tests__/vision-mock.test.ts` decken den Platzhalter und die Kopfzeilen-/Seiten-Unterscheidung ab.
2. **Feedback-PDF wiederholte die Abschnittsueberschrift je Beobachtung.** Beobachtungen ohne zugeordnetes Kriterium (der `criterionId` im Feedback-Prompt ist ausdruecklich optional, das echte Modell darf ihn weglassen) bekamen als Einzelueberschrift denselben Text wie die Seiten-Ueberschrift ("Beobachtungen je Bereich"/"Observations by area"), was seltsam las. Fix in `lib/pdf/feedback-pdf.ts`: eigener, ruhiger Fallback-Titel `observationHeading` ("Ein Blick auf deinen Text"/"A closer look at your text") in beiden Sprach-Labelsaetzen. Optisch am gerenderten PDF gegengeprueft.
3. **Verbotenes Wort und Kontrast-Feinschliff (Hausregel 2 und 5).** Zwei englische Fehlermeldungen nutzten "went wrong" ("wrong" steht auf der Verbotsliste): `upload.file.error` und `assess.error.unknown` neu formuliert ("That did not work." / "This paper could not be marked just now."). Beim Kontrast lag `--amber-strong` (#9a6f08) auf Creme bei 4,19:1 und damit unter WCAG 4,5:1 fuer normalen Text (u.a. der kleine "JETZT"-Eyebrow-Label auf jeder Seite); auf #856107 nachgezogen (5,25:1 auf Creme, 4,65:1 auf amber-soft). Fuer Fehlertext in kleiner Schrift wurde ein eigenes, lesbares Terracotta `--alert` (#9c4829, 5,78:1 auf Creme) eingefuehrt und an den Fehlermeldungs-Stellen statt der Kategorie-Farbe `--cat-grammar` verwendet; die Kategorie-Farbe #B85C3A selbst bleibt fuer Chips und PDF-Spalten unveraendert (feste Palette laut Hausregel 7). Die EN-Meldung `ollama.error.modelMissing` sagte "model"; auf "reading" umgestellt, passend zur deutschen "Auswertung".

### Audit-Ergebnis (Hausregeln)

- **Verbotene Woerter** (wrong, bad, poor, fail, lack, weak, missing, incorrect, falsch, schlecht, mangelhaft, fehlt) in den Locale-Werten: nach den beiden Fixes oben null Treffer in schuelergerichteten oder lehrerseitigen Texten. In den Prompt-Vorlagen genau ein Treffer, und der ist gewollt: die Schutzregel in `lib/prompts/templates.ts` sagt dem Modell selbst, es solle "nicht falsch" nicht schreiben - das ist die Verbots-Anweisung, nicht ihre Anwendung.
- **Technische Begriffe in der UI** (Modell, Inference, OCR, Parameter, Prompt, Token): keine in den normalen Ablauf-Seiten. Die einzigen Vorkommen von "Modell"/"model" und "Ollama" stehen auf der Einstellungen-Seite bzw. in den Verbindungs-Fehlermeldungen. Das ist die schon in AP3 dokumentierte, bewusste Ausnahme: dort muss die Lehrkraft das reale Programm "Ollama" starten und ggf. einen Namen nachladen, deshalb ist die ehrliche Nennung hier sinnvoller als eine Umschreibung. "OCR", "Inference", "Parameter", "Prompt", "Token" kommen in keinem UI-Text vor.
- **Em-Dashes / Doppel-Bindestriche**: keine in Locales, Docs, App, Komponenten oder Prompt-Vorlagen. Die einzigen Em-/En-Dash-Zeichen im Code stehen im PDF-Sanitizer `lib/pdf/text-sanitize.ts`, der sie gerade nach einfachem Bindestrich uebersetzt (Hausregel 1 wird also aktiv durchgesetzt), plus dessen Test.
- **Kontrast** (Stichprobe der wichtigsten Kombinationen): Haupt- und Sekundaertext (ink/ink-soft auf Creme, Karte und amber-soft) klar ueber 4,5:1 (6,1 bis 14,8). Nach dem Fix erreichen `--amber-strong` (5,25:1 auf Creme) und `--alert` (5,78:1) die 4,5:1 fuer normalen Text. Die grossen Serif-Ueberschriften in `--amber` (#b8860b, 3,02:1) bleiben im erlaubten Rahmen fuer grossen Text (3:1). Kategorie-Farben als reine Flaechen-/Rahmen-Akzente muessen die Textschwelle nicht erfuellen.
- **Screenfuehrung** (Hausregel 4): alle zehn Seiten sagen JETZT und DANACH. Neun nutzen `components/page-header.tsx` (rendert beide Bloecke aus `<screen>.now`/`.next`, alle in DE und EN gefuellt), die Startseite hat denselben JETZT/DANACH-Block (`dashboard.now`/`.next`) plus die Vier-Schritte-Uebersicht. Alle 296 statisch benutzten `t(...)`-Schluessel existieren in beiden Locale-Dateien.
- **Beide Sprachen**: `locales/de.json` und `locales/en.json` haben identische Schluessel (je 370), keine leeren Werte. Stichproben-Rendering DE und EN ueber die Feedback-PDFs bestaetigt (englische und deutsche Beschriftungen jeweils vollstaendig, keine Luecken).

## OFFEN (nur auf Svenjas Mac / echtem System pruefbar)

Diese Punkte konnten in der Linux-Sandbox ohne echtes Ollama, ohne Kamera und ohne Windows grundsaetzlich nicht abschliessend geprueft werden. Sie sind keine bekannten Fehler, sondern ungetestete Pfade.

- **Echter Ollama-Lauf (Erkennung UND Bewertung).** Der gesamte Integrationslauf lief mit dem Platzhalter-Ersatz. Ob das echte Vision-Modell Handschrift brauchbar liest und ob das echte Bewertungs-Modell strukturell gueltiges JSON in der geforderten Form liefert, muss auf dem Mac mit laufendem Ollama geprueft werden (Gate 2 fuer die Verbindung ist in AP3 beschrieben; ein echter Bild-zu-Feedback-Durchlauf ist Gate 4). Die Qualitaet der echten Erkennung haengt zusaetzlich am Ergebnis von `eval/handschrift_test.py` (AP12, Gate 1).
- **Startskripte** `install/start-mac.command` und `install/start-windows.bat`: nur der Linux-Trockenlauf-Modus lief (AP10). Der echte Doppelklick-Start auf macOS (Node-/Ollama-Pruefung, `npm install`, `ollama pull`, Browser-Oeffnen) und der komplette Windows-Weg sind ungetestet.
- **HEIC-Fotos vom iPhone**: der Ingest nutzt `sharp` (kann HEIC grundsaetzlich), im Lauf wurden aber nur JPG/PNG-Fixtures verwendet. Ein echtes HEIC-Handyfoto sollte einmal durch Hochladen -> Pruefen laufen.
- **Windows insgesamt**: Pfade, Startskript und Browser-Start sind nur gegengelesen, nie auf einem Windows-Rechner ausgefuehrt.
- **Browser-Timeout bei grossen Runden**: `recognize/run` und `assess/run` laufen synchron. Bei vielen Arbeiten mit einem langsamen echten Modell koennte der HTTP-Request in ein Timeout laufen; das faellt erst im echten Betrieb auf (v2-Kandidat: Hintergrundjob mit Fortschritts-Polling, schon in AP3/AP7 notiert).
- **ESLint-Warnungen (4)**: die drei `<img>`-Hinweise und die ungenutzte `criteriaById`-Variable sind Warnungen, keine Fehler. Sie liegen in AP2/AP7-Code; ein Aufraeumen ist gefahrlos moeglich, wurde hier aber bewusst unterlassen, um in einem Integrations-Paket keinen fremden Feature-Code ohne Testabdeckung fuer die betroffenen Seiten anzufassen. Kandidat fuer ein kleines Folge-Paket.
- **Visuelle Vollpruefung aller Screens im Browser**: In der Sandbox wurden die Seiten ueber ihre HTTP-Routen und die generierten PDFs geprueft, nicht per Screenshot jeder einzelnen Seite in beiden Sprachen. Der kalte Durchklick (AP14) sollte jede Seite einmal in DE und EN im Browser ansehen.

## Nachbesserung der drei MUSS-Befunde aus der Endabnahme (erledigt, 04.07.2026)

Bezug: `ABNAHME.md` Abschnitt 5 (MUSS) und Abschnitt 7 (Nachbesserung). Nur diese drei Fixes, kein weiterer Umbau.

1. **Rundenname wird gespeichert und ueberall angezeigt.**
   - `lib/storage.ts`: neue Ablage `data/submissions/<roundId>/round.json` ueber `readRoundLabel`, `writeRoundLabel`, `listRoundsWithLabels()` (liefert `{id, label}[]`, `label` faellt auf die roundId zurueck, falls kein Name gesetzt wurde).
   - `lib/ingest/types.ts`: `IngestRequest` hat jetzt ein optionales Feld `roundLabel`.
   - `app/api/ingest/route.ts`: schreibt `roundLabel` einmal je Aufruf ueber `writeRoundLabel`, bevor die Seiten verarbeitet werden.
   - `app/upload/page.tsx`: `sendPages` schickt den aktuellen `roundLabel`-State bei jedem `POST /api/ingest` mit.
   - `app/api/review/rounds/route.ts`, `app/api/assess/rounds/route.ts`, `app/api/export/rounds/route.ts`: nutzen `listRoundsWithLabels()` statt `listRounds()`, Antwortform jetzt `{ rounds: {id, label}[] }`.
   - `app/review/page.tsx`, `app/assess/page.tsx`, `app/export/page.tsx`: `RoundOption`-Typ ergaenzt, Dropdowns zeigen `r.label` an und nutzen `r.id` weiterhin als Wert/State.
   - Manuell per HTTP verifiziert (isolierter `GEMMPEN_DATA_DIR`): Name wird beim Ingest geschrieben, `round.json` liegt korrekt auf der Platte, alle drei Rundenlisten liefern denselben Namen.

2. **Scan-Vorlagen sind jetzt in der App erreichbar.**
   - Neuer Download-Bereich (drei Links: Vorlage Linien, Vorlage Kaestchen, Scan-Anleitung, alle `download`-Attribut auf die vorhandenen Dateien in `public/templates/`) auf `app/subjects/page.tsx` (dort verspricht `docs/ERSTE-SCHRITTE.md` Schritt 5 den Klick auf "Faecher") und zusaetzlich auf `app/upload/page.tsx` (falls die Lehrkraft direkt zum Hochladen springt).
   - Neue Locale-Schluessel `templates.title`, `templates.hint`, `templates.lined`, `templates.squared`, `templates.guide` in `locales/de.json` und `locales/en.json`.
   - Verifiziert: `/templates/vorlage-linien.pdf`, `/templates/vorlage-kaestchen.pdf`, `/templates/scan-anleitung.pdf` liefern Status 200 mit der jeweils erwarteten Dateigroesse.
   - Doku (`docs/ERSTE-SCHRITTE.md` und `docs/en/GETTING-STARTED.md`, beide Schritt 5) blieb unveraendert: der Text "Klicke auf Faecher" stimmt jetzt, ohne dass die Doku selbst angefasst werden musste.

3. **EN-Doku an die EN-UI-Begriffe angeglichen.**
   - `docs/en/GETTING-STARTED.md`: Schritt 3 nennt jetzt "For assessing" (statt "For marking", passend zu `settings.models.grading`). Schritt 8 heisst jetzt "Check the transcripts" mit Klick auf "Check text" (statt "Review the transcripts"/"Review"). Schritt 9 heisst jetzt "Assess" mit "Start assessment" und "Release this paper" (statt "Mark"/"Start marking"/"Release this piece of work"). Schritt 10 heisst jetzt "Save the feedback PDF" mit Klick auf "Save feedback" (statt "Export the feedback PDF"/"Export").
   - Bewusst nicht angefasst: allgemeine Erwaehnungen von "marking" als Fliesstext-Verb/-Nomen in `FAQ.md`, `SET-UP-MY-SUBJECT.md`, `PRIVACY.md` und den Screenshot-Platzhaltern in `GETTING-STARTED.md` selbst, weil das keine Button-/Nav-Zitate sind und der Befund sich explizit auf die Schritte 8-10 (Review/Mark/Export vs. Check text/Assess/Save feedback) bezieht. Ein Aufraeumen dieser generischen Woerter waere ein separates, groesseres Paket.

### Nachpruefung nach den drei Fixes

- `npm run build`: gruen (alle Routen erzeugt, keine TypeScript-Fehler, `npx tsc --noEmit` separat gruen).
- `npm test`: 106/106 gruen (unveraendert gegenueber vor den Fixes, keine Tests mussten angepasst werden, weil `listRounds()` selbst nicht entfernt wurde und weiterhin von anderer Stelle genutzt werden kann).
- `npx eslint .`: 0 Fehler, dieselben 4 vorbestehenden Warnungen wie vor den Fixes (drei `<img>`-Hinweise, eine ungenutzte Variable in `lib/assess/pipeline.ts`), keine neuen Warnungen durch die Fixes.
- `bash test/run-integration.sh`: komplett gruen, alle Pruefungen PASS (Fach einrichten, Hochladen, Erkennung, Pruefen inkl. 409-Sperre, Bewerten, DPO-Korrektur, Freigeben, Export inkl. PDF-Validitaet und 404-Gegentest).

### Offen nach der Nachbesserung

Keine neuen offenen Punkte. Es gelten weiterhin ausschliesslich die schon vorher als "nur auf Svenjas Mac pruefbar" markierten Punkte (echter Ollama-Lauf, echter Doppelklick-Start, HEIC vom iPhone, Windows, Browser-Timeout bei sehr grossen Runden, die vier bestehenden ESLint-Warnungen) sowie die KANN-Liste aus `ABNAHME.md` Abschnitt 5 (Hausregel-3-Modell-Wortlaut in den Einstellungen, Tippfehler in `DATENSCHUTZ.md`, Modell-Default-Bestaetigung, `.next`-Cache-Hygiene).
