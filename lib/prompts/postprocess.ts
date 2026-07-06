/*
  Nachbearbeitung erzeugter Texte.

  Schutzschild fuer schuelergerichtete Texte: verbotene Woerter (Hausregel 2)
  duerfen nirgends in der Anzeige stehen. AP7 nutzt dies vor dem Rendern der
  Feedback-Karten. Treffer werden durch eine neutrale Formulierung ersetzt und
  gemeldet, damit die Lehrkraft es nachbessern kann.
*/

/** Ein einzelner Treffer eines verbotenen Wortes. */
export interface ForbiddenHit {
  word: string;
  /** Wie oft das Wort gefunden wurde. */
  count: number;
}

export interface GuardResult {
  /** Bereinigter Text (Treffer ersetzt). */
  text: string;
  /** Gefundene verbotene Woerter. */
  hits: ForbiddenHit[];
  /** true, wenn nichts ersetzt werden musste. */
  clean: boolean;
}

/** Neutraler Ersatz fuer ein verbotenes Wort. */
const REPLACEMENT = "[...]";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ersetzt alle verbotenen Woerter im Text (nur ganze Woerter, ohne Ruecksicht
 * auf Gross- und Kleinschreibung) durch einen neutralen Platzhalter.
 */
export function guardText(text: string, forbiddenWords: readonly string[]): GuardResult {
  let out = text;
  const hits: ForbiddenHit[] = [];

  for (const raw of forbiddenWords) {
    const word = raw.trim();
    if (!word) continue;
    // Wortgrenzen via Unicode-faehiger Lookaround, damit Umlaute mitzaehlen.
    const re = new RegExp(`(?<![\\p{L}])${escapeRegExp(word)}(?![\\p{L}])`, "giu");
    const matches = out.match(re);
    if (matches && matches.length > 0) {
      hits.push({ word, count: matches.length });
      out = out.replace(re, REPLACEMENT);
    }
  }

  return { text: out, hits, clean: hits.length === 0 };
}

/**
 * Prueft nur, ohne zu ersetzen. Praktisch fuer Tests oder Warnhinweise.
 */
export function findForbidden(text: string, forbiddenWords: readonly string[]): ForbiddenHit[] {
  return guardText(text, forbiddenWords).hits;
}
