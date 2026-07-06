# Ergebnis: Machbarkeitstest Handschrifterkennung (AP12)

Modus: MOCK-Lauf (simulierte Antworten, keine echte Ollama-Erkennung)
Anzahl ausgewerteter Schueler: 6

## Gesamtergebnis

- Wortfehlerrate (WER) gesamt: **34.8%**
- Zeichenfehlerrate (CER) gesamt: **9.5%**
- Einschaetzung: **Pivot auf getippte Texte empfohlen**

## Ergebnis pro Prompt-Variante

| Variante | WER | CER | Anzahl Messungen | Einschaetzung |
|---|---|---|---|---|
| roh | 43.8% | 12.8% | 6 | Pivot auf getippte Texte empfohlen |
| kontext | 26.8% | 6.7% | 6 | Pivot auf getippte Texte empfohlen |
| zeilenweise | 33.9% | 9.0% | 6 | Pivot auf getippte Texte empfohlen |

Beste Variante (niedrigste WER): **kontext**

## Ergebnis pro Schueler

| Schueler | WER (Durchschnitt ueber Varianten) | CER (Durchschnitt) | Einschaetzung |
|---|---|---|---|
| IAF31-EK4-002 | 38.8% | 10.1% | Pivot auf getippte Texte empfohlen |
| IAF31-EK4-003 | 35.5% | 10.2% | Pivot auf getippte Texte empfohlen |
| IAF31-EK4-004 | 35.2% | 9.3% | Pivot auf getippte Texte empfohlen |
| IAF32-EK4-002 | 32.4% | 9.0% | Pivot auf getippte Texte empfohlen |
| IAF32-EK4-003 | 32.3% | 8.2% | Pivot auf getippte Texte empfohlen |
| IAF32-EK4-004 | 34.8% | 9.9% | Pivot auf getippte Texte empfohlen |

## Interpretation nach Schwellen

Festgelegte Schwellen fuer die Entscheidung (siehe BAUPLAN_gemmpen-teacher.md, Gate 1):

- unter 5% WER: **pilotfaehig**, Handschrifterkennung kann direkt eingesetzt werden
- 5-15% WER: **nur mit Schueler-Selbstpruefung des Transkripts** (Schueler bestaetigt/korrigiert das erkannte Transkript, bevor bewertet wird)
- ueber 15% WER: **Pivot auf getippte Texte empfohlen** (Handschrifterkennung ist noch nicht zuverlaessig genug fuer den produktiven Einsatz)

**Empfehlung fuer dieses Ergebnis:** Die gemessene Fehlerrate liegt ueber 15%. Empfehlung: Handschrifterkennung in dieser Form nicht produktiv einsetzen. Pivot pruefen auf getippte Schuelertexte (z.B. Abschreiben lassen oder direkte Texteingabe) als Eingangsweg, bis bessere Vision-Modelle oder mehr Bildvorverarbeitung (Kontrastanpassung, Entzerrung) zur Verfuegung stehen.

## Hinweis

Dies ist ein MOCK-Lauf zur Pruefung der Auswertungslogik (kuenstlich verfaelschte Ground-Truth-Texte als simulierte Modellantworten). Die Zahlen oben sind NICHT das echte Testergebnis. Fuer das echte Ergebnis: `python3 handschrift_test.py --model <vision-modell>` mit laufendem Ollama ausfuehren.
