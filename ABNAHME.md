# ABNAHME gemmpen-teacher (AP14, Endabnahme / Gate 4)

Stand: 04.07.2026. Rolle: kalte Lehrkraft, kein Vorwissen, folgt ausschliesslich `docs/ERSTE-SCHRITTE.md`.
Methode: Doku Schritt fuer Schritt gegen den echten App-Code und Locale-Dateien verifiziert, Startskript im Trockenlauf geprueft, kompletter Nutzerpfad ueber HTTP mit Mock-Ollama gelaufen. Keine Fixes in diesem Paket, nur Befund.

Wichtiger Vorbehalt zur Sandbox: Ollama laesst sich hier nicht installieren. Alle Aussagen zu echter Handschrift-Erkennung, echter Bewertung, echtem Modell-Download und dem physischen Doppelklick-Start bleiben auf Svenjas Mac zu pruefen (siehe Abschnitt "Nur auf Svenjas Mac pruefbar").

---

## 1. Befund pro Schritt der ERSTE-SCHRITTE.md

### Schritt 1: Ollama installieren
BESTANDEN. Anleitung korrekt, Link zu ollama.com stimmt, einmaliger Vorgang klar benannt.

### Schritt 2: GemmPen Teacher starten
BESTANDEN mit Anmerkung. `install/start-mac.command` und `start-windows.bat` liegen vor. Die sechs im Doku-Text genannten Pruefschritte stimmen exakt mit dem Skript ueberein: Node -> Ollama installiert -> Ollama laeuft (wird sonst automatisch per `ollama serve` gestartet) -> Modell geladen (sonst `ollama pull` mit dem 10-20-Minuten-Hinweis) -> Abhaengigkeiten (`npm install`) -> App bauen und Browser auf `localhost:3000` oeffnen. Jeder Fehlerfall endet mit einem "Was zu tun ist"-Block, nie mit stummem Abbruch. Anmerkung: Der Doku-Text ("prueft der Reihe nach") verspricht das korrekt; der echte Doppelklick-Start ist nur auf dem Mac pruefbar.

### Schritt 3: Einstellungen pruefen
BESTANDEN. Nav-Punkt heisst "Einstellungen" (stimmt). Der gruene Text lautet in der App "Die Auswertung ist erreichbar." (Doku: "Die Auswertung ist erreichbar" - passt). Knopf "Verbindung testen" existiert. Die zwei Namensfelder heissen "Fuer das Lesen der Handschrift" und "Fuer die Bewertung" (Doku: exakt so). Nicht-technische Lehrkraft kommt hier weiter.
Anmerkung Hausregel 3: Auf dieser Seite tauchen drei Mal "Modell/Modelle" auf (`settings.connection.modelsFound`, `settings.connection.noModels`, `settings.models.defaultsNotice`). Hausregel 3 verbietet "Modell" in der UI. Deviation ist auf die Einstellungen-Seite begrenzt und im Kontext (Lehrkraft aendert Modellnamen) verstaendlich, sollte aber vermerkt werden.

### Schritt 4: Ein Fach einrichten
BESTANDEN. Nav-Punkt "Einrichten" stimmt. Der Assistent hat tatsaechlich sechs Schritte (`TOTAL_STEPS = 6`), die Titel stimmen mit der Doku-Aufzaehlung ueberein (Fach und Rahmen / Aufgabenstellung / Erwartungshorizont und Raster / Notensystem und Feedback-Stil / Beispielarbeiten / Zusammenfassung). Verweis auf `MEIN-FACH-EINRICHTEN.md` und "erscheint danach unter Faecher" korrekt.

