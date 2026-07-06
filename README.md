# gemmpen-teacher

Lokale Web-App fuer Lehrkraefte: Feedback zu handschriftlichen Arbeiten, alles auf dem eigenen Rechner. Kein Cloud-Dienst, keine Accounts. Details zum Produkt und die Arbeitspakete stehen in `../BAUPLAN_gemmpen-teacher.md`.

## Starten

```bash
npm install
npm run dev
```

Dann `http://localhost:3000` im Browser oeffnen.

Produktions-Build pruefen:

```bash
npm run build
```

## Stand

Aktuell steht das Geruest (AP0): Navigation, Seiten, Datentypen, Dateisystem-Speicher und die Sprachumschaltung DE/EN. Was fertig ist und was noch Platzhalter ist, steht in `UEBERGABE.md`. Diese Datei ist die Staffelstab-Datei fuer die folgenden Arbeitspakete.

## Struktur

- `app/` Seiten (App Router) und Navigation
- `components/` gemeinsame Bausteine (Nav, Seitenkopf, Platzhalter)
- `lib/` Datentypen, Dateisystem-Speicher, Sprachumschaltung
- `locales/` UI-Texte auf Deutsch und Englisch
- `data/` lokale Daten (Konfigurationen, Arbeiten, Korrektur-Paare); Inhalt bleibt auf dem Geraet
