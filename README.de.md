# GemmPen Teacher

*English version: [README.md](README.md)*

GemmPen Teacher hilft dir, deinen Schülerinnen und Schülern schriftliches Feedback zu handschriftlichen Arbeiten zu geben. Du fotografierst oder scannst die Arbeit. Die App liest sie, bewertet sie nach deinen eigenen Kriterien und schreibt einen ersten Feedback-Entwurf. Du prüfst alles und hast das letzte Wort. Am Ende druckst du für jede Person ein Feedback-Blatt.

Alles läuft auf deinem eigenen Rechner. Nichts wird ins Internet geschickt. Es gibt kein Konto und keine Kosten.

> Das ist eine frühe Version, geteilt zum Testen und für Rückmeldungen. Prüfe die Ergebnisse immer selbst und verlasse dich noch nicht für echte Noten darauf.

## Was du brauchst

- Einen Rechner (Mac oder Windows), auf dem die App installiert bleiben kann. Ein Rechner aus den letzten Jahren ist am besten. Du brauchst etwa 10 GB freien Speicher für den einmaligen Download.
- Rund 15 Minuten für die Einrichtung, plus diesen einmaligen Download.
- Internet nur für die erste Einrichtung. Danach läuft die App ohne Internet.

Du brauchst keine Programmierkenntnisse.

## In 3 Schritten starten

1. **Node.js installieren.** Öffne [nodejs.org](https://nodejs.org), lade die Version mit der Kennzeichnung "LTS" herunter und installiere sie wie jedes andere Programm.
2. **Ollama installieren.** Öffne [ollama.com](https://ollama.com) und lade es herunter. Ollama ist ein kostenloses Programm, das die Handschrift liest und die Arbeit bewertet, direkt auf deinem Rechner. Installiere es wie jedes andere Programm.
3. **GemmPen Teacher starten.** Öffne den App-Ordner, geh in den Ordner `install` und doppelklicke die Datei für dein System:
   - Mac: `start-mac.command`
   - Windows: `start-windows.bat`

Beim allerersten Mal zeigt dein Mac oder Windows hier eventuell eine einmalige Sicherheitswarnung. Sie kommt vom Betriebssystem, nicht von der App. Die [Erste-Schritte-Anleitung](docs/ERSTE-SCHRITTE.md) zeigt den einen Klick, der daran vorbeiführt.

Das Startfenster macht den Rest von allein. Es startet Ollama, lädt beim ersten Mal herunter, was es braucht, und öffnet dann die App im Browser. Der erste Start kann wegen dieses Downloads 10 bis 20 Minuten dauern. Lass das Fenster in dieser Zeit einfach offen. Jeder Start danach geht viel schneller.

Wenn eine Meldung erscheint, sagt sie dir immer, was als Nächstes zu tun ist. Nichts bricht still ab.

Ausführliche Anleitung mit Bildern: [Erste Schritte](docs/ERSTE-SCHRITTE.md).

## So funktioniert es, kurz gesagt

1. Ein Fach einmal einrichten: deine Aufgabe, dein Erwartungshorizont und deine Bewertungskriterien.
2. Die Vorlage drucken und die Klasse darauf schreiben lassen.
3. Die Arbeiten fotografieren oder scannen und hochladen.
4. Den erkannten Text prüfen. Alles, bei dem die App unsicher ist, wird für dich markiert.
5. Bewerten lassen, dann prüfen und anpassen. Jeden Punkt kannst du ändern.
6. Für jede Person ein Feedback-Blatt herunterladen.

Die App ist für textbasierte Fächer gemacht, zum Beispiel Englisch, Deutsch oder Wirtschaft. Sie ist nicht für Mathe, Formeln oder Multiple Choice gedacht.

## Deine Daten bleiben bei dir

Alle Schülerdaten bleiben in einem Ordner namens `data` auf deinem Rechner. Nichts wird irgendwohin hochgeladen. Dadurch liegt es auch in deiner Verantwortung, sie sicher aufzubewahren und zu löschen, wenn du sie nicht mehr brauchst. Der Datenschutz-Leitfaden erklärt das in einfachen Schritten: [Datenschutz und deine Verantwortung](docs/DATENSCHUTZ.md).

## Anleitungen

- [Erste Schritte](docs/ERSTE-SCHRITTE.md) - vom ersten Start bis zum fertigen Feedback-Blatt
- [Mein Fach einrichten](docs/MEIN-FACH-EINRICHTEN.md) - der Einrichtungs-Assistent in sechs Schritten
- [Datenschutz und deine Verantwortung](docs/DATENSCHUTZ.md) - wo deine Daten liegen und wie du sie schützt
- [Häufige Fragen](docs/HAEUFIGE-FRAGEN.md) - kurze Antworten auf häufige Fragen
- [Haftungsausschluss und Nutzungshinweise](docs/HAFTUNGSAUSSCHLUSS.md) - was die App leistet und wer wofür verantwortlich ist

## Rückmeldungen und Fragen

Ein Problem gefunden oder eine Frage? Öffne ein Issue auf GitHub. Weil das eine frühe Version ist, fließen deine Rückmeldungen direkt in die nächsten Verbesserungen ein.

## Rechtliches

**Wer ist verantwortlich?** GemmPen Teacher läuft vollständig auf deinem Rechner und schickt nichts ins Internet. Verantwortlicher im Sinne der DSGVO für die verarbeiteten Schülerdaten bist du als nutzende Lehrkraft beziehungsweise deine Schule, nicht die Entwicklerin der App. Die Entwicklerin bekommt keine Daten zu sehen und ist weder Verantwortliche noch Auftragsverarbeiterin. Einzelheiten und deine Pflichten stehen im [Datenschutz-Leitfaden](docs/DATENSCHUTZ.md).

**Bitte selbst prüfen.** Die App macht Vorschläge mit einem KI-Modell. Diese können falsch sein und ersetzen nicht deine eigene fachliche Bewertung. Prüfe erkannten Text, Punkte und Feedback immer selbst. Die Nutzung erfolgt auf eigene Verantwortung. Der vollständige [Haftungsausschluss](docs/HAFTUNGSAUSSCHLUSS.md) beschreibt das genauer.

**Keine Rechtsberatung.** Diese Unterlagen sind nach bestem Wissen erstellt, ersetzen aber keine rechtliche oder datenschutzrechtliche Prüfung im Einzelfall. Für den echten Einsatz an deiner Schule stimme dich mit der schulischen Datenschutzbeauftragten ab.

## Lizenz

GemmPen Teacher steht unter der MIT-Lizenz, siehe [LICENSE](LICENSE). Die Software wird ohne Gewähr bereitgestellt ("as is").
