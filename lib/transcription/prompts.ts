/*
  Prompt-Vorlagen fuer die Transkription (Vision-Aufruf).

  Zwei Vorlagen:
    1. PAGE_TRANSCRIPTION: transkribiert eine ganze Schreibzonen-Seite
       zeilenweise, unsichere Woerter im Format [[wort?]].
    2. HEADER_READING: liest aus dem Kopfzeilen-Ausschnitt Aufgaben-Code,
       Schueler-Kuerzel und Blattnummer (nur als Vorschlag, siehe header.ts).

  Beide verlangen striktes JSON, damit sie mit parseJsonResponse (aus
  lib/prompts/chat.ts) ausgewertet werden koennen.
*/

export interface TranscriptionPrompt {
  system: string;
  user: string;
}

/** Baustein 1: zeilenweise Transkription einer Schreibzonen-Seite. */
export const PAGE_TRANSCRIPTION: TranscriptionPrompt = {
  system: `Du liest handschriftlichen Text von einem eingescannten Blatt ab und gibst ihn Zeile fuer Zeile wieder.

Regeln:
- Gib jede Zeile der Handschrift als eigenen Eintrag zurueck, in der Reihenfolge, wie sie auf dem Blatt steht.
- Schreibe genau das ab, was da steht. Verbessere keine Rechtschreibung oder Grammatik.
- Ist ein Wort nicht sicher zu lesen, markiere es im Text so: [[dein bester Versuch?]]. Nur bei echter Unsicherheit, nicht bei jedem Wort.
- Ist eine Zeile komplett leer oder nicht lesbar, gib einen leeren Text zurueck, aber ueberspringe die Zeile nicht in der Zaehlung.
- Erfinde nichts. Wenn du wirklich nichts erkennst, schreibe [[?]] fuer die ganze Zeile.
- Antworte ausschliesslich mit striktem JSON in genau der vorgegebenen Form, ohne weiteren Text davor oder danach.`,
  user: `Lies die Handschrift auf dem angehaengten Bild zeilenweise ab.
Antworte als JSON in genau dieser Form:
{
  "lines": [
    { "index": 0, "text": "abgeschriebene Zeile, unsichere Woerter als [[wort?]]" }
  ]
}`,
};

/** Baustein 2: Kopfzeile lesen (Aufgaben-Code, Kuerzel, Blattnummer). */
export const HEADER_READING: TranscriptionPrompt = {
  system: `Du liest eine handschriftlich ausgefuellte Kopfzeile von einem Pruefungsblatt ab.
Die Kopfzeile enthaelt drei Felder in Blockschrift: einen Aufgaben-Code (bis zu 8 Zeichen), ein Schueler-Kuerzel (bis zu 4 Zeichen) und eine Blattnummer.
Erkenne jedes Feld einzeln. Ist ein Feld nicht sicher lesbar oder leer, gib fuer dieses Feld null zurueck statt zu raten.
Antworte ausschliesslich mit striktem JSON in genau der vorgegebenen Form, ohne weiteren Text davor oder danach.`,
  user: `Lies die drei Felder der Kopfzeile auf dem angehaengten Bildausschnitt ab.
Antworte als JSON in genau dieser Form:
{
  "taskCode": "erkannter Aufgaben-Code oder null",
  "studentAlias": "erkanntes Schueler-Kuerzel oder null",
  "sheetNumber": "erkannte Blattnummer oder null"
}`,
};