### Schritt 5: Vorlage drucken
NICHT BESTANDEN (Doku-vs-App-Widerspruch, Sackgasse). Die Doku sagt woertlich: "Klicke auf 'Faecher' oder oeffne den Ordner `public/templates`. Dort liegen zwei druckfertige Vorlagen ...". Die Vorlagen liegen tatsaechlich in `public/templates/` (`vorlage-linien.pdf`, `vorlage-kaestchen.pdf`, `scan-anleitung.pdf` sind vorhanden). ABER die "Faecher"-Seite (`app/subjects/page.tsx`) zeigt ausschliesslich die Liste der Fach-Konfigurationen und hat keinerlei Verweis, Link oder Download zu den Vorlagen (`subjects.now` = "Waehle ein Fach aus oder richte ein neues ein."). Eine nicht-technische Lehrkraft, die dem Satz "Klicke auf Faecher" folgt, findet dort keine Vorlagen und weiss nicht, was der Ordner `public/templates` ist oder wo er liegt. Das ist ein echter Stopp fuer die Zielgruppe.
Fundstelle: `docs/ERSTE-SCHRITTE.md` Schritt 5 vs. `app/subjects/page.tsx`. Gleiches Problem in `docs/en/GETTING-STARTED.md` Step 5.

### Schritt 6: Arbeiten schreiben lassen und einsammeln
BESTANDEN. Handyfoto- und Scanner-Weg korrekt beschrieben, Verweis auf `scan-anleitung.pdf` (existiert) und `DATENSCHUTZ.md` stimmig.

### Schritt 7: Hochladen
NICHT BESTANDEN (Funktions-vs-Doku-Widerspruch). Die Doku sagt: "Gib der Runde einen Namen (zum Beispiel 'IAF31 - 2026-05-12')." In der App existiert das Feld "Name fuer diesen Stapel" (`upload.round.label`), ABER der eingegebene Name (`roundLabel`) wird nur im lokalen Component-State gehalten und niemals an den Server geschickt oder gespeichert. Die Runde wird stattdessen durch eine automatisch erzeugte Kennung wie `runde-20260504-0855` identifiziert (`makeRoundId()` in `app/upload/page.tsx`), und genau diese Kennung erscheint spaeter in den Auswahllisten auf Pruefen, Bewerten und Export (dort wird der rohe `roundId` als `{r}` sowohl als Wert als auch als Anzeige gerendert). Die Lehrkraft vergibt also einen sprechenden Namen, der danach spurlos verschwindet, und findet die Runde spaeter nur unter einem Zeitstempel-Code wieder. Das untergraebt die Doku-Zusage "So findest du die Arbeiten spaeter wieder" (`upload.round.hint`).
Fundstelle: `app/upload/page.tsx` (Zeilen 53-54, 74, `roundLabel` ohne Sende-Pfad), `app/api/ingest/route.ts` (kein Label-Feld), `lib/storage.ts` (kein Round-Anzeigename). Nicht in der UEBERGABE-OFFEN-Liste vermerkt.
Der uebrige Schritt 7 (Galerie, Kopfzeilen-Ausschnitt, "Vorlage erkannt"/"Vorlage nicht erkannt"-Hinweis, Zuordnung, "fuer folgende Seiten uebernehmen") stimmt mit der App ueberein.

### Schritt 8: Transkripte pruefen
BESTANDEN. Nav "Pruefen" stimmt. "Erkennung starten" existiert. Split-View, gelbe Markierung unsicherer Stellen, zeilenweises Editieren und die harte Bestaetigungs-Sperre stimmen: der Bestaetigen-Knopf ist deaktiviert, solange `[[wort?]]`-Markierungen offen sind, und der Server weist ein vorzeitiges Bestaetigen mit 409 ab (per HTTP verifiziert). Doku-Zusage "Erst wenn keine unsichere Stelle mehr uebrig ist, kannst du die Arbeit bestaetigen" ist korrekt umgesetzt.

