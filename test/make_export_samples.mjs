/*
  Erzeugt Beispiel-PDFs fuer den visuellen Check von AP8 (Feedback-PDF,
  Klassenuebersicht). Nicht Teil von npm test (manuelles Hilfsskript, analog
  zu test/make_test_data.py aus AP2 und test/seed-assess-manual.mjs aus AP7).

  Aufruf: node --experimental-strip-types --loader ./lib/__tests__/resolve-ts.mjs test/make_export_samples.mjs
  Ausgabe: test/fixtures/export/feedback-sample.pdf, test/fixtures/export/class-overview-sample.pdf
*/

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildFeedbackPdf } from "../lib/pdf/feedback-pdf.ts";
import { buildClassOverviewPdf } from "../lib/pdf/class-overview-pdf.ts";
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
  feedbackStyle: { tone: "warm und klar", length: "medium", includePractice: true },
  forbiddenWords: ["wrong", "bad", "poor", "fail", "lack", "weak", "missing", "incorrect"],
  rubric: {
    taskPrompt:
      "Verfasse eine Stellungnahme in der Rolle einer Mitarbeitervertretung bei der NorthStar Logistics AG zur Einfuehrung von KI-Werkzeugen am Arbeitsplatz.",
    expectedPoints: [
      "Einleitung nennt das Thema und die Position",
      "Schluss fasst die Position zusammen",
    ],
    criteria: [
      {
        id: "grammar",
        name: "Grammatik",
        description: "Korrektheit der Strukturen und Zeitformen.",
        maxPoints: 15,
        colorKey: "grammar",
      },
      {
        id: "sentence",
        name: "Satzbau",
        description: "Varianz, Komplexitaet und Kohaesion der Saetze.",
        maxPoints: 15,
        colorKey: "sentence",
      },
      {
        id: "vocabulary",
        name: "Allgemeiner Wortschatz",
        description: "Eigenstaendigkeit und Differenziertheit.",
        maxPoints: 15,
        colorKey: "vocabulary",
      },
    ],
    calibrationSamples: [],
  },
  createdAt: "2026-07-03T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
};

const submission = {
  id: "sub-mü34",
  roundId: "runde-2026-07",
  configId: "englisch-comment",
  studentAlias: "MÜ34",
  pages: [{ index: 0, imagePath: "pages/p1.png", templateDetected: true }],
  status: "released",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
};

const assessment = {
  submissionId: "sub-mü34",
  configId: "englisch-comment",
  criteria: [
    {
      criterionId: "grammar",
      points: 13,
      reasoning:
        "Deine Strukturen sind fast durchgehend sicher. Bei den Zeitformen im dritten Absatz wechselst du kurz zwischen Present Simple und Present Progressive, obwohl derselbe, andauernde Zustand gemeint ist.",
      evidence: ["the tools can take over tiring repetitive steps, so we have more time for customer calls"],
    },
    {
      criterionId: "sentence",
      points: 11,
      reasoning:
        "Deine Saetze sind ueberwiegend verbunden statt aneinandergereiht. Besonders der Uebergang mit \"however\" zeigt, dass du bewusst zwischen den Perspektiven wechselst und nicht nur Stichpunkte aneinanderreihst.",
      evidence: ["However, there are also strong reasons in favour of the change."],
    },
    {
      criterionId: "vocabulary",
      points: 12,
      reasoning:
        "Formulierungen wie \"repetitive steps\" oder \"routing of parcels\" zeigen einen eigenstaendigen, differenzierten Wortschatz statt einfacher Grundwoerter.",
      evidence: ["reduce mistakes in the routing of parcels"],
    },
  ],
  totalPoints: 36,
  maxPoints: 45,
  gradeDisplay: "12 / 15",
  released: true,
  createdAt: "2026-07-03T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
};

