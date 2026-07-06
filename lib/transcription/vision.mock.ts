/*
  Mock-Ersatz fuer den Vision-Slot (Handschrift-Erkennung), analog zum
  Text-Mock in lib/prompts/chat.mock.ts. Wird genutzt, wenn die Auswertung
  (Ollama) nicht erreichbar ist, damit der komplette Ablauf (Hochladen ->
  Pruefen -> Bewerten -> Export) auch ohne installierte Auswertung
  durchklickbar bleibt. Genau wie der Grading-Mock liefert er strukturell
  passendes, deterministisches JSON.

  Wichtig: die erzeugten Zeilen sind ein Platzhalter-Text, kein echt gelesener
  Inhalt. Die aufrufende Route markiert einen Mock-Lauf ehrlich (usingRealClient
  = false), damit die Oberflaeche der Lehrkraft klar sagen kann, dass hier noch
  keine echte Erkennung gelaufen ist.
*/

import type { VisionChatClient } from "./transcribe";

const MOCK_LINES = [
  "AI tools can support the team with everyday tasks.",
  "For example, a chatbot answers simple questions [[quickly?]] so the staff has more time.",
  "On the other side, some colleagues feel unsure about the new tools.",
  "A short training would help everyone to start with more confidence.",
];

export interface MockVisionOptions {
  /** Zeilen des Platzhalter-Transkripts (Default: vier Beispielzeilen). */
  lines?: string[];
  /** Kopfzeilen-Vorschlag fuer HEADER_READING (Default: leer). */
  header?: { taskCode: string | null; studentAlias: string | null; sheetNumber: string | null };
}

/**
 * Erzeugt einen VisionChatClient, der ohne Netzwerk deterministisches JSON
 * liefert. Erkennt an der System-Anweisung, ob eine Seite transkribiert oder
 * eine Kopfzeile gelesen werden soll.
 */
export function createMockVisionClient(options: MockVisionOptions = {}): VisionChatClient {
  const lines = options.lines ?? MOCK_LINES;
  const header = options.header ?? { taskCode: null, studentAlias: null, sheetNumber: null };

  return {
    async chatWithImage(_model: string, system: string): Promise<string> {
      const isHeader = /kopfzeile|header|aufgaben-code|task code/i.test(system);
      if (isHeader) {
        return JSON.stringify(header);
      }
      return JSON.stringify({
        lines: lines.map((text, index) => ({ index, text })),
      });
    },
  };
}
