# Datenschutz

## Alles bleibt auf deinem Rechner

GemmPen Teacher laeuft vollstaendig lokal. Es gibt keinen Cloud-Speicher, kein Nutzerkonto und keinen Server im Internet, an den Fotos, Texte, Bewertungen oder Feedback geschickt werden. Auch das Lesen der Handschrift und das Erstellen der Bewertung passiert direkt auf deinem Rechner, ueber das dort installierte Programm Ollama. Es verlaesst nichts das Geraet.

Das gilt fuer den gesamten Ablauf:

- Fotos und Scans der Schuelerarbeiten
- Die erkannten und von dir gepruepften Texte
- Bewertungen, Begruendungen und Zitate
- Feedback-Texte und die erzeugten PDFs
- Deine Korrekturen (die Korrektur-Datei fuer die naechste Auswertungsrunde)

Alles liegt in einem Ordner namens `data`, direkt neben der App auf deinem Rechner.

## Wo genau liegen die Daten

- `data/config`: deine Fach-Konfigurationen (Aufgabenstellung, Erwartungshorizont, Kriterien).
- `data/submissions`: die hochgeladenen Bilder, erkannten Texte, Bewertungen und Feedback-Entwuerfe, geordnet nach Runde und Arbeit.
- `data/dpo`: deine Korrekturen als Datei, falls du welche vorgenommen hast.

Diese Ordner werden nicht automatisch mit einem Code-Verzeichnis oder einer Versionsverwaltung geteilt. Sie bleiben ausschliesslich auf dem Rechner, auf dem du sie erzeugt hast.

## Kuerzel statt Namen

Trage in der Kopfzeile der Vorlage nicht den vollen Namen ein, sondern ein Kuerzel (zum Beispiel die Initialen oder eine Schuelernummer, die nur du zuordnen kannst). Feedback-PDFs, Klassenuebersicht und Korrektur-Datei zeigen ebenfalls nur dieses Kuerzel, nie automatisch den vollen Namen.

**Vor dem Fotografieren**: falls auf dem Blatt selbst zusaetzlich der volle Name steht (zum Beispiel weil eine Schuelerin ihn aus Gewohnheit dazuschreibt), decke ihn vor dem Fotografieren oder Scannen ab, oder streiche ihn sauber durch, damit er nicht mit aufs Bild kommt. Am einfachsten ist es, der Klasse von vornherein zu sagen: nur das Kuerzel in die dafuer vorgesehenen Kaestchen, kein Name im Fliesstext.

## Loeschung

Willst du alle Daten einer Lerngruppe, einer Runde oder das gesamte Projekt loeschen, reicht es, den entsprechenden Ordner unter `data` zu loeschen:

- Eine einzelne Runde loeschen: den Unterordner dieser Runde in `data/submissions` loeschen.
- Alle Daten loeschen: den gesamten Ordner `data` loeschen.

Es gibt keine versteckte Kopie an anderer Stelle, keinen Papierkorb im Internet und keine automatische Sicherung in eine Cloud. Was geloescht ist, ist weg. Lege dir deshalb, falls du Wert auf eine Sicherung legst, selbst eine eigene Kopie an einem Ort deiner Wahl an (zum Beispiel ein externes Laufwerk), bevor du loeschst.

## Was ausserhalb deines Rechners passiert

Nur die einmalige Einrichtung braucht Internet: das Herunterladen von Ollama und der Auswertung selbst, siehe `ERSTE-SCHRITTE.md`. Diese Downloads laden ein allgemeines Programm bzw. eine allgemeine Auswertung herunter, keine Schuelerdaten. Sobald das erledigt ist, funktioniert die eigentliche Arbeit mit echten Schuelerarbeiten vollstaendig ohne Internetverbindung.
