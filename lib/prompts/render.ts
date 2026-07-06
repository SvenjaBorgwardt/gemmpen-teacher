/*
  Befuellen der Prompt-Vorlagen aus einer Fach-Konfiguration und dem Schuelertext.

  Alle Render-Funktionen liefern ein { system, user }-Paar mit reinem Text.
  AP3 (Ollama-Client) schickt system als System-Nachricht und user als Anfrage.
*/

import type {
  SubjectConfig,
  Criterion,
  CriterionAssessment,
} from "../types";
import { metadataFromConfig, gradingSystemLabel } from "../rubric/metadata";
import {
  CONTENT_MATCH,
  CRITERIA_SCORE,
  FEEDBACK,
  RUBRIC_SUGGEST,
  type PromptTemplate,
} from "./templates";

export interface RenderedPrompt {
  system: string;
  user: string;
}

/** Ersetzt alle {{name}}-Platzhalter. Unbekannte Platzhalter bleiben stehen. */
function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (whole, key: string) =>
    key in vars ? vars[key] : whole,
  );
}

function renderTemplate(tpl: PromptTemplate, vars: Record<string, string>): RenderedPrompt {
  return { system: fill(tpl.system, vars), user: fill(tpl.user, vars) };
}

/** Gemeinsame Platzhalter, die aus den Metadaten kommen. */
function baseVars(config: SubjectConfig): Record<string, string> {
  const meta = metadataFromConfig(config);
  return {
    subject: meta.subject,
    level: meta.level,
    textLanguage: meta.textLanguage,
    feedbackLanguage: meta.feedbackLanguage,
    tone: meta.tone,
    gradingSystemLabel: gradingSystemLabel(meta.gradingSystem),
    forbiddenWords: meta.forbiddenWords.join(", "),
    taskPrompt: config.rubric.taskPrompt,
  };
}

/** Nummerierte Liste des Erwartungshorizonts (Index passt zu expectedIndex). */
function numberedExpectedPoints(points: string[]): string {
  if (points.length === 0) return "(kein Erwartungshorizont hinterlegt)";
  return points.map((p, i) => `${i}. ${p}`).join("\n");
}

/** Kriterien als lesbarer Block, inklusive Punktespanne und Sonderregel. */
function criteriaBlock(criteria: Criterion[]): string {
  return criteria
    .map((c) => {
      const lines: string[] = [];
      lines.push(`- id: ${c.id} | ${c.name} (0 bis ${c.maxPoints} Punkte)`);
      lines.push(`  ${c.description}`);
      if (c.allOrNothing) {
        lines.push(
          `  Alles-oder-Nichts-Regel: ${c.allOrNothing.rule}. Alle Teile noetig: ${c.allOrNothing.parts.join(
            ", ",
          )}. Nur bei allen Teilen volle Punkte, sonst 0.`,
        );
      }
      if (c.levels && c.levels.length > 0) {
        for (const lv of c.levels) {
          lines.push(`  ${lv.minPoints} bis ${lv.maxPoints} (${lv.label}): ${lv.descriptor}`);
        }
      }
      return lines.join("\n");
    })
    .join("\n");
}

/* ----------------------------------------------------------------------------
   Oeffentliche Render-Funktionen
---------------------------------------------------------------------------- */

/**
 * Eingaben fuer den Raster-Vorschlag (Wizard-Schritt 3, AP5). Der Vorschlag
 * entsteht bevor eine vollstaendige SubjectConfig existiert, deshalb reichen
 * die noetigen Felder statt der ganzen Konfiguration.
 */
export interface RubricSuggestInput {
  subject: string;
  level: string;
  textLanguage: string;
  gradingSystem: import("../types").GradingSystem;
  taskPrompt: string;
  expectedPoints: string[];
}

/** Baustein 0: Raster-Vorschlag aus Aufgabenstellung und Erwartungshorizont. */
export function renderRubricSuggest(input: RubricSuggestInput): RenderedPrompt {
  return renderTemplate(RUBRIC_SUGGEST, {
    subject: input.subject,
    level: input.level,
    textLanguage: input.textLanguage,
    gradingSystemLabel: gradingSystemLabel(input.gradingSystem),
    taskPrompt: input.taskPrompt,
    expectedPointsNumbered: numberedExpectedPoints(input.expectedPoints),
  });
}

/** Baustein 1: Inhaltsabgleich gegen den Erwartungshorizont. */
export function renderContentMatch(config: SubjectConfig, studentText: string): RenderedPrompt {
  return renderTemplate(CONTENT_MATCH, {
    ...baseVars(config),
    expectedPointsNumbered: numberedExpectedPoints(config.rubric.expectedPoints),
    studentText,
  });
}

/** Baustein 2: Kriterien-Bewertung mit Zitaten. */
export function renderCriteriaScore(config: SubjectConfig, studentText: string): RenderedPrompt {
  return renderTemplate(CRITERIA_SCORE, {
    ...baseVars(config),
    criteriaBlock: criteriaBlock(config.rubric.criteria),
    studentText,
  });
}

/** Baustein 3: Feedback-Generierung. Nutzt das Ergebnis der Kriterien-Bewertung. */
export function renderFeedback(
  config: SubjectConfig,
  studentText: string,
  assessment: CriterionAssessment[],
): RenderedPrompt {
  const style = config.feedbackStyle;
  const observationCount = style.length === "short" ? "2" : "2 bis 3";
  const practiceInstruction = style.includePractice
    ? "\nHaenge am Ende einen kurzen, konkreten Uebungsvorschlag an (Feld practice)."
    : "\nLass das Feld practice weg.";

  const byId = new Map(config.rubric.criteria.map((c) => [c.id, c.name]));
  const assessmentSummary =
    assessment.length > 0
      ? assessment
          .map((a) => `- ${byId.get(a.criterionId) ?? a.criterionId}: ${a.points} Punkte. ${a.reasoning}`)
          .join("\n")
      : "(noch keine Kriterien-Bewertung vorhanden)";

  return renderTemplate(FEEDBACK, {
    ...baseVars(config),
    observationCount,
    practiceInstruction,
    assessmentSummary,
    studentText,
  });
}
