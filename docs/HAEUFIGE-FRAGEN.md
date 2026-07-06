# Haeufige Fragen

## Was passiert mit den Daten der Schueler?

Alles bleibt auf deinem Rechner. Fotos, Scans, Transkripte, Bewertungen und Feedback-Texte liegen in einem Ordner `data` direkt neben der App. Es gibt keinen Cloud-Speicher, kein Konto und keinen Server, an den irgendetwas geschickt wird. Mehr dazu in `DATENSCHUTZ.md`.

## Kann ich dem Ergebnis vertrauen?

Die Auswertung liefert einen Vorschlag, keine endgueltige Entscheidung. Jede Punktzahl und jede Begruendung ist vor der Freigabe sichtbar und aenderbar. Du siehst zu jeder Begruendung die woertlichen Stellen aus dem Schuelertext, auf die sie sich stuetzt. Nichts wird an die Klasse verteilt, bevor du selbst auf "Arbeit freigeben" geklickt hast. Fuer neue Faecher oder Aufgabenarten lohnt sich die Kalibrierung im Einrichten-Assistenten (Schritt 5): dort siehst du vorab, wie nah die Auswertung an deiner eigenen Bewertung liegt.

## Was mache ich bei schlechter Handschrift-Erkennung?

Unsichere Woerter werden beim Lesen gelb markiert. Auf der Seite "Pruefen" siehst du das Scan-Bild und den erkannten Text nebeneinander. Klicke auf eine gelb markierte Stelle und korrigiere sie im Textfeld. Erst wenn keine unsichere Stelle mehr uebrig ist, kannst du die Arbeit bestaetigen. Solange etwas unklar ist, blockiert das Programm die Bestaetigung bewusst, damit keine falsch gelesene Stelle ungeprueft in die Bewertung geht.

## Funktioniert das fuer mein Fach?

Das Bewertungsraster ist frei einstellbar, nicht fest eingebaut. Im Einrichten-Assistenten legst du Fach, Aufgabenstellung, Erwartungshorizont und Kriterien selbst fest. Mitgeliefert sind Beispiel-Konfigurationen fuer Englisch (Comment), Deutsch (Eroerterung) und Wirtschaft (Fachtext), die du als Ausgangspunkt nutzen kannst. Voraussetzung ist ein Fach mit Freitext-Antworten: Rechenaufgaben, Formeln oder reine Multiple-Choice-Aufgaben unterstuetzt diese Version nicht.

## Kostet das etwas?

Nein. Die App laeuft komplett auf deinem eigenen Rechner, es gibt keine laufenden Kosten und keine Gebuehr pro Arbeit oder pro Klasse.

## Brauche ich Internet?

Nur fuer die einmalige Einrichtung (Herunterladen von Ollama und der Auswertung beim ersten Start). Danach funktioniert die tatsaechliche Arbeit, also Hochladen, Pruefen, Bewerten und Export, ohne Internetverbindung.

## Wie lange dauert die Auswertung?

Das Lesen der Handschrift und die Bewertung laufen auf deinem eigenen Rechner, deshalb haengt die Dauer von dessen Leistung ab. Bei einer ueblichen Klassengroesse (unter 40 Arbeiten) ist mit einigen Minuten fuer die gesamte Runde zu rechnen, je nach Rechner auch laenger. Waehrend eine Runde laeuft, zeigt die Seite einen laufenden Hinweis, das Fenster bleibt bedienbar.

## Was ist die Korrektur-Datei fuer die naechste Auswertungsrunde?

Wenn du beim Bewerten Punkte oder Texte aenderst, merkt sich das Programm jede echte Aenderung als ein Korrektur-Paar (der urspruengliche Vorschlag und deine Korrektur). Auf der Export-Seite kannst du diese Sammlung als Datei herunterladen. Sie bleibt auf deinem Rechner und wird nirgends automatisch hochgeladen. Diese Datei ist gedacht, um die Auswertung in einer spaeteren Trainingsrunde genauer zu machen. Diese Version legt keine eigene Trainingsfunktion in der App an, die Datei ist der Ausgangspunkt dafuer.

## Muss ich eine Vorlage benutzen?

Ja, fuer eine zuverlaessige automatische Erkennung. Die mitgelieferten Vorlagen (`public/templates`) tragen vier Eckmarker, an denen das Programm ein schraeges Foto gerade zieht und die Schreibzone zuschneidet. Ohne Vorlage, oder wenn die Marker auf einem Foto nicht erkannt werden, wird das Bild trotzdem uebernommen, die Erkennung kann dann aber ungenauer sein. Ein Hinweis dazu erscheint direkt in der Galerie beim Hochladen.

## Handyfoto oder Scanner, was ist besser?

