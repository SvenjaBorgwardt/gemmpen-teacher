/*
  Manueller Seed fuer einen Klick-/curl-Test der Export-Seite (AP8, nicht Teil
  von npm test). Legt eine Fach-Konfiguration, eine freigegebene Arbeit
  (inklusive Assessment und Feedback), eine noch nicht freigegebene Arbeit
  (Status "checked", damit der Pending-Zweig sichtbar wird) und ein paar
  DPO-Korrektur-Paare im aktuellen GEMMPEN_DATA_DIR an.

  Aufruf:
    GEMMPEN_DATA_DIR=... node --experimental-strip-types --loader ./lib/__tests__/resolve-ts.mjs test/seed-export-manual.mjs
*/
import {
  appendDpoPair,
  writeAssessment,
  writeConfig,
  writeFeedback,
  writeSubmission,
  writeTranscript,
} from "../lib/storage.ts";

const now = new Date().toISOString();

const config = {
  id: "englisch-comment-export",
  name: "Englisch Comment (Export-Test)",
  subject: "Englisch",
  textLanguage: "en",
  feedbackLanguage: "de",
  classLevel: "IAF31",
  level: "B1-B2",
  gradingSystem: "nrw-points",
  feedbackStyle: { tone: "warm und klar", length: "medium", includePractice: true },
  forbiddenWords: ["wrong", "bad", "poor", "fail", "lack", "weak", "missing", "incorrect"],
  rubric: {
    taskPrompt: "Verfasse eine Stellungnahme zur Einfuehrung von KI-Werkzeugen am Arbeitsplatz.",
    expectedPoints: ["Einleitung nennt das Thema", "Schluss fasst die Position zusammen"],
    criteria: [
      { id: "grammar", name: "Grammatik", description: "Korrektheit der Strukturen.", maxPoints: 15, colorKey: "grammar" },
      { id: "sentence", name: "Satzbau", description: "Varianz und Kohaesion.", maxPoints: 15, colorKey: "sentence" },
    ],
    calibrationSamples: [],
  },
  createdAt: now,
  updatedAt: now,
};
await writeConfig(config);

const roundId = "runde-export-manual";

// Arbeit 1: vollstaendig freigegeben, exportierbar.
const released = "sub-relA1";
await writeSubmission({
  id: released,
  roundId,
  configId: config.id,
  studentAlias: "RE01",
  pages: [{ index: 0, imagePath: "pages/p1.png", templateDetected: true }],
  status: "released",
  createdAt: now,
  updatedAt: now,
});
await writeTranscript(roundId, {
  submissionId: released,
  lines: [{ index: 0, text: "AI tools can support the team in daily tasks." }],
  unclearCount: 0,
  confirmed: true,
  updatedAt: now,
});
await writeAssessment(roundId, {
  submissionId: released,
  configId: config.id,
  criteria: [
    { criterionId: "grammar", points: 13, reasoning: "Strukturen sind sicher.", evidence: ["AI tools can support the team"] },
    { criterionId: "sentence", points: 11, reasoning: "Saetze sind verbunden.", evidence: ["in daily tasks"] },
  ],
  totalPoints: 24,
  maxPoints: 30,
  gradeDisplay: "12 / 15",
  released: true,
  createdAt: now,
  updatedAt: now,
});
await writeFeedback(roundId, {
  submissionId: released,
  strength: "Deine Einleitung nennt das Thema sofort.",
  observations: [
    { criterionId: "grammar", text: "Deine Zeitformen sind durchgehend sicher.", quote: "AI tools can support the team" },
  ],
  nextStep: "Ergaenze im naechsten Text ein weiteres Beispiel.",
  practice: "Schreibe einen zusaetzlichen Absatz mit einem Beispiel aus deinem Alltag.",
  updatedAt: now,
});

// Arbeit 2: noch nicht freigegeben (Status "checked" -> steht beim Bewerten).
const pending = "sub-penB2";
await writeSubmission({
  id: pending,
  roundId,
  configId: config.id,
  studentAlias: "PE02",
  pages: [{ index: 0, imagePath: "pages/p2.png", templateDetected: true }],
  status: "checked",
  createdAt: now,
  updatedAt: now,
});
await writeTranscript(roundId, {
  submissionId: pending,
  lines: [{ index: 0, text: "This is another student text." }],
  unclearCount: 0,
  confirmed: true,
  updatedAt: now,
});

// DPO-Paare fuer die Runde (Korrektur-Datei).
await appendDpoPair(roundId, {
  id: "dpo-1",
  submissionId: released,
  configId: config.id,
  kind: "score",
  criterionId: "grammar",
  context: "Kriterium Grammatik",
  rejected: "12",
  chosen: "13",
  createdAt: now,
});
await appendDpoPair(roundId, {
  id: "dpo-2",
  submissionId: released,
  configId: config.id,
  kind: "feedback",
  context: "Feedback-Staerke",
  rejected: "Guter Anfang.",
  chosen: "Deine Einleitung nennt das Thema sofort.",
  createdAt: now,
});

console.log("Seed fertig:", roundId, "released:", released, "pending:", pending, "config:", config.id);
