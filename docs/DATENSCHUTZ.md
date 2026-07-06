# Datenschutz und deine Verantwortung

## Alles bleibt auf deinem Rechner

GemmPen Teacher läuft vollständig lokal. Es gibt keinen Cloud-Speicher, kein Nutzerkonto und keinen Server im Internet, an den Fotos, Texte, Bewertungen oder Feedback geschickt werden. Auch das Lesen der Handschrift und das Erstellen der Bewertung passiert direkt auf deinem Rechner, über das dort installierte Programm Ollama. Es verlässt nichts das Gerät.

Das gilt für den gesamten Ablauf:

- Fotos und Scans der Schülerarbeiten
- Die erkannten und von dir geprüften Texte
- Bewertungen, Begründungen und Zitate
- Feedback-Texte und die erzeugten PDFs
- Deine Korrekturen (als Datei, für die nächste Runde)

Alles liegt in einem Ordner namens `data`, direkt neben der App auf deinem Rechner.

## Wer ist verantwortlich (DSGVO)

"Verantwortlicher" im Sinne der Datenschutz-Grundverordnung (Art. 4 Nr. 7 DSGVO) ist, wer über Zweck und Mittel der Verarbeitung entscheidet. Für die mit GemmPen Teacher verarbeiteten Schülerdaten bist das **du als nutzende Lehrkraft, beziehungsweise deine Schule oder dein Schulträger**. Du entscheidest, welche Arbeiten du einliest, zu welchem Zweck du sie bewertest und wie lange du die Daten behältst.

Die Entwicklerin der App ist **nicht** Verantwortliche und **nicht** Auftragsverarbeiterin. Der Grund ist einfach: Die App läuft vollständig auf deinem Rechner. Es gibt keinen Server der Entwicklerin, keine Übermittlung von Daten an sie und keinen Fernzugriff. Die Entwicklerin bekommt zu keinem Zeitpunkt Schülerdaten zu sehen. Wo keine Daten fließen, gibt es auch keine Auftragsverarbeitung.

Was das für dich bedeutet: Die datenschutzrechtlichen Pflichten liegen bei dir beziehungsweise deiner Schule. Dazu gehören insbesondere

- die Rechtsgrundlage für die Verarbeitung,
- Information, Auskunft und Löschung gegenüber Schülerinnen, Schülern und Eltern,
- das Führen des Verzeichnisses von Verarbeitungstätigkeiten,
- und die Frage, ob die Verarbeitung auf dem genutzten (gerade auch privaten) Gerät überhaupt zulässig ist.

**Empfehlung:** Stimme den Einsatz vor der ersten echten Nutzung mit der Datenschutzbeauftragten deiner Schule ab. Das Verarbeiten von Schülerdaten auf privaten Geräten ist je nach Bundesland unterschiedlich geregelt, in Nordrhein-Westfalen zum Beispiel über die Verordnung über die zur Verarbeitung zugelassenen Daten von Schülerinnen, Schülern und Eltern (VO-DV I) und die schulischen Datenschutzvorgaben.

## Wo genau liegen die Daten

- `data/config`: deine Fach-Konfigurationen (Aufgabenstellung, Erwartungshorizont, Kriterien).
- `data/submissions`: die hochgeladenen Bilder, erkannten Texte, Bewertungen und Feedback-Entwürfe, geordnet nach Runde und Arbeit.
- `data/dpo`: deine Korrekturen als Datei, falls du welche vorgenommen hast.

Diese Ordner werden nicht automatisch mit einem Code-Verzeichnis oder einer Versionsverwaltung geteilt. Sie bleiben ausschließlich auf dem Rechner, auf dem du sie erzeugt hast.

## Deine Daten, deine Verantwortung

Weil alles nur auf deinem Rechner liegt und nichts in eine Cloud geht, hat niemand sonst Zugriff darauf. Das ist gut für den Datenschutz. Es heißt aber auch: Diese Daten zu schützen und rechtzeitig zu löschen, liegt allein bei dir. Es gibt keine Firma im Hintergrund, die das für dich übernimmt.

