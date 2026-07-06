/*
  Bewertungskette fuer eine einzelne Arbeit (AP7).

  Ablauf: Inhaltsabgleich gegen den Erwartungshorizont (renderContentMatch),
  dann Kriterien-Bewertung mit woertlichen Zitaten (renderCriteriaScore), dann
  Feedback-Entwurf (renderFeedback). Alle drei Bausteine kommen unveraendert
  aus lib/prompts (AP4). Ergebnis ist ein vollstaendiges Assessment plus
  FeedbackDraft (lib/types.ts).

  Generierte Texte werden vor der Rueckgabe durch guardText geschickt
  (Hausregel 2, Verbotswoerter). Das betrifft die Begruendungen und alle
  Feedback-Texte; Zitate selbst werden nicht veraendert (woertliche Belege).
*/

import type {
  SubjectConfig,
  Assessment,
  CriterionAssessment,
  FeedbackDraft,
  ContentMatchResult,
  CriteriaScoringResult,
  FeedbackResult,
} from "../types";
import { renderContentMatch, renderCriteriaScore, renderFeedback } from "../prompts/render";
import { parseJsonResponse, type ChatClient } from "../prompts/chat";
import { guardText } from "../prompts/postprocess";
import { calculateGrade, sumPoints } from "../grading/grade";

export interface AssessSubmissionResult {
  assessment: Assessment;
  feedback: FeedbackDraft;
  contentMatch: ContentMatchResult;
}

/** Grenzt eine Punktzahl auf die erlaubte Spanne 0..maxPoints des Kriteriums ein. */
function clampCriterionPoints(points: number, maxPoints: number): number {
  if (Number.isNaN(points)) return 0;
  return Math.min(maxPoints, Math.max(0, points));
}

/**
 * Fuehrt die komplette Bewertungskette fuer eine Arbeit aus: Inhaltsabgleich,
 * Kriterien-Bewertung, Feedback-Entwurf. Wirft bei einem Fehler des Clients
 * oder ungueltigem JSON (die aufrufende Route faengt das pro Arbeit ab, siehe
 * app/api/assess/run, damit ein Fehler nicht den ganzen Lauf abbricht).
 */
export async function assessSubmission(
  config: SubjectConfig,
  submissionId: string,
  studentText: string,
  client: ChatClient,
): Promise<AssessSubmissionResult> {
  // 1. Inhaltsabgleich gegen den Erwartungshorizont.
  const contentMatchPrompt = renderContentMatch(config, studentText);
  const contentMatchRaw = await client.complete(contentMatchPrompt);
  const contentMatch = parseJsonResponse<ContentMatchResult>(contentMatchRaw);

  // 2. Kriterien-Bewertung mit woertlichen Zitaten.
  const criteriaPrompt = renderCriteriaScore(config, studentText);
  const criteriaRaw = await client.complete(criteriaPrompt);
  const criteriaResult = parseJsonResponse<CriteriaScoringResult>(criteriaRaw);

  const criteriaById = new Map(config.rubric.criteria.map((c) => [c.id, c]));
  const scoredById = new Map(criteriaResult.criteria.map((c) => [c.criterionId, c]));

  const criteria: CriterionAssessment[] = config.rubric.criteria.map((criterion) => {
    const scored = scoredById.get(criterion.id);
    const rawPoints = scored?.points ?? 0;
    const points = clampCriterionPoints(rawPoints, criterion.maxPoints);
    const reasoningGuard = guardText(scored?.reasoning ?? "", config.forbiddenWords);
    return {
      criterionId: criterion.id,
      points,
      reasoning: reasoningGuard.text,
      evidence: scored?.evidence ?? [],
    };
  });

  const totalPoints = sumPoints(criteria.map((c) => c.points));
  const maxPoints = sumPoints(config.rubric.criteria.map((c) => c.maxPoints));
  const grade = calculateGrade(config.gradingSystem, totalPoints, maxPoints);

  const now = new Date().toISOString();
  const assessment: Assessment = {
    submissionId,
    configId: config.id,
    criteria,
    totalPoints,
    maxPoints,
    gradeDisplay: grade.display,
    released: false,
    createdAt: now,
    updatedAt: now,
  };

  // 3. Feedback-Entwurf, aufbauend auf der Kriterien-Bewertung.
  const feedbackPrompt = renderFeedback(config, studentText, criteria);
  const feedbackRaw = await client.complete(feedbackPrompt);
  const feedbackResult = parseJsonResponse<FeedbackResult>(feedbackRaw);

  const strengthGuard = guardText(feedbackResult.strength ?? "", config.forbiddenWords);
  const nextStepGuard = guardText(feedbackResult.nextStep ?? "", config.forbiddenWords);
  const practiceGuard = feedbackResult.practice
    ? guardText(feedbackResult.practice, config.forbiddenWords)
    : null;
  const observations = (feedbackResult.observations ?? []).map((o) => {
    const textGuard = guardText(o.text ?? "", config.forbiddenWords);
    return { criterionId: o.criterionId, text: textGuard.text, quote: o.quote };
  });

  const feedback: FeedbackDraft = {
    submissionId,
    strength: strengthGuard.text,
    observations,
    nextStep: nextStepGuard.text,
    practice: practiceGuard?.text,
    updatedAt: now,
  };

  return { assessment, feedback, contentMatch };
}

/** Baut Assessment.gradeDisplay und die Gesamtpunkte neu aus den aktuellen Kriterien-Punkten. */
export function recalculateAssessment(
  assessment: Assessment,
  config: SubjectConfig,
): Assessment {
  const totalPoints = sumPoints(assessment.criteria.map((c) => c.points));
  const maxPoints = sumPoints(config.rubric.criteria.map((c) => c.maxPoints));
  const grade = calculateGrade(config.gradingSystem, totalPoints, maxPoints);
  return {
    ...assessment,
    totalPoints,
    maxPoints,
    gradeDisplay: grade.display,
    updatedAt: new Date().toISOString(),
  };
}
