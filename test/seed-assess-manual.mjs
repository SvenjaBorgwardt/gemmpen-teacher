/*
  Manueller Seed fuer einen Klick-Test der Bewerten-Seite (nicht Teil von
  npm test). Legt eine Fach-Konfiguration, eine geprueft-bestaetigte Arbeit
  und ihr Transkript im aktuellen GEMMPEN_DATA_DIR an, damit die Bewerten-
  Seite ueber die echten API-Routen durchgeklickt werden kann (AP7-Review).
  Aufruf: GEMMPEN_DATA_DIR=... node --experimental-strip-types --loader ./lib/__tests__/resolve-ts.mjs test/seed-assess-manual.mjs
*/
import { writeConfig, writeSubmission, writeTranscript } from "../lib/storage.ts";

const now = new Date().toISOString();

const config = {
  id: "englisch-comment-manual",
  name: "Englisch Comment (manueller Test)",
  subject: "Englisch",
  textLanguage: "en",
  feedbackLanguage: "en",
  classLevel: "IAF31",
  level: "B1-B2",
  gradingSystem: "nrw-points",
  feedbackStyle: { tone: "warm und klar, ermutigend", length: "medium", includePractice: true },
  forbiddenWords: ["wrong", "bad", "poor", "fail", "lack", "weak", "missing", "incorrect", "falsch", "schlecht", "mangelhaft", "fehlt"],
  rubric: {
    taskPrompt: "Write a comment about introducing AI tools at the workplace.",
    expectedPoints: ["Introduction names the topic", "One argument with example"],
    criteria: [
      { id: "structure", name: "Structure", description: "Follows the required structure.", maxPoints: 15, colorKey: "sentence" },
      { id: "grammar", name: "Grammar", description: "Correct grammar.", maxPoints: 15, colorKey: "grammar" },
    ],
    calibrationSamples: [],
  },
  createdAt: now,
  updatedAt: now,
};
await writeConfig(config);

const roundId = "runde-manual-2026";
const submissionId = "sub-MT01";

await writeSubmission({
  id: submissionId,
  roundId,
  configId: config.id,
  studentAlias: "MT01",
  pages: [{ index: 0, imagePath: "pages/p1.png", templateDetected: true }],
  status: "checked",
  createdAt: now,
  updatedAt: now,
});

await writeTranscript(roundId, {
  submissionId,
  lines: [
    { index: 0, text: "AI tools can support the team in daily tasks." },
    { index: 1, text: '"This is a clear benefit," the writer explains with an example from the warehouse.' },
  ],
  unclearCount: 0,
  confirmed: true,
  updatedAt: now,
});

console.log("Seed fertig:", roundId, submissionId, config.id);