Beides funktioniert. Ein Scan ist in der Regel gerader und gleichmaessiger belichtet, was die Erkennung erleichtert. Ein Handyfoto ist schneller gemacht, wenn kein Scanner zur Hand ist. Wichtig beim Foto: das ganze Blatt parallel fotografieren, gutes Licht, alle vier Eckmarker muessen sichtbar sein.

## Kann ich mehrere Klassen oder Faecher gleichzeitig nutzen?

Ja. Jede Fach-Konfiguration ist eigenstaendig und bleibt gespeichert. Auf der Seite "Faecher" siehst du alle Konfigurationen und kannst zwischen ihnen wechseln, duplizieren oder eine als Vorlage fuer eine neue Klasse verwenden.

## Was ist, wenn eine Arbeit mehrere Seiten hat?

Beim Hochladen kannst du mehrere Seiten demselben Schueler-Kuerzel zuordnen, auch als "diese und alle folgenden Seiten uebernehmen" in einem Klick. Alle Seiten einer Arbeit erscheinen danach beim Pruefen und Bewerten als eine zusammenhaengende Arbeit.

## Was ist, wenn Ollama nicht laeuft?

Die App zeigt in diesem Fall eine verstaendliche Meldung wie "Die Auswertung ist nicht erreichbar. Ist das Programm Ollama gestartet?" statt abzustuerzen. Die Startskripte versuchen zusaetzlich, Ollama beim Start automatisch zu oeffnen. Auf der Seite "Einstellungen" kannst du die Verbindung jederzeit erneut testen.

## Was, wenn ich beim Einrichten noch keine gute Idee fuer die Kriterien habe?

Trag ein, was eine gute Bearbeitung inhaltlich enthalten soll (den Erwartungshorizont), und klicke auf "Raster-Vorschlag erzeugen". Die Auswertung schlaegt dir daraufhin Kriterien mit Punkten und Beschreibung vor. Diesen Vorschlag kannst du komplett anpassen, Kriterien hinzufuegen oder entfernen.

## Verraet das Feedback die Loesung?

Das ist ausdruecklich nicht das Ziel. Die Feedback-Texte sind so angelegt, dass sie eine Staerke nennen, konkrete Beobachtungen mit Zitat aus dem eigenen Text zeigen, und einen naechsten Schritt vorschlagen, ohne die richtige Antwort direkt vorzugeben. Bestimmte Woerter (zum Beispiel "falsch", "schlecht", "fehlt") werden vor der Anzeige automatisch herausgefiltert. Trotzdem lohnt sich ein kurzer Blick vor der Freigabe, gerade am Anfang, bis du ein Gefuehl fuer den Ton bekommen hast.

## Kann ich die Formulierungen im Feedback selbst anpassen?

Ja. Jede Karte in der Bewerten-Ansicht ist ein Textfeld: Punktzahl, Begruendung und Feedback-Text sind direkt aenderbar, bevor du freigibst. Jede echte Aenderung wird zusaetzlich als Korrektur gespeichert (siehe oben).

## Was mache ich, wenn eine Schuelerin oder ein Schueler fehlt oder eine Seite falsch zugeordnet ist?

Beim Hochladen kannst du jede Seite einzeln loeschen oder neu zuordnen, solange sie noch nicht bestaetigt ist. Auf der Pruefen-Seite kannst du ein abweichendes Kuerzel aus dem Kopfzeilen-Vorschlag uebernehmen, falls die automatische Lesung der Kopfzeile nicht zur bisherigen Zuordnung passt.

## Muss ich jede Arbeit einzeln oeffnen?

Fuer das Pruefen und das Anpassen von Bewertungen ja, weil die Handschrift-Erkennung nie perfekt ist und eine Lehrkraft am Ende die Verantwortung fuer jede Note traegt. Das Starten der Erkennung und das Starten der Bewertung selbst laeuft dagegen fuer die ganze Runde auf einmal.

## Was, wenn ich die App auf einem anderen Rechner nutzen will?

Kopiere den ganzen Projektordner samt dem Ordner `data` auf den anderen Rechner und installiere dort Ollama sowie die benoetigten Modelle neu (siehe Startskript). Es gibt in dieser Version keinen automatischen Abgleich zwischen zwei Rechnern.

## Ist das dasselbe wie die Web-App GemmPen fuer den Hackathon?

Nein. GemmPen (die Webseite gemmpen.vercel.app) war die Hackathon-Einreichung mit vorbereiteten Beispieldaten. GemmPen Teacher ist die eigenstaendige, herunterladbare Version fuer den echten Einsatz im eigenen Unterricht, mit eigenem Fach, eigenem Bewertungsraster und echten Schuelerarbeiten.
