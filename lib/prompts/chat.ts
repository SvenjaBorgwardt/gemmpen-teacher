/*
  Interface fuer die Auswertung (Text-Generierung). AP3 liefert die echte
  Ollama-Anbindung; hier steht nur der Vertrag plus ein Helfer zum JSON-Parsen.
  Dadurch sind Prompts und Kalibrierung ohne laufendes Ollama testbar.
*/

import type { RenderedPrompt } from "./render";

/** Ein Aufruf der Auswertung: rein Text, striktes JSON als Antwort erwartet. */
export interface ChatClient {
  /**
   * Schickt system und user an das Grading-Modell und gibt die rohe
   * Textantwort zurueck (erwartet wird JSON gemaess Vorlage).
   */
  complete(prompt: RenderedPrompt): Promise<string>;
}

/**
 * Holt das erste JSON-Objekt aus einer Modellantwort und parst es.
 * Toleriert fuehrenden oder folgenden Text sowie ```json-Zaeune.
 */
export function parseJsonResponse<T>(raw: string): T {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Die Antwort der Auswertung enthaelt kein JSON-Objekt.");
  }
  const slice = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(slice) as T;
  } catch {
    throw new Error("Die Antwort der Auswertung ist kein gueltiges JSON.");
  }
}
