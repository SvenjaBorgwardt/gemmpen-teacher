/*
  Baut den zusammenhaengenden Schuelertext aus einem bestaetigten Transkript
  (AP7). Reine Funktion, ohne Dateizugriff.
*/

import type { Transcript } from "../types";

/** Fuegt die Zeilen eines Transkripts zu einem Fliesstext zusammen, sortiert nach Index. */
export function transcriptToText(transcript: Transcript): string {
  return [...transcript.lines]
    .sort((a, b) => a.index - b.index)
    .map((l) => l.text)
    .join("\n")
    .trim();
}

/** Kurzer Ausschnitt eines Textes fuer den DPO-Kontext (siehe lib/assess/dpo.ts). */
export function excerpt(text: string, maxLength = 600): string {
  const trimmed = text.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
}
