/*
  Ableitung der flachen Metadaten-Sicht aus einer Fach-Konfiguration.
  SubjectConfig bleibt die einzige Quelle; hier wird nur umgeformt, nicht kopiert.
*/

import type { SubjectConfig, RubricMetadata, GradingSystem } from "../types";

/** Menschlich lesbarer Name des Notensystems (fuer Prompts, neutral). */
export function gradingSystemLabel(system: GradingSystem): string {
  switch (system) {
    case "nrw-points":
      return "NRW-Notenpunkte 0 bis 15";
    case "grades-1-6":
      return "Schulnoten 1 bis 6";
    case "percent":
      return "Prozent 0 bis 100";
  }
}

/** Extrahiert die Metadaten aus einer vollstaendigen Fach-Konfiguration. */
export function metadataFromConfig(config: SubjectConfig): RubricMetadata {
  return {
    subject: config.subject,
    textLanguage: config.textLanguage,
    feedbackLanguage: config.feedbackLanguage,
    level: config.level,
    gradingSystem: config.gradingSystem,
    tone: config.feedbackStyle.tone,
    forbiddenWords: [...config.forbiddenWords],
  };
}
