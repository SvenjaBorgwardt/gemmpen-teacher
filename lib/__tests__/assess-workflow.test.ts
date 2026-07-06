/*
  Bewerten-Ablauf (AP7), end-to-end ueber lib/storage.ts in einen temporaeren
  Datenordner (wie lib/__tests__/review-workflow.test.ts es fuer AP6 macht).

  Deckt die Definition of Done ab: ein Durchlauf mit dem Mock-Client erzeugt
  eine Bewertung fuer eine Beispielarbeit, eine Punktaenderung aktualisiert
  die Note, eine Textaenderung erzeugt beim Sichern eine DPO-Zeile in
  data/dpo/, und die Freigabe wechselt den Status.

  Bewusst ohne HTTP-Server: die Logik der API-Routen unter app/api/assess/*
  ist duenne Verdrahtung um lib/storage.ts, lib/assess/pipeline.ts und
  lib/assess/dpo.ts; dieser Test ruft dieselben Bausteine direkt auf.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createMockChatClient } from "../prompts/chat.mock";
import { assessSubmission, recalculateAssessment } from "../assess/pipeline";
import { buildDpoPair, criterionContext } from "../assess/dpo";
import { transcriptToText, excerpt } from "../assess/text";
import type { Submission, SubjectConfig, Transcript, TranscriptLine } from "../types";

function testConfig(): SubjectConfig {
  const now = new Date().toISOString();
  return {
    id: "englisch-comment-test",
    name: "Englisch Comment Test",
    subject: "Englisch",
    textLanguage: "en",
    feedbackLanguage: "en",
    classLevel: "IAF31",
    level: "B1-B2",
    gradingSystem: "nrw-points",
    feedbackStyle: { tone: "warm und klar", length: "medium", includePractice: true },
    forbiddenWords: ["wrong", "bad", "falsch"],
    rubric: {
      taskPrompt: "Write a comment about AI at the workplace.",
      expectedPoints: ["Introduction names the topic", "One argument with example"],
      criteria: [
        { id: "structure", name: "Structure", description: "Follows the structure.", maxPoints: 15 },
        { id: "grammar", name: "Grammar", description: "Correct grammar.", maxPoints: 15, colorKey: "grammar" },
      ],
      calibrationSamples: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}

test("Bewerten-Ablauf: Mock-Bewertung, Punktaenderung, DPO-Zeile, Freigabe", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "gp-assess-"));
  const previousDataDir = process.env.GEMMPEN_DATA_DIR;
  process.env.GEMMPEN_DATA_DIR = tmpRoot;

  try {
    const {
      writeConfig,
      writeSubmission,
      readSubmission,
      writeTranscript,
      readAssessment,
      writeAssessment,
      readFeedback,
      writeFeedback,
      appendDpoPair,
      readDpoPairs,
    } = await import("../storage");

    const config = testConfig();
    await writeConfig(config);

    const roundId = "runde-assess-test";
    const submissionId = "sub-CD34";
    const now = new Date().toISOString();

    const submission: Submission = {
      id: submissionId,
      roundId,
      configId: config.id,
      studentAlias: "CD34",
      pages: [{ index: 0, imagePath: "pages/p1.png", templateDetected: true }],
      status: "checked",
      createdAt: now,
      updatedAt: now,
    };
    await writeSubmission(submission);

    const lines: TranscriptLine[] = [
      { index: 0, text: "AI tools can support the team." },
      { index: 1, text: '"This is a clear benefit," the writer explains with an example.' },
    ];
    const transcript: Transcript = {
      submissionId,
      lines,
      unclearCount: 0,
      confirmed: true,
      updatedAt: now,
    };
    await writeTranscript(roundId, transcript);

    // 1. Bewertungskette mit dem Mock-Client (wie POST /api/assess/run).
    const client = createMockChatClient();
    const studentText = transcriptToText(transcript);
    const { assessment, feedback } = await assessSubmission(config, submissionId, studentText, client);
    await writeAssessment(roundId, assessment);
    await writeFeedback(roundId, feedback);
    await writeSubmission({ ...submission, status: "assessed", updatedAt: new Date().toISOString() });

    const storedAssessment = await readAssessment(roundId, submissionId);
    assert.ok(storedAssessment);
    assert.equal(storedAssessment!.criteria.length, 2);
    const initialGrade = storedAssessment!.gradeDisplay;

    // 2. Punktaenderung durch die Lehrkraft (wie POST /api/assess/submission).
    const before = storedAssessment!.criteria.find((c) => c.criterionId === "structure")!;
    const changedCriteria = storedAssessment!.criteria.map((c) =>
      c.criterionId === "structure" ? { ...c, points: 15 } : c,
    );
    const recalculated = recalculateAssessment({ ...storedAssessment!, criteria: changedCriteria }, config);
    await writeAssessment(roundId, recalculated);

    const afterPointChange = await readAssessment(roundId, submissionId);
    assert.notEqual(afterPointChange!.gradeDisplay, initialGrade);
    assert.equal(
      afterPointChange!.criteria.find((c) => c.criterionId === "structure")!.points,
      15,
    );

    if (before.points !== 15) {
      const scorePair = buildDpoPair({
        submissionId,
        configId: config.id,
        kind: "score",
        criterionId: "structure",
        context: criterionContext({
          criterionName: "Structure",
          studentTextExcerpt: excerpt(studentText),
          configId: config.id,
        }),
        original: String(before.points),
        corrected: "15",
      });
      assert.ok(scorePair);
      await appendDpoPair(roundId, scorePair!);
    }

    // 3. Textaenderung der Begruendung erzeugt beim Sichern eine DPO-Zeile.
    const storedFeedback = await readFeedback(roundId, submissionId);
    assert.ok(storedFeedback);
    const originalStrength = storedFeedback!.strength;
    const correctedStrength = "You take a clear position right from the start, for example here.";
    assert.notEqual(originalStrength, correctedStrength);

    const feedbackPair = buildDpoPair({
      submissionId,
      configId: config.id,
      kind: "feedback",
      context: `Feedback-Text\nKonfiguration: ${config.id}`,
      original: originalStrength,
      corrected: correctedStrength,
    });
    assert.ok(feedbackPair);
    await appendDpoPair(roundId, feedbackPair!);

    const updatedFeedback = { ...storedFeedback!, strength: correctedStrength, updatedAt: new Date().toISOString() };
    await writeFeedback(roundId, updatedFeedback);

    const dpoPairs = await readDpoPairs(roundId);
    assert.ok(dpoPairs.length >= 1);
    const hasFeedbackPair = dpoPairs.some(
      (p) => p.kind === "feedback" && p.chosen === correctedStrength && p.rejected === originalStrength,
    );
    assert.ok(hasFeedbackPair, "DPO-Zeile fuer die Feedback-Korrektur fehlt");

    // 4. Freigabe (wie POST /api/assess/release): Status wechselt sichtbar.
    const finalAssessment = await readAssessment(roundId, submissionId);
    await writeAssessment(roundId, { ...finalAssessment!, released: true, updatedAt: new Date().toISOString() });
    await writeSubmission({
      ...(await readSubmission(roundId, submissionId))!,
      status: "released",
      updatedAt: new Date().toISOString(),
    });

    const releasedSubmission = await readSubmission(roundId, submissionId);
    const releasedAssessment = await readAssessment(roundId, submissionId);
    assert.equal(releasedSubmission!.status, "released");
    assert.equal(releasedAssessment!.released, true);
  } finally {
    if (previousDataDir === undefined) delete process.env.GEMMPEN_DATA_DIR;
    else process.env.GEMMPEN_DATA_DIR = previousDataDir;
    await rm(tmpRoot, { recursive: true, force: true });
  }
});