const feedback = {
  submissionId: "sub-mü34",
  strength:
    "Deine Einleitung nennt sofort das Thema und deine Rolle als Mitarbeitervertretung. Die Position ist von Anfang an klar erkennbar, und du fuehrst sie ueber den ganzen Text konsequent weiter.",
  observations: [
    {
      criterionId: "grammar",
      text:
        "Deine Argumente stehen nacheinander als vollstaendige Gedanken, nicht als Stichpunkte. Das zeigt sich zum Beispiel daran, wie du das erste Gegenargument aufbaust: erst die Behauptung, dann die Begruendung und dann ein konkretes Beispiel aus dem Alltag der Kolleginnen und Kollegen. " +
        "Genau diese Reihenfolge - Behauptung, Begruendung, Beispiel - ist bei jedem der sechs Argumente wichtig, damit die Lesenden nachvollziehen koennen, warum eine Position ueberzeugend ist. Achte beim naechsten Text darauf, dass auch die schwaecheren Argumente in der Mitte diese drei Teile vollstaendig enthalten, denn nur dann zaehlen sie fuer die Bewertung.",
      quote: "the tools can take over tiring repetitive steps, so we have more time for customer calls",
    },
    {
      criterionId: "sentence",
      text: "Du verbindest Saetze mit \"however\" und \"because\", das macht den Text angenehm fluessig zu lesen und zeigt, dass ein Gedanke logisch aus dem anderen folgt.",
      quote: "However, there are also strong reasons in favour of the change.",
    },
    {
      criterionId: "vocabulary",
      text:
        "Woerter wie \"repetitive steps\" oder \"routing of parcels\" zeigen, dass du eigene Formulierungen findest statt immer wieder dieselben einfachen Grundwoerter zu benutzen. " +
        "Das macht den Text praeziser und liest sich, als kaeme er wirklich aus dem beschriebenen Arbeitsalltag.",
      quote: "reduce mistakes in the routing of parcels",
    },
  ],
  nextStep:
    "Nimm dir als Naechstes vor, bei jedem der sechs Argumente Behauptung, Begruendung und Beispiel durchgehend zu markieren, bevor du den Text ueberarbeitest - so siehst du auf einen Blick, wo noch ein Beispiel fehlt.",
  practice:
    "Schreibe zu einem der schwaecheren Argumente ein zusaetzliches Beispiel aus deinem eigenen Arbeitsumfeld und ergaenze es im Text.",
  updatedAt: "2026-07-03T00:00:00.000Z",
};

async function main() {
  await mkdir(outDir, { recursive: true });

  const grade = calculateGrade(config.gradingSystem, assessment.totalPoints, assessment.maxPoints);
  const feedbackBytes = await buildFeedbackPdf({
    submission,
    config,
    assessment,
    feedback,
    grade,
    dateDisplay: "03.07.2026",
  });
  await writeFile(path.join(outDir, "feedback-sample.pdf"), feedbackBytes);

  const rows = [
    { submission, assessment },
    {
      submission: { ...submission, id: "sub-cd56", studentAlias: "CD56" },
      assessment: {
        ...assessment,
        submissionId: "sub-cd56",
        totalPoints: 30,
        gradeDisplay: "10 / 15",
        criteria: [
          { criterionId: "grammar", points: 10, reasoning: "x", evidence: [] },
          { criterionId: "sentence", points: 10, reasoning: "x", evidence: [] },
          { criterionId: "vocabulary", points: 10, reasoning: "x", evidence: [] },
        ],
      },
    },
    {
      submission: { ...submission, id: "sub-ef78", studentAlias: "EF78" },
      assessment: {
        ...assessment,
        submissionId: "sub-ef78",
        totalPoints: 42,
        gradeDisplay: "14 / 15",
        criteria: [
          { criterionId: "grammar", points: 14, reasoning: "x", evidence: [] },
          { criterionId: "sentence", points: 14, reasoning: "x", evidence: [] },
          { criterionId: "vocabulary", points: 14, reasoning: "x", evidence: [] },
        ],
      },
    },
  ];
  const classBytes = await buildClassOverviewPdf({
    config,
    roundId: "runde-2026-07",
    rows,
    dateDisplay: "03.07.2026",
  });
  await writeFile(path.join(outDir, "class-overview-sample.pdf"), classBytes);

  console.log("Geschrieben:", path.join(outDir, "feedback-sample.pdf"));
  console.log("Geschrieben:", path.join(outDir, "class-overview-sample.pdf"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
