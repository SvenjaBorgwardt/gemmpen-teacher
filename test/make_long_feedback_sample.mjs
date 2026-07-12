/*
  Zusatz-Beispiel fuer den visuellen Check: sehr lange Beobachtungen, damit
  Seite 2 des Feedback-PDFs auf mehrere physische Seiten umbrechen muss
  (Seitenumbruch-Logik, siehe DoD von AP8). Nicht Teil von npm test.

  Aufruf: node --experimental-strip-types --loader ./lib/__tests__/resolve-ts.mjs test/make_long_feedback_sample.mjs
*/

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildFeedbackPdf } from "../lib/pdf/feedback-pdf.ts";
import { calculateGrade } from "../lib/grading/grade.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "fixtures", "export");

const config = {
  id: "englisch-comment",
  name: "Englisch Comment",
  subject: "Englisch",
  textLanguage: "en",
  feedbackLanguage: "de",
  classLevel: "Class 11A",
  level: "B1-B2",
  gradingSystem: "nrw-points",
  feedbackStyle: { tone: "warm", length: "long", includePractice: true },
  forbiddenWords: ["wrong", "bad", "poor", "fail", "lack", "weak", "missing", "incorrect"],
  rubric: {
    taskPrompt: "Verfasse eine Stellungnahme.",
    expectedPoints: ["a"],
    criteria: [
      { id: "grammar", name: "Grammatik", description: "x", maxPoints: 15, colorKey: "grammar" },
      { id: "sentence", name: "Satzbau", description: "x", maxPoints: 15, colorKey: "sentence" },
      { id: "vocabulary", name: "Wortschatz", description: "x", maxPoints: 15, colorKey: "vocabulary" },
    ],
    calibrationSamples: [],
  },
  createdAt: "2026-07-03T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
};

const submission = {
  id: "sub-x",
  roundId: "runde",
  configId: "englisch-comment",
  studentAlias: "XY99",
  pages: [{ index: 0, imagePath: "p.png", templateDetected: true }],
  status: "released",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
};

const assessment = {
  submissionId: "sub-x",
  configId: "englisch-comment",
  criteria: [
    { criterionId: "grammar", points: 13, reasoning: "x", evidence: [] },
    { criterionId: "sentence", points: 11, reasoning: "x", evidence: [] },
    { criterionId: "vocabulary", points: 12, reasoning: "x", evidence: [] },
  ],
  totalPoints: 36,
  maxPoints: 45,
  gradeDisplay: "12 / 15",
  released: true,
  createdAt: "2026-07-03T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
};

const LONG =
  "Deine Argumente stehen nacheinander als vollstaendige Gedanken, nicht als Stichpunkte. " +
  "Das zeigt sich zum Beispiel daran, wie du das erste Gegenargument aufbaust: erst die Behauptung, " +
  "dann die Begruendung und dann ein konkretes Beispiel aus dem Alltag der Kolleginnen und Kollegen. " +
  "Genau diese Reihenfolge ist bei jedem der sechs Argumente wichtig, damit die Lesenden nachvollziehen " +
  "koennen, warum eine Position ueberzeugend ist. ";

const feedback = {
  submissionId: "sub-x",
  strength: "Deine Einleitung nennt sofort das Thema.",
  observations: [
    { criterionId: "grammar", text: LONG.repeat(3), quote: "the tools can take over tiring repetitive steps" },
    {
      criterionId: "sentence",
      text: LONG.repeat(3),
      quote: "However, there are also strong reasons in favour of the change.",
    },
    { criterionId: "vocabulary", text: LONG.repeat(3), quote: "reduce mistakes in the routing of parcels" },
  ],
  nextStep: "Naechster Schritt Text.",
  practice: "Uebung Text.",
  updatedAt: "2026-07-03T00:00:00.000Z",
};

async function main() {
  await mkdir(outDir, { recursive: true });
  const grade = calculateGrade(config.gradingSystem, assessment.totalPoints, assessment.maxPoints);
  const bytes = await buildFeedbackPdf({
    submission,
    config,
    assessment,
    feedback,
    grade,
    dateDisplay: "03.07.2026",
  });
  await writeFile(path.join(outDir, "feedback-long-sample.pdf"), bytes);
  console.log("Geschrieben:", path.join(outDir, "feedback-long-sample.pdf"), bytes.byteLength, "bytes");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