### Schritt 9: Bewerten
BESTANDEN. Nav "Bewerten" stimmt. "Fach-Konfiguration ... Uebernehmen", "Bewertung starten", editierbare Karten (Punkte, Begruendung mit Zitaten, Feedback-Entwurf mit Staerke/Beobachtung/naechster Schritt/Uebungsvorschlag), reaktive Gesamtnote, "Aenderungen sichern" und "Arbeit freigeben" existieren mit exakt diesen Beschriftungen. Per HTTP verifiziert: Bewertungskette erzeugt Karten, eine Punkt-/Textaenderung erzeugt eine DPO-Zeile, Note reagiert, Freigabe wechselt den Status. Verbotswort-Schutz greift (kein Verbotswort im generierten Text).

### Schritt 10: Feedback-PDF exportieren
BESTANDEN mit kleiner Anmerkung. Nav-Punkt heisst in der App "Export" (Doku: "Klicke auf Export" - passt). "Feedback-Blaetter herunterladen", einzeln und "Alle Feedback-Blaetter herunterladen", Klassenuebersicht-PDF und Korrektur-Datei existieren. Per HTTP verifiziert: gueltiges dreiseitiges Feedback-PDF (3050 Bytes), gueltige Klassenuebersicht (1780 Bytes), DPO-JSONL mit gueltigen Zeilen (rejected+chosen), 404 fuer unbekannte Arbeit, 409/Sperre fuer nicht freigegebene Arbeit.
Anmerkung: Der Seitentitel lautet intern "Feedback speichern" (`export.title`), waehrend der Nav-Punkt "Export" heisst. Innerhalb der deutschen Fassung ist das unkritisch, weil die Doku "Export" sagt und der Nav-Punkt "Export" heisst - der Titel auf der Seite weicht nur leicht ab.

---

## 2. Befund zur Definition of Done (Gesamtprojekt)

### (a) App startet ueber das Startskript
TEILWEISE / nur trockengeprueft. Der Trockenlauf `bash install/start-mac.command check` laeuft an, findet Node (v22), und bricht dann korrekt an Schritt 2 ab, weil in der Sandbox kein Ollama installiert ist - mit sauberer "Was zu tun ist"-Meldung. Das ist das RICHTIGE Verhalten fuer einen Rechner ohne Ollama, bedeutet aber, dass der Trockenlauf in der Sandbox die spaeteren Pruefschritte (Modell-Check, npm install, Build/Start) nicht durchlaufen kann. Der echte Start bleibt Svenjas Mac-Test. Die Skript-Logik selbst ist vollstaendig und kommentiert und deckt alle in der Doku versprochenen Schritte ab.

### (b) Kompletter Durchlauf ohne Vorwissen moeglich
TEILWEISE BESTANDEN. Technisch laeuft der gesamte Pfad (Upload -> Erkennung -> Pruefen mit 409-Sperre -> Bewerten -> DPO -> Freigeben -> PDF-Export) sauber durch, das habe ich end-to-end ueber echtes HTTP mit Mock-Ollama bestaetigt (`test/run-integration.sh`, alle Pruefungen gruen). ABER: eine kalte Lehrkraft ohne Vorwissen laeuft an zwei Stellen in eine Sackgasse - Schritt 5 (Vorlagen sind nicht ueber "Faecher" erreichbar, nur ueber einen unerklaerten Datei-Ordner) und Schritt 7 (der vergebene Rundenname verschwindet, die Runde erscheint spaeter als Zeitstempel-Code). Beides ist kein Absturz, aber beides sind Stolperstellen genau fuer die nicht-technische Zielgruppe.

### (c) Jeder Screen sagt was JETZT zu tun ist und was DANACH kommt
BESTANDEN. Alle geprueften Seiten (Start, Einrichten, Faecher, Hochladen, Pruefen, Bewerten, Export, Einstellungen) tragen ein JETZT/DANACH-Paar bzw. eine klare naechste Aktion. Der Wizard hat Fortschrittsanzeige und eine Weiter-Aktion pro Schritt. Hausregel 4 ist durchgehalten.

