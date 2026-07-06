/*
  Reine Logik fuer die Pruefen-Seite (AP6): Erkennung und Zerlegung der
  Unsicherheits-Markierungen [[wort?]], die AP3 beim Transkribieren einfuegt
  (siehe lib/transcription/prompts.ts, PAGE_TRANSCRIPTION).

  Bewusst ohne React/DOM-Abhaengigkeit, damit es sich ohne Browser testen
  laesst (siehe lib/__tests__/unclear.test.ts).
*/

import type { Transcript, TranscriptLine } from "../types";

/** Erkennt eine Markierung wie [[wort?]] oder [[?]]. */
const UNCLEAR_PATTERN = /\[\[([^\]]*)\]\]/g;

/** Ein Textabschnitt einer Zeile: entweder normaler Text oder eine Markierung. */
export interface TextSegment {
  /** Fortlaufender Index innerhalb der Zeile, fuer stabile React-Keys. */
  key: number;
  kind: "plain" | "unclear";
  /** Sichtbarer Text (bei "unclear" ohne die [[ ]] und ohne das abschliessende "?"). */
  text: string;
  /** Rohtext inklusive [[ ]], nur bei "unclear" gesetzt (fuer den Wiederaufbau). */
  raw?: string;
}

/** Zaehlt die Markierungen [[...]] in einem Text. */
export function countUnclearMarkers(text: string): number {
  const matches = text.match(UNCLEAR_PATTERN);
  return matches ? matches.length : 0;
}

/** Ob ein Text noch mindestens eine Unsicherheits-Markierung enthaelt. */
export function hasUnclearMarkers(text: string): boolean {
  UNCLEAR_PATTERN.lastIndex = 0;
  return UNCLEAR_PATTERN.test(text);
}

/**
 * Zerlegt eine Zeile in normale und unsichere Abschnitte, fuer die farbige
 * Darstellung in der Pruefansicht. Der sichtbare Text einer Markierung ist
 * der Inhalt ohne die Klammern und ohne ein abschliessendes Fragezeichen
 * (das Fragezeichen ist Teil der Markierungssyntax, kein Lesehinweis).
 */
export function splitUnclearSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let key = 0;
  UNCLEAR_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = UNCLEAR_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ key: key++, kind: "plain", text: text.slice(lastIndex, match.index) });
    }
    const inner = match[1] ?? "";
    const visible = inner.endsWith("?") ? inner.slice(0, -1) : inner;
    segments.push({ key: key++, kind: "unclear", text: visible, raw: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ key: key++, kind: "plain", text: text.slice(lastIndex) });
  }
  if (segments.length === 0) {
    segments.push({ key: 0, kind: "plain", text: "" });
  }
  return segments;
}

/** Gesamtzahl der Unsicherheits-Markierungen ueber alle Zeilen eines Transkripts. */
export function transcriptUnclearCount(lines: TranscriptLine[]): number {
  return lines.reduce((sum, line) => sum + countUnclearMarkers(line.text), 0);
}

/** Ob ein Transkript noch mindestens eine Unsicherheits-Markierung enthaelt. */
export function transcriptHasUnclearMarkers(lines: TranscriptLine[]): boolean {
  return lines.some((line) => hasUnclearMarkers(line.text));
}

/**
 * Ob eine Arbeit fuer die Bestaetigung freigegeben werden kann: es muss ein
 * Transkript geben und es darf keine Unsicherheits-Markierung mehr enthalten
 * (Hausregel: die Lehrkraft muss jede Unsicherheit selbst entscheiden).
 */
export function canConfirmTranscript(transcript: Transcript | null | undefined): boolean {
  if (!transcript) return false;
  if (transcript.lines.length === 0) return false;
  return !transcriptHasUnclearMarkers(transcript.lines);
}

/**
 * Bildposition einer Zeile fuer die Hervorhebung im Scan-Bild. Nutzt die
 * echte Position aus dem Ingest, falls vorhanden (siehe TranscriptLine.position
 * in lib/types.ts); sonst eine proportionale Schaetzung ueber die Zeilennummer
 * innerhalb ihrer Seite (gleichmaessig verteilt ueber die Schreibzone).
 */
export interface LineHighlight {
  pageIndex: number;
  top: number;
  bottom: number;
  /** Ob die Position aus dem Ingest kommt (true) oder geschaetzt ist (false). */
  estimated: boolean;
}

export function estimateLineHighlight(
  line: TranscriptLine,
  linesOnSamePage: TranscriptLine[],
): LineHighlight {
  if (line.position && (line.position.top !== 0 || line.position.bottom !== 0)) {
    return {
      pageIndex: line.position.pageIndex,
      top: line.position.top,
      bottom: line.position.bottom,
      estimated: false,
    };
  }

  const pageIndex = line.position?.pageIndex ?? 0;
  const positionOnPage = Math.max(
    0,
    linesOnSamePage.findIndex((l) => l.index === line.index),
  );
  const total = Math.max(1, linesOnSamePage.length);
  const slice = 1 / total;
  const top = positionOnPage * slice;
  const bottom = Math.min(1, top + slice);
  return { pageIndex, top, bottom, estimated: true };
}

/** Gruppiert Zeilen eines Transkripts nach Seitenindex (fuer die Schaetzung). */
export function groupLinesByPage(lines: TranscriptLine[]): Map<number, TranscriptLine[]> {
  const map = new Map<number, TranscriptLine[]>();
  for (const line of lines) {
    const pageIndex = line.position?.pageIndex ?? 0;
    const list = map.get(pageIndex) ?? [];
    list.push(line);
    map.set(pageIndex, list);
  }
  return map;
}