Die Dateien im Ordner `data` sind ganz normale Dateien auf deiner Festplatte. Wer deinen Rechner benutzt, kann sie öffnen. Deshalb hier die wichtigsten Punkte, mit denen du auf der sicheren Seite bist.

### So schützt du die Daten

- **Sichere deinen Rechner.** Schalte die Festplattenverschlüsselung ein (auf dem Mac heißt sie FileVault, unter Windows BitLocker). Nutze eine Bildschirmsperre mit Passwort. So sind die Daten geschützt, falls der Rechner verloren geht oder gestohlen wird.
- **Nur du am Gerät.** Nutze GemmPen Teacher auf einem Rechner, auf den nicht beliebige andere Personen frei zugreifen. Ein eigenes, mit Passwort geschütztes Benutzerkonto reicht schon.
- **Kürzel statt Namen.** Verwende auf den Blättern ein Kürzel statt des vollen Namens. Mehr dazu im nächsten Abschnitt.
- **Nicht in einen Cloud-Ordner legen.** Lege den App-Ordner und den Ordner `data` nicht in einen Ordner, der automatisch ins Internet synchronisiert wird, zum Beispiel OneDrive, iCloud Drive, Dropbox oder Google Drive. Sonst würden die Schülerdaten doch in die Cloud kopiert. (Falls jemand in den erweiterten Einstellungen den Speicherort der Daten ändert, gilt dasselbe: nicht auf einen Cloud- oder Sync-Ordner zeigen lassen.)
- **Mach dir selbst eine Sicherung.** Es gibt keine automatische Sicherung. Wenn du eine Kopie möchtest, lege sie selbst an, zum Beispiel auf einer verschlüsselten externen Festplatte.
- **Löschen, wenn du fertig bist.** Halte dich an die Aufbewahrungsregeln deiner Schule und lösche die Daten, wenn du sie nicht mehr brauchst. Wie das geht, steht weiter unten.

## Kürzel statt Namen

Trage in der Kopfzeile der Vorlage nicht den vollen Namen ein, sondern ein Kürzel (zum Beispiel die Initialen oder eine Schülernummer, die nur du zuordnen kannst). Feedback-PDFs, Klassenübersicht und Korrektur-Datei zeigen ebenfalls nur dieses Kürzel, nie automatisch den vollen Namen.

**Vor dem Fotografieren**: falls auf dem Blatt selbst zusätzlich der volle Name steht (zum Beispiel weil eine Schülerin ihn aus Gewohnheit dazuschreibt), decke ihn vor dem Fotografieren oder Scannen ab, oder streiche ihn sauber durch, damit er nicht mit aufs Bild kommt. Am einfachsten ist es, der Klasse von vornherein zu sagen: nur das Kürzel in die dafür vorgesehenen Kästchen, kein Name im Fließtext.

Die Liste, welches Kürzel zu welcher Person gehört, bleibt am besten getrennt von den Arbeiten und nur bei dir.

## Löschung

Willst du alle Daten einer Lerngruppe, einer Runde oder das gesamte Projekt löschen, reicht es, den entsprechenden Ordner unter `data` zu löschen:

- Eine einzelne Runde löschen: den Unterordner dieser Runde in `data/submissions` löschen.
- Alle Daten löschen: den gesamten Ordner `data` löschen.

Es gibt keine versteckte Kopie an anderer Stelle, keinen Papierkorb im Internet und keine automatische Sicherung in eine Cloud. Was gelöscht ist, ist weg. Lege dir deshalb, falls du Wert auf eine Sicherung legst, selbst eine eigene Kopie an einem Ort deiner Wahl an (zum Beispiel ein externes Laufwerk), bevor du löschst.

## Was außerhalb deines Rechners passiert

Nur die einmalige Einrichtung braucht Internet: das Herunterladen von Ollama und der Auswertung selbst, siehe [ERSTE-SCHRITTE.md](ERSTE-SCHRITTE.md). Diese Downloads laden ein allgemeines Programm bzw. eine allgemeine Auswertung herunter, keine Schülerdaten. Sobald das erledigt ist, funktioniert die eigentliche Arbeit mit echten Schülerarbeiten vollständig ohne Internetverbindung.
