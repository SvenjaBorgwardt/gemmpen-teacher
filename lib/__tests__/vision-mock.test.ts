/*
  Vision-Mock und Fallback (lib/transcription/vision.mock.ts): der Mock liefert
  ein strukturell gueltiges Transkript ohne echtes Ollama, damit der komplette
  Ablauf (Hochladen -> Pruefen -> Bewerten -> Export) auch ohne installierte
  Auswertung durchklickbar bleibt (AP13-Befund: die Erkennungs-Route hatte
  keinen Mock-Fallback, anders als die Bewertung ueber resolveGradingClient).

  Analog zu transcription.test.ts: nur die reine Logik, kein Netzwerk.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { createMockVisionClient } from "../transcription/vision.mock";
import { transcribePage } from "../transcription/transcribe";
import { readHeaderSuggestion } from "../transcription/header";
import { PAGE_TRANSCRIPTION, HEADER_READING } from "../transcription/prompts";

test("Mock-Vision liefert ein gueltiges, transkribierbares Seiten-JSON", async () => {
  const client = createMockVisionClient();
  const transcript = await transcribePage(client, "mock-vision", "AA==", "sub-x", { pageIndex: 0 });
  assert.ok(transcript.lines.length > 0, "es sollten Zeilen entstehen");
  assert.equal(transcript.confirmed, false, "der Mock bestaetigt nichts selbst");
  // Der Beispieltext enthaelt genau eine Unsicherheits-Markierung.
  assert.equal(transcript.unclearCount, 1);
});

test("Mock-Vision unterscheidet Kopfzeile von Seitentext ueber die System-Anweisung", async () => {
  const client = createMockVisionClient({
    header: { taskCode: "AITOOL01", studentAlias: "MT01", sheetNumber: "1" },
  });
  // Direkter Aufruf mit der Kopfzeilen-System-Anweisung liefert das Header-JSON.
  const rawHeader = await client.chatWithImage(
    "mock-vision",
    HEADER_READING.system,
    HEADER_READING.user,
    "AA==",
  );
  assert.match(rawHeader, /studentAlias/);
  // Ueber die echte Auswertungsfunktion kommt der Vorschlag heraus.
  const suggestion = await readHeaderSuggestion(client, "mock-vision", "AA==");
  assert.equal(suggestion.studentAlias, "MT01");
  assert.equal(suggestion.taskCode, "AITOOL01");

  // Die Seiten-System-Anweisung liefert dagegen Zeilen, keine Kopfzeile.
  const rawPage = await client.chatWithImage(
    "mock-vision",
    PAGE_TRANSCRIPTION.system,
    PAGE_TRANSCRIPTION.user,
    "AA==",
  );
  assert.match(rawPage, /"lines"/);
});

test("Mock-Vision uebernimmt eigene Zeilen, wenn angegeben", async () => {
  const client = createMockVisionClient({ lines: ["nur eine Zeile"] });
  const transcript = await transcribePage(client, "mock-vision", "AA==", "sub-y");
  assert.equal(transcript.lines.length, 1);
  assert.equal(transcript.lines[0].text, "nur eine Zeile");
  assert.equal(transcript.unclearCount, 0);
});
