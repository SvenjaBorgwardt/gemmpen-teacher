/*
  Bewertungskette (AP7, lib/assess/pipeline.ts) gegen den Mock-Client
  (AP4, chat.mock.ts), sowie die DPO-Paar-Erzeugung (lib/assess/dpo.ts).

  Deckt die Definition of Done ab: ein Durchlauf mit dem Mock-Client erzeugt
  Kriterien-Karten (assessSubmission), eine Textaenderung erzeugt ein
  DpoPair (buildDpoPair), Verbotswoerter werden vor der Anzeige entfernt
  (guardText, bereits in AP4 getestet, hier nur der Einbau in die Kette).
*/

import { test } from "node:test";
import assert from "node:assert/strict";

import { assessSubmission, recalculateAssessment } from "../assess/pipeline";
import { buildDpoPair, criterionContext, feedbackContext } from "../assess/dpo";
import { createMockChatClient } from "../prompts/chat.mock";
import type { SubjectConfig } from "../types";

function testConfig(): SubjectConfig {
  const now = new Date().toISOString();
  return {
    id: "test-config",
    name: "Testkonfiguration",
    subject: "Englisch",
    textLanguage: "en",
    feedbackLanguage: "en",
    classLevel: "Testklasse",
    level: "B1-B2",
    gradingSystem: "nrw-points",
    feedbackStyle: { tone: "warm und klar", length: "medium", includePractice: true },
    forbiddenWords: ["wrong", "bad", "falsch"],
    rubric: {
      taskPrompt: "Write a short comment about AI at the workplace.",
      expectedPoints: ["Introduction names the topic", "One argument with example"],
      criteria: [
        { id: "structure", name: "Structure", description: "Follows the required structure.", maxPoints: 15 },
        { id: "grammar", name: "Grammar", description: "Correct grammar.", maxPoints: 15, colorKey: "grammar" },
      ],
      calibrationSamples: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}

test("assessSubmission: Mock-Durchlauf erzeugt eine Bewertung je Kriterium und ein Feedback", async () => {
  const config = testConfig();
  const client = createMockChatClient();
  const studentText = 'AI tools can help workers. "In my opinion this is a good idea" says the writer.';

  const { assessment, feedback, contentMatch } = await assessSubmission(
    config,
    "sub-1",
    studentText,
    client,
  );

  assert.equal(assessment.criteria.length, 2);
  assert.ok(assessment.criteria.every((c) => c.points >= 0));
  assert.ok(assessment.criteria.every((c) => c.points <= 15));
  assert.equal(assessment.maxPoints, 30);
  assert.ok(assessment.totalPoints > 0);
  assert.ok(assessment.gradeDisplay.includes("/ 15"));
  assert.equal(assessment.released, false);

  assert.ok(feedback.strength.length > 0);
  assert.ok(feedback.observations.length >= 1);
  assert.ok(feedback.nextStep.length > 0);

  assert.ok(contentMatch.points.length === 2);
});

test("assessSubmission: Punkte werden auf die erlaubte Spanne des Kriteriums begrenzt", async () => {
  const config = testConfig();
  // Ein Mock, der bewusst ueber dem Maximum und negativ antwortet.
  const overshootClient = {
    async complete(prompt: { user: string }): Promise<string> {
      if (prompt.user.includes("Bewertungskriterien:")) {
        return JSON.stringify({
          criteria: [
            { criterionId: "structure", points: 999, reasoning: "Zu hoch.", evidence: [] },
            { criterionId: "grammar", points: -5, reasoning: "Negativ.", evidence: [] },
          ],
        });
      }
      if (prompt.user.includes("Erwartete inhaltliche Punkte")) {
        return JSON.stringify({ points: [] });
      }
      return JSON.stringify({ strength: "ok", observations: [], nextStep: "weiter so" });
    },
  };

  const { assessment } = await assessSubmission(config, "sub-2", "Some text.", overshootClient);
  const structure = assessment.criteria.find((c) => c.criterionId === "structure");
  const grammar = assessment.criteria.find((c) => c.criterionId === "grammar");
  assert.equal(structure?.points, 15);
  assert.equal(grammar?.points, 0);
});

test("assessSubmission: verbotene Woerter werden aus Begruendung und Feedback entfernt", async () => {
  const config = testConfig();
  const client = {
    async complete(prompt: { user: string }): Promise<string> {
      if (prompt.user.includes("Bewertungskriterien:")) {
        return JSON.stringify({
          criteria: [
            { criterionId: "structure", points: 10, reasoning: "This is wrong here.", evidence: [] },
            { criterionId: "grammar", points: 12, reasoning: "Looks bad in places.", evidence: [] },
          ],
        });
      }
      if (prompt.user.includes("Erwartete inhaltliche Punkte")) {
        return JSON.stringify({ points: [] });
      }
      return JSON.stringify({
        strength: "A wrong start, but clear.",
        observations: [{ text: "This part is bad.", quote: "quote" }],
        nextStep: "Keep going, nothing is wrong.",
      });
    },
  };

  const { assessment, feedback } = await assessSubmission(config, "sub-3", "Some text.", client);
  for (const c of assessment.criteria) {
    assert.ok(!/\bwrong\b/i.test(c.reasoning));
    assert.ok(!/\bbad\b/i.test(c.reasoning));
  }
  assert.ok(!/\bwrong\b/i.test(feedback.strength));
  assert.ok(!/\bbad\b/i.test(feedback.observations[0].text));
  assert.ok(!/\bwrong\b/i.test(feedback.nextStep));
});

test("recalculateAssessment: Punktaenderung aktualisiert Gesamtpunkte und Note", () => {
  const config = testConfig();
  const now = new Date().toISOString();
  const assessment = {
    submissionId: "sub-4",
    configId: config.id,
    criteria: [
      { criterionId: "structure", points: 10, reasoning: "r1", evidence: [] },
      { criterionId: "grammar", points: 10, reasoning: "r2", evidence: [] },
    ],
    totalPoints: 20,
    maxPoints: 30,
    gradeDisplay: "10 / 15",
    released: false,
    createdAt: now,
    updatedAt: now,
  };

  const edited = {
    ...assessment,
    criteria: assessment.criteria.map((c) =>
      c.criterionId === "structure" ? { ...c, points: 15 } : c,
    ),
  };
  const recalculated = recalculateAssessment(edited, config);
  assert.equal(recalculated.totalPoints, 25);
  assert.equal(recalculated.maxPoints, 30);
  assert.notEqual(recalculated.gradeDisplay, assessment.gradeDisplay);
});

test("buildDpoPair: eine echte Aenderung erzeugt ein Paar mit Original und Korrektur", () => {
  const pair = buildDpoPair({
    submissionId: "sub-5",
    configId: "test-config",
    kind: "reasoning",
    criterionId: "structure",
    context: criterionContext({
      criterionName: "Structure",
      studentTextExcerpt: "Some student text excerpt.",
      configId: "test-config",
    }),
    original: "Automatisch erzeugte Begruendung.",
    corrected: "Von der Lehrkraft praezisierte Begruendung.",
  });

  assert.ok(pair);
  assert.equal(pair?.submissionId, "sub-5");
  assert.equal(pair?.kind, "reasoning");
  assert.equal(pair?.criterionId, "structure");
  assert.equal(pair?.rejected, "Automatisch erzeugte Begruendung.");
  assert.equal(pair?.chosen, "Von der Lehrkraft praezisierte Begruendung.");
  assert.ok(pair?.context.includes("Structure"));
});

test("buildDpoPair: keine Aenderung erzeugt kein Paar", () => {
  const pair = buildDpoPair({
    submissionId: "sub-6",
    configId: "test-config",
    kind: "score",
    context: "irrelevant",
    original: "12",
    corrected: "12",
  });
  assert.equal(pair, null);
});

test("buildDpoPair: eine leere Korrektur erzeugt kein Paar", () => {
  const pair = buildDpoPair({
    submissionId: "sub-7",
    configId: "test-config",
    kind: "feedback",
    context: feedbackContext({ studentTextExcerpt: "text", configId: "test-config" }),
    original: "Etwas Text.",
    corrected: "   ",
  });
  assert.equal(pair, null);
});

test("buildDpoPair: jedes Paar bekommt eine eigene id", () => {
  const a = buildDpoPair({
    submissionId: "sub-8",
    configId: "test-config",
    kind: "score",
    context: "ctx",
    original: "10",
    corrected: "11",
  });
  const b = buildDpoPair({
    submissionId: "sub-8",
    configId: "test-config",
    kind: "score",
    context: "ctx",
    original: "10",
    corrected: "12",
  });
  assert.notEqual(a?.id, b?.id);
});
