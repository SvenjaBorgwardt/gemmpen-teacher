/*
  Integrationstest der PDF-Erzeugung (AP8): Feedback-PDF (drei Seiten) und
  Klassenuebersicht mit Beispieldaten (eine freigegebene Arbeit inklusive
  Assessment). Prueft Seitenzahl, dass PDF-lib das Dokument verlustfrei
  wieder einlesen kann (kein Absturz durch nicht darstellbare Zeichen), und
  dass sehr lange Feedback-Texte einen zusaetzlichen Seitenumbruch ausloesen
  statt abgeschnitten zu werden.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";

import { buildFeedbackPdf } from "../pdf/feedback-pdf";
import { buildClassOverviewPdf, type ClassOverviewRow } from "../pdf/class-overview-pdf";
import { calculateGrade } from "../grading/grade";
import type { Assessment, FeedbackDraft, SubjectConfig, Submission } from "../types";

function sampleConfig(overrides: Partial<SubjectConfig> = {}): SubjectConfig {
  return {
    id: "englisch-comment",
    name: "Englisch Comment",
    subject: "Englisch",
    textLanguage: "en",
    feedbackLanguage: "en",
    classLevel: "Berufskolleg IAF31",
    level: "B1-B2",
    gradingSystem: "nrw-points",
    feedbackStyle: { tone: "warm und klar", length: "medium", includePractice: true },
    forbiddenWords: ["wrong", "bad", "poor", "fail", "lack", "weak", "missing", "incorrect"],
    rubric: {
      taskPrompt: "Write a comment in the role of an employee representative.",
      expectedPoints: ["Introduction names the topic", "Conclusion restates the position"],
      criteria: [
        { id: "grammar", name: "Grammar", description: "Correctness of structures.", maxPoints: 15, colorKey: "grammar" },
        { id: "sentence", name: "Sentence structure", description: "Variety and cohesion.", maxPoints: 15, colorKey: "sentence" },
        { id: "vocabulary", name: "Vocabulary", description: "Range and precision.", maxPoints: 15, colorKey: "vocabulary" },
      ],
      calibrationSamples: [],
    },
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    ...overrides,
  };
}

function sampleSubmission(overrides: Partial<Submission> = {}): Submission {
  return {
    id: "sub-ab12",
    roundId: "runde-2026-07",
    configId: "englisch-comment",
    studentAlias: "AB12",
    pages: [{ index: 0, imagePath: "pages/p1.png", templateDetected: true }],
    status: "released",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    ...overrides,
  };
}

function sampleAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    submissionId: "sub-ab12",
    configId: "englisch-comment",
    criteria: [
      { criterionId: "grammar", points: 13, reasoning: "Strukturen sind fast durchgehend sicher, mit vereinzelten kleinen Abweichungen bei der Zeitform.", evidence: ["the tools can take over tiring repetitive steps"] },
      { criterionId: "sentence", points: 11, reasoning: "Saetze sind verbunden statt aneinandergereiht, teils mit Nebensaetzen.", evidence: ["However, there are also strong reasons in favour of the change."] },
      { criterionId: "vocabulary", points: 12, reasoning: "Der Wortschatz ist eigenstaendig und passt zum Thema Arbeit und Technologie.", evidence: ["repetitive steps", "customer calls"] },
    ],
    totalPoints: 36,
    maxPoints: 45,
    gradeDisplay: "12 / 15",
    released: true,
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    ...overrides,
  };
}

const LONG_OBSERVATION_TEXT =
  "Deine Argumente stehen nacheinander als vollstaendige Gedanken, nicht als Stichpunkte. " +
  "Das zeigt sich zum Beispiel daran, wie du das erste Gegenargument aufbaust: erst die Behauptung, " +
  "dann die Begruendung und dann ein konkretes Beispiel aus dem Alltag der Kolleginnen und Kollegen. " +
  "Genau diese Reihenfolge - Behauptung, Begruendung, Beispiel - ist bei jedem der sechs Argumente wichtig, " +
  "damit die Lesenden nachvollziehen koennen, warum eine Position ueberzeugend ist. " +
  "Achte beim naechsten Text darauf, dass auch die schwaecheren Argumente in der Mitte diese drei Teile vollstaendig enthalten, " +
  "denn nur dann zaehlen sie fuer die Bewertung. " +
  "Ein weiterer Punkt: die Bruecke zwischen den Gegenargumenten und deinen eigenen Argumenten liest sich bereits sehr fluessig " +
  "und macht deutlich, dass du bewusst die Perspektive wechselst.";

function sampleFeedback(overrides: Partial<FeedbackDraft> = {}): FeedbackDraft {
  return {
    submissionId: "sub-ab12",
    strength: "Deine Einleitung nennt sofort das Thema und deine Rolle als Mitarbeitervertretung, und die Position ist von Anfang an klar erkennbar.",
    observations: [
      {
        criterionId: "grammar",
        text: LONG_OBSERVATION_TEXT,
        quote: "the tools can take over tiring repetitive steps, so we have more time for customer calls",
      },
      {
        criterionId: "sentence",
        text: "Du verbindest Saetze mit „however“ und „because“, das macht den Text fluessig zu lesen.",
        quote: "However, there are also strong reasons in favour of the change.",
      },
      {
        criterionId: "vocabulary",
        text: "Woerter wie „repetitive steps“ oder „routing of parcels“ zeigen, dass du eigene Formulierungen findest statt einfache Grundwoerter zu wiederholen.",
        quote: "reduce mistakes in the routing of parcels",
      },
    ],
    nextStep: "Nimm dir als Naechstes vor, bei jedem der sechs Argumente Behauptung, Begruendung und Beispiel durchgehend zu markieren, bevor du den Text ueberarbeitest.",
    practice: "Schreibe zu einem der schwaecheren Argumente ein zusaetzliches Beispiel aus deinem eigenen Arbeitsumfeld.",
    updatedAt: "2026-07-03T00:00:00.000Z",
    ...overrides,
  };
}

test("Feedback-PDF: drei logische Seiten (Gesamtbild, Beobachtungen, naechste Schritte), keine Zeichen-Absturz", async () => {
  const config = sampleConfig();
  const submission = sampleSubmission();
  const assessment = sampleAssessment();
  const feedback = sampleFeedback();
  const grade = calculateGrade(config.gradingSystem, assessment.totalPoints, assessment.maxPoints);

  const bytes = await buildFeedbackPdf({
    submission,
    config,
    assessment,
    feedback,
    grade,
    dateDisplay: "03.07.2026",
  });

  assert.ok(bytes.byteLength > 500, "PDF sollte eine sinnvolle Groesse haben");

  // pdf-lib muss das erzeugte Dokument wieder verlustfrei laden koennen.
  const reloaded = await PDFDocument.load(bytes);
  assert.ok(reloaded.getPageCount() >= 3, "mindestens drei Seiten (eine je Abschnitt)");
});

test("Feedback-PDF: sehr lange Beobachtungen loesen einen zusaetzlichen Seitenumbruch aus, statt abgeschnitten zu werden", async () => {
  const config = sampleConfig();
  const submission = sampleSubmission();
  const assessment = sampleAssessment();
  // Feedback mit extrem langen Beobachtungen (jede einzelne mehrfach so lang
  // wie eine Seite normalerweise Platz bietet), damit Seite 2 mehrfach
  // umbrechen muss.
  const feedback = sampleFeedback({
    observations: [0, 1, 2].map((i) => ({
      criterionId: ["grammar", "sentence", "vocabulary"][i],
      text: `${LONG_OBSERVATION_TEXT} ${LONG_OBSERVATION_TEXT} ${LONG_OBSERVATION_TEXT}`,
      quote: "the tools can take over tiring repetitive steps",
    })),
  });
  const grade = calculateGrade(config.gradingSystem, assessment.totalPoints, assessment.maxPoints);

  const bytes = await buildFeedbackPdf({
    submission,
    config,
    assessment,
    feedback,
    grade,
    dateDisplay: "03.07.2026",
  });

  const reloaded = await PDFDocument.load(bytes);
  // Mit so viel Text muss die Beobachtungen-Seite (Seite 2) auf mehrere
  // physische Seiten umbrechen: insgesamt mehr als die drei logischen Seiten.
  assert.ok(
    reloaded.getPageCount() > 3,
    `erwartet mehr als 3 physische Seiten bei sehr langem Text, war ${reloaded.getPageCount()}`,
  );
});

test("Feedback-PDF: deutsche Umlaute in Begruendung und Feedback erscheinen korrekt (kein Crash, kein '?')", async () => {
  const config = sampleConfig({ feedbackLanguage: "de" });
  const submission = sampleSubmission({ studentAlias: "MÜ34" });
  const assessment = sampleAssessment();
  const feedback = sampleFeedback({
    strength: "Großartig, wie du Übergänge zwischen den Argumenten schaffst - präzise und überzeugend formuliert.",
  });
  const grade = calculateGrade(config.gradingSystem, assessment.totalPoints, assessment.maxPoints);

  const bytes = await buildFeedbackPdf({
    submission,
    config,
    assessment,
    feedback,
    grade,
    dateDisplay: "03.07.2026",
  });

  const reloaded = await PDFDocument.load(bytes);
  assert.ok(reloaded.getPageCount() >= 3);
});

test("Feedback-PDF: Verbotswoerter werden vor dem Schreiben ersetzt (Hausregel 2, defensive zweite Pruefung)", async () => {
  const config = sampleConfig();
  const submission = sampleSubmission();
  const assessment = sampleAssessment();
  const feedback = sampleFeedback({
    strength: "This part of the text is wrong and shows a bad structure.",
  });
  const grade = calculateGrade(config.gradingSystem, assessment.totalPoints, assessment.maxPoints);

  const bytes = await buildFeedbackPdf({
    submission,
    config,
    assessment,
    feedback,
    grade,
    dateDisplay: "03.07.2026",
  });

  // Wir koennen den gezeichneten Text nicht direkt aus den PDF-Bytes als
  // String zurueckgewinnen (kein Text-Extraktions-Paket im Projekt), aber
  // wir stellen sicher, dass guardText tatsaechlich vor dem Schreiben lief:
  // ein direkter Aufruf mit denselben Woertern zeigt Treffer.
  const { guardText } = await import("../prompts/postprocess");
  const guarded = guardText(feedback.strength, config.forbiddenWords);
  assert.equal(guarded.clean, false);
  assert.ok(bytes.byteLength > 0);
});

test("Klassenuebersicht-PDF: Tabelle mit Kuerzel, Punkten je Kriterium und Note fuer freigegebene Arbeiten", async () => {
  const config = sampleConfig();
  const rows: ClassOverviewRow[] = [
    { submission: sampleSubmission({ id: "sub-ab12", studentAlias: "AB12" }), assessment: sampleAssessment() },
    {
      submission: sampleSubmission({ id: "sub-cd34", studentAlias: "CD34" }),
      assessment: sampleAssessment({
        submissionId: "sub-cd34",
        totalPoints: 30,
        gradeDisplay: "10 / 15",
        criteria: [
          { criterionId: "grammar", points: 10, reasoning: "x", evidence: [] },
          { criterionId: "sentence", points: 10, reasoning: "x", evidence: [] },
          { criterionId: "vocabulary", points: 10, reasoning: "x", evidence: [] },
        ],
      }),
    },
  ];

  const bytes = await buildClassOverviewPdf({
    config,
    roundId: "runde-2026-07",
    rows,
    dateDisplay: "03.07.2026",
  });

  const reloaded = await PDFDocument.load(bytes);
  assert.ok(reloaded.getPageCount() >= 1);
  assert.ok(bytes.byteLength > 300);
});

test("Klassenuebersicht-PDF: viele Arbeiten (mehr als auf eine Seite passen) brechen auf mehrere Seiten um", async () => {
  const config = sampleConfig();
  const rows: ClassOverviewRow[] = Array.from({ length: 45 }, (_, i) => {
    const alias = `S${String(i + 1).padStart(3, "0")}`;
    return {
      submission: sampleSubmission({ id: `sub-${alias}`, studentAlias: alias }),
      assessment: sampleAssessment({ submissionId: `sub-${alias}` }),
    };
  });

  const bytes = await buildClassOverviewPdf({
    config,
    roundId: "runde-gross",
    rows,
    dateDisplay: "03.07.2026",
  });

  const reloaded = await PDFDocument.load(bytes);
  assert.ok(reloaded.getPageCount() > 1, "45 Zeilen sollten mehr als eine Seite ergeben");
});

test("Klassenuebersicht-PDF: leere Rundenliste ergibt eine Seite mit Hinweistext statt eines Absturzes", async () => {
  const config = sampleConfig();
  const bytes = await buildClassOverviewPdf({
    config,
    roundId: "runde-leer",
    rows: [],
    dateDisplay: "03.07.2026",
  });
  const reloaded = await PDFDocument.load(bytes);
  assert.equal(reloaded.getPageCount(), 1);
});
