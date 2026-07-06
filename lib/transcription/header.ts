/*
  Auslesen der Kopfzeile (Aufgaben-Code, Schueler-Kuerzel, Blattnummer) aus dem
  von AP2 gespeicherten Kopfzeilen-Ausschnitt (SubmissionPage.headerImagePath
  bzw. pages/<pageId>.header.png, siehe lib/ingest/store.ts).

  Wichtig: das Ergebnis ist IMMER nur ein Vorschlag fuer die Zuordnung. Es
  ueberschreibt nie automatisch eine bestehende Zuordnung (assignedAlias) oder
  taskCode einer Submission; die aufrufende Seite/Route muss den Vorschlag
  aktiv uebernehmen lassen (siehe app/api/recognize/route.ts).
*/

import { parseJsonResponse } from "../prompts/chat";
import { HEADER_READING } from "./prompts";
import type { VisionChatClient } from "./transcribe";
import type { HeaderSuggestion } from "../types";

/** Ein Vorschlag aus der Kopfzeilen-Erkennung. Felder koennen leer sein. */
export type { HeaderSuggestion };

interface HeaderReadingResult {
  taskCode: string | null;
  studentAlias: string | null;
  sheetNumber: string | null;
}

function normalizeField(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "null") return null;
  return trimmed;
}

/**
 * Liest die Kopfzeile aus einem Bildausschnitt (Base64, ohne data:-Praefix)
 * und liefert einen Vorschlag. Wirft bei Verbindungsproblemen den
 * OllamaError aus lib/ollama.ts weiter, damit die aufrufende Stelle
 * entscheiden kann (z.B. Vorschlag einfach leer lassen).
 */
export async function readHeaderSuggestion(
  client: VisionChatClient,
  visionModel: string,
  headerImageBase64: string,
): Promise<HeaderSuggestion> {
  const raw = await client.chatWithImage(
    visionModel,
    HEADER_READING.system,
    HEADER_READING.user,
    headerImageBase64,
  );
  const result = parseJsonResponse<HeaderReadingResult>(raw);
  return {
    taskCode: normalizeField(result.taskCode),
    studentAlias: normalizeField(result.studentAlias),
    sheetNumber: normalizeField(result.sheetNumber),
  };
}
