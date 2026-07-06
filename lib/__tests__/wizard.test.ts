/*
  Wizard-Durchlauf (AP5): baut aus einem Formular-Entwurf eine SubjectConfig,
  laesst einen Raster-Vorschlag und eine Kalibrierung gegen den Mock-Client
  laufen (wie die API-Routen es tun) und speichert das Ergebnis ueber
  lib/storage.ts in einen temporaeren Datenordner. Deckt die Definition of
  Done ab: ein kompletter Durchlauf erzeugt eine valide Konfiguration in
  data/config/, der Kalibrierschritt funktioniert gegen den Mock.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  blankDraft,
  buildConfigFromDraft,
  draftFromConfig,
  makeLocalKey,
  newConfigId,
} from "../wizard/draft";
import { validateSubjectConfig } from "../rubric/validate";
import { runCalibration } from "../rubric/calibrate";
import { renderRubricSuggest } from "../prompts/render";
import { parseJsonResponse } from "../prompts/chat";
import { createMockChatClient } from "../prompts/chat.mock";
import type { RubricSuggestionResult, SubjectConfig } from "../types";

test("Wizard-Durchlauf: Entwurf plus Mock-Vorschlag ergibt eine gueltige Konfiguration", async () => {
  const draft = blankDraft();
  draft.subject = "Englisch";
  draft.textLanguage = "en";
  draft.feedbackLanguage = "en";
  draft.classLevel = "Testklasse";
  draft.level = "B1-B2";
  draft.taskPrompt = "Write a short comment about AI at the workplace.";
  draft.expectedPointsText = [
    "Introduction names the topic",
    "One argument with example",
    "Conclusion with own position",
  ].join("\n");

  // Schritt 3: Raster-Vorschlag ueber den Mock (wie /api/setup/suggest-rubric).
  const suggestPrompt = renderRubricSuggest({
    subject: draft.subject,
    level: draft.level,
    textLanguage: draft.textLanguage,
    gradingSystem: draft.gradingSystem,
    taskPrompt: draft.taskPrompt,
    expectedPoints: draft.expectedPointsText.split("\n"),
  });
  const mockClient = createMockChatClient();
  const suggestionRaw = await mockClient.complete(suggestPrompt);
  const suggestion = parseJsonResponse<RubricSuggestionResult>(suggestionRaw);
  assert.ok(suggestion.criteria.length > 0);

  draft.criteria = suggestion.criteria.map((c) => ({ ...c, localKey: makeLocalKey() }));

  // Schritt 5 (optional): eine Beispielarbeit mit Punkten je Kriterium.
  draft.calibrationSamples = [
    {
      localKey: makeLocalKey(),
      id: "beispiel-1",
      text: "As an employee representative, I want to comment on AI tools. For example, they can save time on repetitive tasks. In conclusion, I support a careful introduction.",
      note: "Testarbeit fuer den Wizard-Test.",
      scoreText: Object.fromEntries(draft.criteria.map((c) => [c.id, String(c.maxPoints - 1)])),
    },
  ];

  // Schritt 6: Konfiguration bauen und validieren (wie POST /api/setup/configs).
  const config = buildConfigFromDraft(draft, "Englisch Wizard-Test", []);
  const check = validateSubjectConfig(config);
  assert.equal(check.valid, true, JSON.stringify(check.errors));

  // Kalibrierung laeuft gegen den Mock (Schritt 5, wie /api/setup/calibrate).
  const report = await runCalibration(config, mockClient);
  assert.equal(report.samples.length, 1);
  assert.ok(report.perCriterion.length === config.rubric.criteria.length);

  // Speichern ueber lib/storage.ts in einen temporaeren Datenordner.
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "gp-wizard-"));
  const previousDataDir = process.env.GEMMPEN_DATA_DIR;
  process.env.GEMMPEN_DATA_DIR = tmpRoot;
  try {
    const { writeConfig, readConfig, listConfigs } = await import("../storage");
    await writeConfig(config);

    const loaded = await readConfig(config.id);
    assert.ok(loaded);
    assert.equal(loaded!.id, config.id);
    assert.equal(validateSubjectConfig(loaded).valid, true);

    const all = await listConfigs();
    assert.equal(all.length, 1);

    // Datei liegt tatsaechlich unter data/config/<id>.json.
    const raw = await readFile(path.join(tmpRoot, "config", `${config.id}.json`), "utf8");
    const parsed = JSON.parse(raw) as SubjectConfig;
    assert.equal(parsed.name, "Englisch Wizard-Test");
  } finally {
    if (previousDataDir === undefined) delete process.env.GEMMPEN_DATA_DIR;
    else process.env.GEMMPEN_DATA_DIR = previousDataDir;
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test("Bearbeiten: draftFromConfig behaelt die id, Duplizieren nicht", () => {
  const source: SubjectConfig = {
    id: "beispiel-fach",
    name: "Beispiel Fach",
    subject: "Deutsch",
    textLanguage: "de",
    feedbackLanguage: "de",
    classLevel: "Testklasse",
    level: "B2",
    gradingSystem: "grades-1-6",
    feedbackStyle: { tone: "warm", length: "medium", includePractice: false },
    forbiddenWords: ["schlecht"],
    rubric: {
      taskPrompt: "Testaufgabe",
      expectedPoints: ["Punkt A"],
      criteria: [{ id: "kriterium-1", name: "Kriterium 1", description: "Testet etwas.", maxPoints: 10 }],
      calibrationSamples: [],
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  const editDraft = draftFromConfig(source, true);
  assert.equal(editDraft.editingId, "beispiel-fach");
  assert.equal(editDraft.createdAt, source.createdAt);

  const duplicateDraft = draftFromConfig(source, false);
  assert.equal(duplicateDraft.editingId, null);
  assert.equal(duplicateDraft.createdAt, null);

  // Eine neue id fuer die Kopie unterscheidet sich vom Original.
  const newId = newConfigId("Beispiel Fach (2)", [source.id]);
  assert.notEqual(newId, source.id);
});
