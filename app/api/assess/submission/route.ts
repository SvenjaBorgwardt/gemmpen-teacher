/*
  Detailansicht und Korrektur einer bewerteten Arbeit (AP7).

  GET /api/assess/submission?round=&id=
    -> Submission, Config (Kriterien-Metadaten fuer die Karten), Assessment,
       FeedbackDraft, Schuelertext (fuer Zitat-Kontext und DPO).

  POST /api/assess/submission { roundId, submissionId, criteria?, feedback? }
    -> speichert Aenderungen der Lehrkraft an Punktzahl/Begruendung je
       Kriterium und/oder am Feedback-Entwurf. Jede inhaltliche Aenderung
       gegenueber dem zuletzt gespeicherten Wert erzeugt ein DpoPair (Original,
       Korrektur, Kontext) in data/dpo/<roundId>.jsonl (Hausregel: lokal,
       kein Cloud-Upload). Punktzahlen werden auf die erlaubte Spanne des
       Kriteriums begrenzt. Die Note wird bei jeder Punktaenderung neu
       berechnet (lib/grading/grade.ts).
*/

import { NextResponse } from "next/server";
import {
  readSubmission,
  readTranscript,
  readAssessment,
  writeAssessment,
  readFeedback,
  writeFeedback,
  readConfig,
  appendDpoPair,
} from "@/lib/storage";
import { recalculateAssessment } from "@/lib/assess/pipeline";
import { transcriptToText, excerpt } from "@/lib/assess/text";
import { buildDpoPair, criterionContext, feedbackContext } from "@/lib/assess/dpo";
import { guardText } from "@/lib/prompts/postprocess";
import type { CriterionAssessment, FeedbackDraft } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("round");
  const submissionId = url.searchParams.get("id");
  if (!roundId || !submissionId) {
    return NextResponse.json({ error: "round und id sind erforderlich." }, { status: 400 });
  }

  const submission = await readSubmission(roundId, submissionId);
  if (!submission) {
    return NextResponse.json({ error: "Arbeit nicht gefunden." }, { status: 404 });
  }
  const config = submission.configId ? await readConfig(submission.configId) : null;
  const transcript = await readTranscript(roundId, submissionId);
  const assessment = await readAssessment(roundId, submissionId);
  const feedback = await readFeedback(roundId, submissionId);

  return NextResponse.json({
    submission,
    config,
    studentText: transcript ? transcriptToText(transcript) : "",
    assessment,
    feedback,
  });
}

interface CriterionEdit {
  criterionId: string;
  points: number;
  reasoning: string;
}

interface FeedbackEdit {
  strength: string;
  observations: Array<{ criterionId?: string; text: string; quote?: string }>;
  nextStep: string;
  practice?: string;
}

interface SaveRequest {
  roundId: string;
  submissionId: string;
  criteria?: CriterionEdit[];
  feedback?: FeedbackEdit;
}