### Zusatzpruefungen
- i18n: `locales/de.json` und `locales/en.json` haben identische Schluessel (je 370), keine Luecken. Automatik-Check `check_i18n.py` findet keine hartkodierten UI-Strings.
- Verbotene Woerter (Hausregel 2): 0 Treffer in DE, 0 Treffer in EN.
- Em-Dashes / Doppel-Bindestriche (Hausregel 1): 0 Treffer in beiden Locale-Dateien.
- Technische Begriffe (Hausregel 3): nur die drei "Modell"-Vorkommen auf der Einstellungen-Seite (siehe Schritt 3).
- Build: `npm run build` laeuft gruen (das vorhandene `.next` war ein veralteter, unvollstaendiger Artefakt-Cache ohne `pages-manifest.json`; ein sauberer Rebuild loest das - siehe Restliste KANN).

---

## 3. Stichprobe englische Fassung (docs/en + EN-UI)

NICHT BESTANDEN (systematischer Doku-vs-UI-Bruch beim Vokabular). Die EN-Doku wurde nach der deutschen Wortlogik geschrieben, waehrend die EN-UI eine andere Vokabelwahl trifft. Ergebnis: die englische Lehrkraft sucht mehrfach nach Beschriftungen, die es so nicht gibt.

Konkrete Fundstellen (docs/en/GETTING-STARTED.md gegen locales/en.json):
- Step 8 "Click **Review**" -> Nav-Punkt heisst "Check text" (`nav.review`).
- Step 9 "Click **Mark**" -> Nav-Punkt heisst "Assess" (`nav.assess`).
- Step 9 "Start marking" -> Knopf heisst "Start assessment" (`assess.run.start`).
- Step 9 "Release this piece of work" -> Knopf heisst "Release this paper" (`assess.detail.release`).
- Step 10 "Click **Export**" -> Nav-Punkt heisst "Save feedback" (`nav.export`).
- Step 3 "For marking" -> Feld heisst "For assessing" (`settings.models.grading`).

Der Bruch ist konsistent: "mark/marking/Review/Export" in der Doku vs. "assess/assessment/Check text/Save feedback" in der UI. Einzelne Knopf-Labels stimmen (Start recognition, Save changes, Save configuration, Use this), aber die tragenden Navigations- und Aktionsbegriffe fuer die Schritte 8-10 stimmen nicht. Zusaetzlich vererbt die EN-Fassung den Schritt-5-Sackgassen-Fehler (Templates ueber "Subjects" nicht erreichbar).
Hausregeln in EN eingehalten: 0 Verbotswort-Treffer, keine Em-Dashes.

---

## 4. Uebrige Doku-Dateien auf Widersprueche zur App

### MEIN-FACH-EINRICHTEN.md
BESTANDEN. Sechs Schritte stimmen mit dem Wizard ueberein. "Raster-Vorschlag erzeugen" (`setup.step3.generate`), "Kalibrierung starten" (`setup.step5.run`), "Konfiguration speichern" (`setup.step6.save`) existieren mit exakt diesen Beschriftungen. Die Kalibrier-Einordnung (Nah / Spuerbar / Deutlich) und der Testlauf-Hinweis bei nicht erreichbarer Auswertung entsprechen der App-Logik. Beispiel-Konfigurationen (Englisch Comment, Deutsch Eroerterung, Wirtschaft Fachtext) sind vorhanden.

### HAEUFIGE-FRAGEN.md
BESTANDEN mit einer Anmerkung. Inhaltlich konsistent: Datenschutz, Vertrauen/Vorschlag-Charakter, CRE-Sonderregel, Filterung von Verbotswoertern, Mehrseitigkeit, Ollama-nicht-erreichbar-Meldung, keine In-App-Trainingsfunktion. Kleine Ungenauigkeit: Die FAQ verweist auf `public/templates` als Ordnerpfad - das ist ehrlich (es ist wirklich nur ein Ordner), verstaerkt aber genau das Schritt-5-Problem, weil auch hier kein In-App-Weg zu den Vorlagen genannt werden kann. Keine falschen Versprechen.

