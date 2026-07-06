/*
  Textumbruch fuer die PDF-Erzeugung.

  Reine Funktion, unabhaengig von pdf-lib: nimmt eine Breiten-Messfunktion
  entgegen (in der App lib pdf-lib font.widthOfTextAtSize, im Test eine
  einfache Zeichen-Zaehlung), damit sich der Umbruch ohne echtes PDF-Rendering
  testen laesst.

  Regeln:
  - Woerter werden nie mitten im Wort getrennt, ausser ein einzelnes Wort ist
    laenger als die verfuegbare Breite (dann wird es hart umgebrochen, damit
    nichts abgeschnitten wird oder ueber den Rand laeuft).
  - Bestehende Zeilenumbrueche im Text werden als Absatzgrenzen respektiert.
  - Leere Absaetze erzeugen eine leere Zeile (fuer Abstand zwischen Absaetzen).
*/

export type MeasureFn = (text: string) => number;

/**
 * Bricht einen Text (mit optionalen Zeilenumbruechen als Absatzgrenzen) in
 * Zeilen um, die jeweils nicht breiter als maxWidth sind.
 */
export function wrapText(text: string, maxWidth: number, measure: MeasureFn): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }
    lines.push(...wrapParagraph(paragraph, maxWidth, measure));
  }

  return lines;
}

function wrapParagraph(paragraph: string, maxWidth: number, measure: MeasureFn): string[] {
  const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth || current === "") {
      // Passt, oder die Zeile ist noch leer (dann muss das Wort selbst
      // ggf. hart umgebrochen werden statt endlos zu wachsen).
      if (measure(candidate) <= maxWidth) {
        current = candidate;
        continue;
      }
      // current ist leer und selbst ein einzelnes Wort passt nicht: hart umbrechen.
      lines.push(...hardBreakWord(word, maxWidth, measure));
      current = "";
      continue;
    }
    lines.push(current);
    current = word;
    // Das neue Startwort selbst koennte immer noch zu breit sein.
    if (measure(current) > maxWidth) {
      lines.push(...hardBreakWord(current, maxWidth, measure));
      current = "";
    }
  }

  if (current) lines.push(current);
  if (lines.length === 0) lines.push("");
  return lines;
}

/** Bricht ein einzelnes, zu breites Wort zeichenweise um (kein Zeichen geht verloren). */
function hardBreakWord(word: string, maxWidth: number, measure: MeasureFn): string[] {
  const chars = Array.from(word);
  const lines: string[] = [];
  let current = "";
  for (const ch of chars) {
    const candidate = current + ch;
    if (measure(candidate) <= maxWidth || current === "") {
      current = candidate;
    } else {
      lines.push(current);
      current = ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Teilt eine Liste bereits umgebrochener Zeilen in Seiten auf, wenn nicht
 * alle Zeilen auf eine Seite passen (fester Zeilenabstand). Gibt fuer jede
 * Seite die Teilliste ihrer Zeilen zurueck.
 */
export function paginateLines(lines: string[], linesPerPage: number): string[][] {
  if (linesPerPage <= 0) return [lines];
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) {
    pages.push(lines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) pages.push([]);
  return pages;
}
