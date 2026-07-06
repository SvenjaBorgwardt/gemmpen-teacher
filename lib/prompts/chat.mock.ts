/*
  Mock-ChatClient fuer Tests und den Ollama-freien Betrieb.

  Statt eines echten Modells liefert der Mock deterministisches, striktes JSON,
  das zur jeweiligen Prompt-Vorlage passt. Er liest die noetigen Angaben aus dem
  gerenderten User-Text (Kriterien-ids, Anzahl erwarteter Punkte), damit die
  Antwort strukturell zur Anfrage passt und die Kalibrierung testbar ist.

  Der Mock urteilt bewusst leicht grosszuegig (ein Punkt unter Maximum je
  Kriterium), damit ein Kalibrierungslauf eine sichtbare, aber kleine Abweichung
  zeigt.
*/

import type { RenderedPrompt } from "./render";
import type { ChatClient } from "./chat";

/** Zieht alle Kriterien-ids aus dem gerenderten Kriterien-Prompt. */
function extractCriterionIds(user: string): string[] {
  const ids: string[] = [];
  const re = /^- id:\s*(\S+)\s*\|/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(user)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

/** Zieht die Maximalpunkte je Kriterium aus dem Prompt (Text "0 bis N Punkte"). */
function extractMaxPoints(user: string): Map<string, number> {
  const map = new Map<string, number>();
  const re = /^- id:\s*(\S+)\s*\|[^\n]*\(0 bis (\d+(?:\.\d+)?) Punkte\)/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(user)) !== null) {
    map.set(m[1], Number(m[2]));
  }
  return map;
}

/** Zaehlt die erwarteten Punkte im Inhaltsabgleich-Prompt (Zeilen "N. ..."). */
function countExpectedPoints(user: string): number {
  const matches = user.match(/^\d+\.\s/gm);
  return matches ? matches.length : 0;
}

/** Ein kurzes Pseudo-Zitat aus dem Schuelertext (erste Woerter). */
function pseudoQuote(user: string): string {
  const marker = '"""';
  const start = user.indexOf(marker);
  const end = user.indexOf(marker, start + marker.length);
  if (start === -1 || end === -1) return "";
  const text = user.slice(start + marker.length, end).trim();
  return text.split(/\s+/).slice(0, 6).join(" ");
}

export interface MockOptions {
  /**
   * Wie viele Punkte der Mock unter dem Maximum vergibt (Default 1).
   * Groesser = groessere Abweichung zur Lehrerbewertung im Kalibrierungslauf.
   */
  pointsBelowMax?: number;
}

/** Erstellt einen deterministischen Mock-ChatClient. */
export function createMockChatClient(options: MockOptions = {}): ChatClient {
  const below = options.pointsBelowMax ?? 1;

  return {
    async complete(prompt: RenderedPrompt): Promise<string> {
      const { user } = prompt;
      const quote = pseudoQuote(user);

      // Kriterien-Bewertung erkennen (enthaelt "Bewertungskriterien:").
      if (user.includes("Bewertungskriterien:")) {
        const ids = extractCriterionIds(user);
        const maxByCriterion = extractMaxPoints(user);
        const criteria = ids.map((id) => {
          const max = maxByCriterion.get(id) ?? 0;
          const points = Math.max(0, max - below);
          return {
            criterionId: id,
            points,
            reasoning: "Testbewertung des Mock-Clients.",
            evidence: quote ? [quote] : [],
          };
        });
        return JSON.stringify({ criteria });
      }

      // Raster-Vorschlag erkennen (enthaelt "Erwartungshorizont" aber keine Bewertungskriterien).
      if (user.includes("Erwartungshorizont (was eine gute Bearbeitung")) {
        const n = countExpectedPoints(user);
        const perCriterion = 15;
        const criteria = Array.from({ length: Math.max(1, Math.min(n, 4)) }, (_v, i) => ({
          id: `kriterium-${i + 1}`,
          name: `Kriterium ${i + 1}`,
          description: "Testvorschlag des Mock-Clients auf Grundlage des Erwartungshorizonts.",
          maxPoints: perCriterion,
        }));
        return JSON.stringify({ criteria });
      }

      // Inhaltsabgleich erkennen (enthaelt "Erwartete inhaltliche Punkte").
      if (user.includes("Erwartete inhaltliche Punkte")) {
        const n = countExpectedPoints(user);
        const points = Array.from({ length: n }, (_v, i) => ({
          expectedIndex: i,
          coverage: i % 3 === 2 ? "absent" : "covered",
          quote: i % 3 === 2 ? undefined : quote,
        }));
        return JSON.stringify({ points });
      }

      // Feedback erkennen (Standardfall).
      return JSON.stringify({
        strength: quote
          ? `Du gehst die Aufgabe klar an, zum Beispiel hier: "${quote}".`
          : "Du gehst die Aufgabe klar an.",
        observations: [
          {
            text: "Schau dir diese Stelle noch einmal genau an und ueberlege, wie du sie weiter ausbaust.",
            quote,
          },
          {
            text: "An einer Stelle kannst du deinen Gedanken noch einen Schritt weiterfuehren.",
            quote,
          },
        ],
        nextStep: "Waehle einen deiner Punkte und ergaenze ein konkretes Beispiel dazu.",
      });
    },
  };
}
