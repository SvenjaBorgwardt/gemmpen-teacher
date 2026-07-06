/*
  Transkriptions-Logik (lib/transcription/): zeilenweise Transkription mit
  [[wort?]]-Markierung, Zusammenfuehren mehrerer Seiten, Kopfzeilen-Vorschlag.

  Läuft gegen einen einfachen Test-Doppelgaenger fuer den Vision-Aufruf
  (VisionChatClient), ohne echtes Ollama. Das entspricht dem in der Aufgabe
  geforderten Durchtesten des Aufruf-Pfads mit dem Mock aus
  lib/prompts/chat.mock.ts (dort fuer Text; hier das analoge Vorgehen fuer
  den Bild-Anhang, da chat.mock.ts selbst keine Bilder verarbeitet).
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { transcribePage, mergeTranscripts } from "../transcription/transcribe";
import { readHeaderSuggestion } from "../transcription/header";
import type { VisionChatClient } from "../transcription/transcribe";

/** Einfacher deterministischer Vision-Mock: liefert festes JSON zurueck. */
function fixedVisionClient(response: string): VisionChatClient {
  return {
    async chatWithImage() {
      return response;
    },
  };
}

test("transcribePage: parst Zeilen und zaehlt unsichere Woerter", async () => {
  const client = fixedVisionClient(
    JSON.stringify({
      lines: [
        { index: 0, text: "Dear Mr Smith," },
        { index: 1, text: "I think this [[decission?]] is important." },
        { index: 2, text: "It affects [[everyone?]] at [[NorthStar?]]." },
      ],
    }),
  );

  const transcript = await transcribePage(client, "gemma3:12b", "QQ==", "sub-1", { pageIndex: 0 });

  assert.equal(transcript.submissionId, "sub-1");
  assert.equal(transcript.lines.length, 3);
  assert.equal(transcript.lines[0].text, "Dear Mr Smith,");
  assert.equal(transcript.lines[1].position?.pageIndex, 0);
  // 1 in Zeile 1, 2 in Zeile 2 = 3 unsichere Stellen insgesamt.
  assert.equal(transcript.unclearCount, 3);
  assert.equal(transcript.confirmed, false);
});

test("transcribePage: leere Zeilenliste ergibt ein gueltiges, leeres Transcript", async () => {
  const client = fixedVisionClient(JSON.stringify({ lines: [] }));
  const transcript = await transcribePage(client, "gemma3:12b", "QQ==", "sub-2");
  assert.equal(transcript.lines.length, 0);
  assert.equal(transcript.unclearCount, 0);
});

test("transcribePage: Antwort ohne JSON wirft eine verstaendliche Meldung (kein Absturz)", async () => {
  const client = fixedVisionClient("Das ist keine JSON-Antwort.");
  await assert.rejects(
    () => transcribePage(client, "gemma3:12b", "QQ==", "sub-3"),
    /JSON/,
  );
});

test("mergeTranscripts: fuegt mehrere Seiten mit fortlaufenden Indizes zusammen", async () => {
  const client1 = fixedVisionClient(
    JSON.stringify({ lines: [{ index: 0, text: "Zeile A1" }, { index: 1, text: "Zeile A2" }] }),
  );
  const client2 = fixedVisionClient(
    JSON.stringify({ lines: [{ index: 0, text: "Zeile B1 [[?]]" }] }),
  );
  const page1 = await transcribePage(client1, "gemma3:12b", "QQ==", "sub-4", { pageIndex: 0 });
  const page2 = await transcribePage(client2, "gemma3:12b", "QQ==", "sub-4", { pageIndex: 1 });

  const merged = mergeTranscripts("sub-4", [page1, page2]);
  assert.equal(merged.lines.length, 3);
  assert.deepEqual(merged.lines.map((l) => l.index), [0, 1, 2]);
  assert.equal(merged.lines[2].text, "Zeile B1 [[?]]");
  assert.equal(merged.unclearCount, 1);
});

test("readHeaderSuggestion: liefert erkannte Felder als Vorschlag", async () => {
  const client = fixedVisionClient(
    JSON.stringify({ taskCode: "A2COMM01", studentAlias: "AB12", sheetNumber: "1" }),
  );
  const suggestion = await readHeaderSuggestion(client, "gemma3:12b", "QQ==");
  assert.equal(suggestion.taskCode, "A2COMM01");
  assert.equal(suggestion.studentAlias, "AB12");
  assert.equal(suggestion.sheetNumber, "1");
});

test("readHeaderSuggestion: normalisiert null/leer/\"null\" auf null, ueberschreibt nichts selbst", async () => {
  const client = fixedVisionClient(
    JSON.stringify({ taskCode: null, studentAlias: "", sheetNumber: "null" }),
  );
  const suggestion = await readHeaderSuggestion(client, "gemma3:12b", "QQ==");
  assert.equal(suggestion.taskCode, null);
  assert.equal(suggestion.studentAlias, null);
  assert.equal(suggestion.sheetNumber, null);
});
