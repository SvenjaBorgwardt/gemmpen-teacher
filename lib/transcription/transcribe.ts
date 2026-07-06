/*
  Transkription einer Seite mit dem Vision-Slot der Auswertung (Ollama).

  transcribePage() ruft das visionModel mit dem Seitenbild auf und liefert ein
  vollstaendiges Transcript (lib/types.ts), bereit fuer lib/storage.ts.
  readHeaderSuggestion() liest den in AP2 gespeicherten Kopfzeilen-Ausschnitt
  und liefert nur einen Vorschlag (siehe header.ts), nie eine automatische
  Zuordnung.

  Fehler werden nicht verschluckt: OllamaError aus lib/ollama.ts wird
  durchgereicht, die aufrufende API-Route bildet ihn auf eine verstaendliche
  Meldung ab (siehe app/api/recognize/*).
*/

import { parseJsonResponse } from "../prompts/chat";
import { PAGE_TRANSCRIPTION } from "./prompts";
import type { Transcript, TranscriptLine } from "../types";

/**
 * Schlankes strukturelles Interface fuer den Vision-Aufruf. OllamaClient
 * (lib/ollama.ts) erfuellt es; Tests koennen einen einfachen Mock einsetzen,
 * ohne echtes Ollama zu brauchen.
 */
export interface VisionChatClient {
  chatWithImage(model: string, system: string, user: string, imageBase64: string): Promise<string>;
}

/** Rohes JSON-Ergebnis des Transkriptions-Prompts. */
interface PageTranscriptionResult {
  lines: Array<{ index: number; text: string }>;
}

/** Zaehlt die Markierungen [[...]] in einem Text (unsichere Stellen). */
function countUnclear(text: string): number {
  const matches = text.match(/\[\[[^\]]*\]\]/g);
  return matches ? matches.length : 0;
}

export interface TranscribePageOptions {
  /** Optionaler Seitenindex, falls die Zeilen einer Mehrseiten-Arbeit zugeordnet werden sollen. */
  pageIndex?: number;
}

/**
 * Transkribiert ein einzelnes Seitenbild (Base64, ohne data:-Praefix) und
 * gibt ein vollstaendiges Transcript zurueck. confirmed ist immer false,
 * da die Lehrkraft erst pruefen muss (AP6).
 */
export async function transcribePage(
  client: VisionChatClient,
  visionModel: string,
  imageBase64: string,
  submissionId: string,
  options: TranscribePageOptions = {},
): Promise<Transcript> {
  const raw = await client.chatWithImage(
    visionModel,
    PAGE_TRANSCRIPTION.system,
    PAGE_TRANSCRIPTION.user,
    imageBase64,
  );
  const result = parseJsonResponse<PageTranscriptionResult>(raw);

  const lines: TranscriptLine[] = (result.lines ?? []).map((l, i) => ({
    index: typeof l.index === "number" ? l.index : i,
    text: typeof l.text === "string" ? l.text : "",
    position:
      options.pageIndex !== undefined
        ? { pageIndex: options.pageIndex, top: 0, bottom: 0 }
        : undefined,
  }));

  const unclearCount = lines.reduce((sum, l) => sum + countUnclear(l.text), 0);

  return {
    submissionId,
    lines,
    unclearCount,
    confirmed: false,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Fuegt die Zeilen mehrerer Seiten zu einem Transcript zusammen (fortlaufende
 * Indizes), fuer mehrseitige Arbeiten. Reihenfolge der Eingabe = Reihenfolge
 * der Seiten.
 */
export function mergeTranscripts(submissionId: string, pages: Transcript[]): Transcript {
  const lines: TranscriptLine[] = [];
  let idx = 0;
  for (const page of pages) {
    for (const line of page.lines) {
      lines.push({ ...line, index: idx });
      idx += 1;
    }
  }
  const unclearCount = lines.reduce((sum, l) => sum + countUnclear(l.text), 0);
  return {
    submissionId,
    lines,
    unclearCount,
    confirmed: false,
    updatedAt: new Date().toISOString(),
  };
}
