/*
  Notenberechnung fuer die Bewerten-Seite (AP7).

  Reine Funktionen ohne React/DOM-Abhaengigkeit: aus Gesamtpunkten und
  Maximalpunkten wird ein Anzeigewert im konfigurierten Notensystem berechnet.
  Reagiert bei jeder Punktaenderung, weil hier nichts zwischengespeichert wird.

  Drei Notensysteme (siehe GradingSystem in lib/types.ts):
    - nrw-points: NRW-Notenpunkte 0 bis 15 (mehr ist besser). Bei einer Arbeit
      mit anderem Punkte-Maximum wird linear auf die 0-15-Skala umgerechnet.
    - grades-1-6: deutsche Schulnoten 1 (sehr gut) bis 6 (ungenuegend), aus dem
      erreichten Prozentsatz abgeleitet.
    - percent: einfacher Prozentsatz der erreichten Punkte.
*/

import type { GradingSystem } from "../types";

export interface GradeResult {
  system: GradingSystem;
  /** Erreichte Rohpunkte (Summe ueber die Kriterien). */
  totalPoints: number;
  /** Maximal moegliche Rohpunkte. */
  maxPoints: number;
  /** Erreichter Anteil, 0 bis 1. Bei maxPoints=0 immer 0. */
  ratio: number;
  /** Anzeigewert, z.B. "12 / 15", "2+", "80 %". */
  display: string;
  /** Kurze Einordnung in Worten (fuer die Gesamtuebersicht). */
  label: string;
}

function clampRatio(totalPoints: number, maxPoints: number): number {
  if (maxPoints <= 0) return 0;
  const r = totalPoints / maxPoints;
  return Math.min(1, Math.max(0, r));
}

/*
  Klartext-Einordnung je Notenstufe, lokalisiert nach der Feedback-Sprache des
  Fachs (nicht der App-UI). Reihenfolge: beste Stufe zuerst (Index 0) bis
  schlechteste (Index 5). Englisch ist Standard (Public-Release); nur bei
  feedbackLanguage "de..." werden die deutschen Schulbegriffe genutzt.

  Die englischen Begriffe sind bewusst ohne Verbotswoerter (Hausregel 2)
  gewaehlt, weil dieses Label ungefiltert ins Feedback-PDF geschrieben wird.
*/
const BAND_LABELS = {
  en: ["very good", "good", "satisfactory", "sufficient", "deficient", "insufficient"],
  de: ["sehr gut", "gut", "befriedigend", "ausreichend", "mangelhaft", "ungenuegend"],
} as const;

function bandLabel(band: number, feedbackLanguage: string): string {
  const key = feedbackLanguage.trim().toLowerCase().startsWith("de") ? "de" : "en";
  return BAND_LABELS[key][band] ?? "";
}

/** NRW-Notenpunkte-Stufe (15 bis 0) als Band-Index (0 = beste). */
function nrwBand(points: number): number {
  if (points >= 13) return 0;
  if (points >= 10) return 1;
  if (points >= 7) return 2;
  if (points >= 4) return 3;
  if (points >= 1) return 4;
  return 5;
}

/** Deutsche Schulnote (1-6) als Band-Index (0 = beste). */
function gradeBand(grade: number): number {
  if (grade <= 1.5) return 0;
  if (grade <= 2.5) return 1;
  if (grade <= 3.5) return 2;
  if (grade <= 4.5) return 3;
  if (grade <= 5.5) return 4;
  return 5;
}

/** Prozent-Einordnung als Band-Index (0 = beste), angelehnt an die anderen Systeme. */
function percentBand(percent: number): number {
  if (percent >= 87) return 0;
  if (percent >= 73) return 1;
  if (percent >= 60) return 2;
  if (percent >= 47) return 3;
  if (percent >= 20) return 4;
  return 5;
}

/**
 * Berechnet den Anzeigewert im gewaehlten Notensystem aus den Rohpunkten.
 * Rein und reaktiv: bei jeder Punktaenderung neu aufrufen, es gibt keinen
 * internen Zustand.
 */
export function calculateGrade(
  system: GradingSystem,
  totalPoints: number,
  maxPoints: number,
  feedbackLanguage: string = "en",
): GradeResult {
  const ratio = clampRatio(totalPoints, maxPoints);

  if (system === "nrw-points") {
    const scaled = Math.round(ratio * 15 * 10) / 10;
    return {
      system,
      totalPoints,
      maxPoints,
      ratio,
      display: `${roundedDisplay(scaled)} / 15`,
      label: bandLabel(nrwBand(scaled), feedbackLanguage),
    };
  }

  if (system === "grades-1-6") {
    // Linear: 100% -> Note 1, 0% -> Note 6.
    const grade = Math.round((6 - ratio * 5) * 10) / 10;
    return {
      system,
      totalPoints,
      maxPoints,
      ratio,
      display: germanGradeDisplay(grade),
      label: bandLabel(gradeBand(grade), feedbackLanguage),
    };
  }

  // percent
  const percent = Math.round(ratio * 1000) / 10;
  return {
    system,
    totalPoints,
    maxPoints,
    ratio,
    display: `${roundedDisplay(percent)} %`,
    label: bandLabel(percentBand(percent), feedbackLanguage),
  };
}

function roundedDisplay(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** Deutsche Notenschreibweise, z.B. "2" oder "2-" bzw. "1+" an den Raendern. */
function germanGradeDisplay(grade: number): string {
  const clamped = Math.min(6, Math.max(1, grade));
  const rounded = Math.round(clamped * 10) / 10;
  return rounded.toFixed(1).replace(".", ",");
}

/** Summiert die Punkte einer Liste von Kriterien-Bewertungen. */
export function sumPoints(points: number[]): number {
  return points.reduce((a, b) => a + b, 0);
}