### DATENSCHUTZ.md
BESTANDEN mit Tippfehler. Aussagen stimmen mit der Architektur ueberein (alles lokal, Ordner `data/config`, `data/submissions`, `data/dpo`, Loeschung per Ordner-Loeschen, Kuerzel statt Namen, nur Einrichtung braucht Internet). Ein Tippfehler: "gepruepften" statt "geprueften" (Abschnitt "Das gilt fuer den gesamten Ablauf"). Kosmetisch.

---

## 5. Priorisierte Restliste

### MUSS vor dem ersten Pilotlehrer behoben werden
1. **Rundenname wird nicht gespeichert (Schritt 7).** Das Feld "Name fuer diesen Stapel" persistieren und in den Auswahllisten (Pruefen/Bewerten/Export) statt des Zeitstempel-Codes anzeigen. Ohne das verliert die Lehrkraft die Orientierung ueber ihre Runden - genau die Zusage, die das Feld macht. `app/upload/page.tsx`, Ingest-Route, Storage, drei Rundenauswahl-Dropdowns.
2. **Vorlagen sind ueber "Faecher" nicht erreichbar (Schritt 5).** Entweder auf der Faecher- oder Hochladen-Seite einen echten In-App-Download/Link zu den zwei Vorlagen und der Scan-Anleitung ergaenzen (bevorzugt), oder die Doku (DE und EN) korrigieren, sodass sie keinen Klick auf "Faecher" verspricht, sondern den echten Weg beschreibt. Aktuell ist es eine Sackgasse fuer die Zielgruppe.
3. **Englische Doku an die englische UI angleichen (Abschnitt 3).** GETTING-STARTED (EN) auf die tatsaechlichen Nav- und Knopfbegriffe umstellen: Check text, Assess, Start assessment, Release this paper, Save feedback, For assessing. Sonst laeuft jede englischsprachige Lehrkraft in den Schritten 8-10 in Fehlgriffe.

### KANN spaeter
4. Hausregel-3-Deviation: die drei "Modell/Modelle"-Vorkommen auf der Einstellungen-Seite durch "Auswertung" o.ae. ersetzen.
5. Doku Schritt 2: klarstellen, dass Schritt-3 (Ollama laeuft) automatisch gestartet wird - der Doku-Text nummeriert die sechs Skript-Pruefungen leicht anders als die Bildschirmausgabe ("Schritt X von 6"); harmlos, aber angleichbar.
6. Tippfehler "gepruepften" -> "geprueften" in DATENSCHUTZ.md.
7. Modell-Defaults (`gemma3:12b` fuer vision und grading) sind weiterhin "ZU BESTAETIGEN durch Svenja" (Gate 2). Vor der Weitergabe fixieren.
8. Veralteten `.next`-Cache im Repo bereinigen bzw. sicherstellen, dass das Startskript bei fehlendem/kaputtem Build sauber neu baut (der Build selbst ist gruen, nur ein alter Teil-Cache stiftete Verwirrung).

---

## 6. Gesamturteil

BEDINGT ABGENOMMEN - noch nicht pilotreif. Das Fundament ist solide: der komplette technische Pfad laeuft end-to-end fehlerfrei durch, das Startskript deckt alle versprochenen Schritte ab, i18n ist vollstaendig, die Hausregeln fuer Ton und Verbotswoerter sind bis auf einen kleinen Rest eingehalten, und die meisten Doku-Schritte stimmen wortgenau mit der App ueberein. Die kalte Lehrkraft scheitert aber an zwei Stellen der deutschen Anleitung (Vorlagen ueber "Faecher", verschwindender Rundenname) und die englische Anleitung passt in den entscheidenden Bewerten-/Export-Schritten nicht zur englischen Oberflaeche. Das sind keine Abstuerze, aber es sind genau die Reibungspunkte, die eine nicht-technische Person alleine ausbremsen. Nach Behebung der drei MUSS-Punkte ist das Produkt aus Sicht des kalten Durchklicks pilotreif.

