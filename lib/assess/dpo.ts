/*
  DPO-Paar-Erzeugung fuer die Bewerten-Seite (AP7).

  Jede inhaltliche Aenderung der Lehrkraft an einem erzeugten Text (Punktzahl,
  Begruendung, Feedback-Text) wird beim Sichern als DpoPair gespeichert
  (lib/types.ts, lib/storage.ts: appendDpoPair). "rejected" ist der
  urspruenglich erzeugte Text/Wert, "chosen" die Korrektur der Lehrkraft.

  Reine Funktionen ohne Dateizugriff, damit sie ohne echtes Dateisystem
  testbar sind. Der Aufruf von appendDpoPair passiert in den API-Routen.
*/

import type { DpoPair, IsoTimestamp } from "../types";

let counter = 0;

/** Erzeugt eine im Prozess eindeutige DPO-Paar-ID. */
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

export interface BuildDpoPairInput {
  submissionId: string;
  configId: string;
  kind: DpoPair["kind"];
  criterionId?: string;
  /** Kontext, der beiden Fassungen zugrunde lag (Kriterium, Textausschnitt, Config-Referenz). */
  context: string;
  original: string;
  corrected: string;
  now?: IsoTimestamp;
}

/**
 * Baut ein DpoPair aus Original- und Korrektur-Wert. Gibt null zurueck, wenn
 * sich nichts inhaltlich geaendert hat (kein Paar noetig), damit nicht jede
 * Zwischeneingabe eine Zeile erzeugt.
 */
export function buildDpoPair(input: BuildDpoPairInput): DpoPair | null {
  const original = input.original.trim();
  const corrected = input.corrected.trim();
  if (original === corrected) return null;
  if (corrected === "") return null;

  return {
    id: nextId(input.kind),
    submissionId: input.submissionId,
    configId: input.configId,
    kind: input.kind,
    criterionId: input.criterionId,
    context: input.context,
    rejected: original,
    chosen: corrected,
    createdAt: input.now ?? new Date().toISOString(),
  };
}

/** Baut den Kontext-Text fuer eine Punkt- oder Begruendungs-Aenderung eines Kriteriums. */
export function criterionContext(params: {
  criterionName: string;
  studentTextExcerpt: string;
  configId: string;
}): string {
  const excerpt = params.studentTextExcerpt.slice(0, 600);
  return `Kriterium: ${params.criterionName}\nKonfiguration: ${params.configId}\nTranskript-Ausschnitt: ${excerpt}`;
}

/** Baut den Kontext-Text fuer eine Feedback-Aenderung (kein einzelnes Kriterium). */
export function feedbackContext(params: { studentTextExcerpt: string; configId: string }): string {
  const excerpt = params.studentTextExcerpt.slice(0, 600);
  return `Feedback-Text\nKonfiguration: ${params.configId}\nTranskript-Ausschnitt: ${excerpt}`;
}