export async function POST(req: Request) {
  let body: SaveRequest;
  try {
    body = (await req.json()) as SaveRequest;
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }
  const roundId = (body.roundId ?? "").trim();
  const submissionId = (body.submissionId ?? "").trim();
  if (!roundId || !submissionId) {
    return NextResponse.json({ error: "round und id sind erforderlich." }, { status: 400 });
  }

  const submission = await readSubmission(roundId, submissionId);
  if (!submission || !submission.configId) {
    return NextResponse.json({ error: "Arbeit oder Fach-Konfiguration nicht gefunden." }, { status: 404 });
  }
  const config = await readConfig(submission.configId);
  const existingAssessment = await readAssessment(roundId, submissionId);
  if (!config || !existingAssessment) {
    return NextResponse.json({ error: "Arbeit ist noch nicht bewertet." }, { status: 404 });
  }

  const transcript = await readTranscript(roundId, submissionId);
  const studentTextExcerpt = excerpt(transcript ? transcriptToText(transcript) : "");
  const criterionNameById = new Map(config.rubric.criteria.map((c) => [c.id, c.name]));
  const maxPointsById = new Map(config.rubric.criteria.map((c) => [c.id, c.maxPoints]));

  let assessment = existingAssessment;
  const now = new Date().toISOString();

  if (body.criteria) {
    const existingById = new Map(existingAssessment.criteria.map((c) => [c.criterionId, c]));
    const nextCriteria: CriterionAssessment[] = body.criteria.map((edit) => {
      const maxPoints = maxPointsById.get(edit.criterionId) ?? Number.POSITIVE_INFINITY;
      const clampedPoints = Math.min(maxPoints, Math.max(0, edit.points));
      const before = existingById.get(edit.criterionId);
      const reasoningGuard = guardText(edit.reasoning, config.forbiddenWords);

      // DPO-Paar fuer Punktzahl-Aenderung (Wert als Text, damit dasselbe
      // DpoPair-Format wie fuer Begruendung/Feedback genutzt werden kann).
      if (before && before.points !== clampedPoints) {
        const pair = buildDpoPair({
          submissionId,
          configId: config.id,
          kind: "score",
          criterionId: edit.criterionId,
          context: criterionContext({
            criterionName: criterionNameById.get(edit.criterionId) ?? edit.criterionId,
            studentTextExcerpt,
            configId: config.id,
          }),
          original: String(before.points),
          corrected: String(clampedPoints),
          now,
        });
        if (pair) void appendDpoPair(roundId, pair);
      }

      // DPO-Paar fuer Begruendungs-Aenderung.
      if (before && before.reasoning !== reasoningGuard.text) {
        const pair = buildDpoPair({
          submissionId,
          configId: config.id,
          kind: "reasoning",
          criterionId: edit.criterionId,
          context: criterionContext({
            criterionName: criterionNameById.get(edit.criterionId) ?? edit.criterionId,
            studentTextExcerpt,
            configId: config.id,
          }),
          original: before.reasoning,
          corrected: reasoningGuard.text,
          now,
        });
        if (pair) void appendDpoPair(roundId, pair);
      }

      return {
        criterionId: edit.criterionId,
        points: clampedPoints,
        reasoning: reasoningGuard.text,
        evidence: before?.evidence ?? [],
      };
    });

    assessment = recalculateAssessment({ ...existingAssessment, criteria: nextCriteria }, config);
    await writeAssessment(roundId, assessment);
  }

  let feedback: FeedbackDraft | null = await readFeedback(roundId, submissionId);

  if (body.feedback) {
    const before = feedback;
    const strengthGuard = guardText(body.feedback.strength, config.forbiddenWords);
    const nextStepGuard = guardText(body.feedback.nextStep, config.forbiddenWords);
    const practiceGuard = body.feedback.practice
      ? guardText(body.feedback.practice, config.forbiddenWords)
      : null;
    const observations = body.feedback.observations.map((o) => {
      const g = guardText(o.text, config.forbiddenWords);
      return { criterionId: o.criterionId, text: g.text, quote: o.quote };
    });

    const ctx = feedbackContext({ studentTextExcerpt, configId: config.id });

    if (before && before.strength !== strengthGuard.text) {
      const pair = buildDpoPair({
        submissionId,
        configId: config.id,
        kind: "feedback",
        context: ctx,
        original: before.strength,
        corrected: strengthGuard.text,
        now,
      });
      if (pair) void appendDpoPair(roundId, pair);
    }
    if (before && before.nextStep !== nextStepGuard.text) {
      const pair = buildDpoPair({
        submissionId,
        configId: config.id,
        kind: "feedback",
        context: ctx,
        original: before.nextStep,
        corrected: nextStepGuard.text,
        now,
      });
      if (pair) void appendDpoPair(roundId, pair);
    }
    const beforeObservations = before?.observations ?? [];
    observations.forEach((obs, i) => {
      const prevText = beforeObservations[i]?.text;
      if (prevText !== undefined && prevText !== obs.text) {
        const pair = buildDpoPair({
          submissionId,
          configId: config.id,
          kind: "feedback",
          criterionId: obs.criterionId,
          context: ctx,
          original: prevText,
          corrected: obs.text,
          now,
        });
        if (pair) void appendDpoPair(roundId, pair);
      }
    });

    feedback = {
      submissionId,
      strength: strengthGuard.text,
      observations,
      nextStep: nextStepGuard.text,
      practice: practiceGuard?.text,
      updatedAt: now,
    };
    await writeFeedback(roundId, feedback);
  }

  return NextResponse.json({ ok: true, assessment, feedback });
}