### Nur auf Svenjas Mac pruefbar (bleibt offen)
- Echter Doppelklick-Start von `start-mac.command` bis Browser auf `localhost:3000`.
- Echte Handschrift-Erkennung und echte Bewertung mit laufendem Ollama (Qualitaet, Dauer, Format der `[[wort?]]`-Markierungen).
- Echter Modell-Download beim ersten Start (10-20-Minuten-Hinweis) und Bestaetigung der Default-Modellnamen.
- Windows-Startskript (in dieser Umgebung nur gegengelesen, nie ausgefuehrt).
- Gate 4 laut Bauplan: ein kompletter Durchlauf Foto/Scanner-PDF bis Feedback-PDF mit einer echten Arbeit auf dem Mac.

---

## 7. Nachbesserung (04.07.2026)

Alle drei MUSS-Befunde aus Abschnitt 5 behoben. Kein weiterer Umbau, nur die drei Fixes.

1. **Rundenname wird jetzt gespeichert und angezeigt.** Neue Ablage `data/submissions/<roundId>/round.json` (`readRoundLabel`/`writeRoundLabel`/`listRoundsWithLabels` in `lib/storage.ts`). Die Hochladen-Seite (`app/upload/page.tsx`) schickt `roundLabel` mit jedem `POST /api/ingest`; die Route schreibt den Namen einmal je Runde (`app/api/ingest/route.ts`). Die drei Rundenauswahl-Routen (`app/api/review/rounds/route.ts`, `app/api/assess/rounds/route.ts`, `app/api/export/rounds/route.ts`) liefern jetzt `{ rounds: {id, label}[] }` statt `string[]`; die drei Dropdowns (`app/review/page.tsx`, `app/assess/page.tsx`, `app/export/page.tsx`) zeigen `label` an und nutzen `id` weiterhin intern als Wert. Ohne gespeicherten Namen bleibt die technische roundId (Zeitstempel-Code) der Fallback-Anzeigename, wie in der Doku-Zusage angelegt. Manuell per HTTP verifiziert: Name wird geschrieben, erscheint identisch in allen drei Listen.

2. **Vorlagen sind jetzt in der App erreichbar.** Neuer Download-Bereich mit den drei Dateien aus `public/templates/` (Vorlage Linien, Vorlage Kaestchen, Scan-Anleitung) auf der Faecher-Seite (`app/subjects/page.tsx`, dort verspricht die Doku den Klick) und zusaetzlich auf der Hochladen-Seite (`app/upload/page.tsx`). Neue Locale-Schluessel `templates.*` in `locales/de.json` und `locales/en.json`. Per HTTP verifiziert: alle drei PDFs unter `/templates/...` mit Status 200 erreichbar.

3. **EN-Doku an die EN-UI angeglichen.** `docs/en/GETTING-STARTED.md` Schritte 8-10 und der Modellname in Schritt 3 nutzen jetzt die tatsaechlichen UI-Begriffe aus `locales/en.json`: "Check text" (Schritt 8, statt "Review"), "Assess" / "Start assessment" / "Release this paper" (Schritt 9, statt "Mark" / "Start marking" / "Release this piece of work"), "Save feedback" (Schritt 10, statt "Export"), "For assessing" (Schritt 3, statt "For marking"). Screenshot-Platzhalter-Bildunterschriften und allgemeine Fliesztext-Erwaehnungen von "marking" ausserhalb von Button-/Nav-Zitaten wurden bewusst nicht angefasst (kein UI-Zitat, ausserhalb des Befunds).

Nachpruefung: `npm run build`, `npm test` (106/106 gruen) und `npx eslint .` (0 Fehler, 4 vorbestehende Warnungen ohne Bezug zu diesen Aenderungen) laufen gruen. `bash test/run-integration.sh` laeuft komplett gruen (alle Pruefungen PASS). Offen bleiben ausschliesslich die bereits vorher als "nur auf Svenjas Mac pruefbar" markierten Punkte oben sowie die KANN-Liste aus Abschnitt 5.
