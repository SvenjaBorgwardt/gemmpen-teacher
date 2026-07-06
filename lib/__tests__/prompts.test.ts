/*
  Prompt-Rendering: mit einer Beispiel-Config muessen die drei Bausteine zu
  vollstaendigen Texten rendern (keine offenen {{platzhalter}}), die Pflicht-
  regeln muessen enthalten sein, und die Ausgabe muss stabil bleiben (Snapshot).

  Snapshot-Mechanik ohne Zusatzbibliothek: bei erstem Lauf oder mit
  UPDATE_SNAPSHOTS=1 werden die Snapshot-Dateien geschrieben, sonst verglichen.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderContentMatch,
  renderCriteriaScore,
  renderFeedback,
  renderRubricSuggest,
} from "../prompts/render";
import { parseJsonResponse } from "../prompts/chat";
import { createMockChatClient } from "../prompts/chat.mock";
import type { CriterionAssessment, RubricSuggestionResult } from "../types";
import { loadExample } from "./helpers";

const here = path.dirname(fileURLToPath(import.meta.url));
const snapDir = path.join(here, "__snapshots__");
const update = process.env.UPDATE_SNAPSHOTS === "1";

function checkSnapshot(name: string, content: string): void {
  if (!existsSync(snapDir)) mkdirSync(snapDir, { recursive: true });
  const file = path.join(snapDir, name);
  if (update || !existsSync(file)) {
    writeFileSync(file, content, "utf8");
    return;
  }
  const expected = readFileSync(file, "utf8");
  assert.equal(content, expected, `Snapshot ${name} weicht ab. Mit UPDATE_SNAPSHOTS=1 neu schreiben, wenn gewollt.`);
}

function noOpenPlaceholders(text: string): void {
  const open = text.match(/\{\{\w+\}\}/g);
  assert.equal(open, null, `Offene Platzhalter gefunden: ${open?.join(", ")}`);
}

const config = loadExample("englisch-comment");
const studentText =
  "As an employee representative, I would like to comment on the plan to introduce AI tools. Many colleagues worry about their jobs.";

test("Raster-Vorschlag rendert vollstaendig und liefert ueber den Mock ein gueltiges Ergebnis", async () => {
  const p = renderRubricSuggest({
    subject: config.subject,
    level: config.level,
    textLanguage: config.textLanguage,
    gradingSystem: config.gradingSystem,
    taskPrompt: config.rubric.taskPrompt,
    expectedPoints: config.rubric.expectedPoints,
  });
  noOpenPlaceholders(p.system);
  noOpenPlaceholders(p.user);
  assert.ok(p.user.includes("Erwartungshorizont (was eine gute Bearbeitung"));
  assert.ok(p.user.includes(config.rubric.taskPrompt));
  checkSnapshot("rubric-suggest.system.txt", p.system);
  checkSnapshot("rubric-suggest.user.txt", p.user);

  const client = createMockChatClient();
  const raw = await client.complete(p);
  const parsed = parseJsonResponse<RubricSuggestionResult>(raw);
  assert.ok(Array.isArray(parsed.criteria));
  assert.ok(parsed.criteria.length > 0);
  for (const c of parsed.criteria) {
    assert.ok(c.id.length > 0);
    assert.ok(c.name.length > 0);
    assert.ok(c.maxPoints > 0);
  }
});

test("Inhaltsabgleich rendert vollstaendig", () => {
  const p = renderContentMatch(config, studentText);
  noOpenPlaceholders(p.system);
  noOpenPlaceholders(p.user);
  assert.ok(p.system.includes(config.feedbackLanguage));
  assert.ok(p.user.includes("Erwartete inhaltliche Punkte"));
  assert.ok(p.user.includes(studentText));
  // Erwartungshorizont ist nummeriert ab 0.
  assert.ok(/^0\. /m.test(p.user));
  checkSnapshot("content-match.system.txt", p.system);
  checkSnapshot("content-match.user.txt", p.user);
});

test("Kriterien-Bewertung rendert vollstaendig, mit CRE-Regel", () => {
  const p = renderCriteriaScore(config, studentText);
  noOpenPlaceholders(p.system);
  noOpenPlaceholders(p.user);
  assert.ok(p.user.includes("Bewertungskriterien:"));
  // Alle Kriterien-ids stehen im Prompt.
  for (const c of config.rubric.criteria) {
    assert.ok(p.user.includes(`id: ${c.id}`), `id ${c.id} nicht im Prompt`);
  }
  // Alles-oder-Nichts-Regel ist erklaert.
  assert.ok(p.user.includes("Alles-oder-Nichts-Regel"));
  checkSnapshot("criteria-score.system.txt", p.system);
  checkSnapshot("criteria-score.user.txt", p.user);
});

test("Feedback rendert vollstaendig und enthaelt die Schutzregeln", () => {
  const assessment: CriterionAssessment[] = config.rubric.criteria.map((c) => ({
    criterionId: c.id,
    points: Math.max(0, c.maxPoints - 2),
    reasoning: "Testbegruendung.",
    evidence: ["worry about their jobs"],
  }));
  const p = renderFeedback(config, studentText, assessment);
  noOpenPlaceholders(p.system);
  noOpenPlaceholders(p.user);
  // Struktur Staerke -> Beobachtungen -> naechster Schritt.
  assert.ok(p.user.includes('"strength"'));
  assert.ok(p.user.includes('"observations"'));
  assert.ok(p.user.includes('"nextStep"'));
  // Verbotswoerter stehen als Verbotsliste im System-Teil.
  assert.ok(p.system.includes("Verwende keines dieser Woerter"));
  // Regel gegen verneinte Benennung des Unerwuenschten.
  assert.ok(p.system.includes("auch nicht verneint"));
  // includePractice = true -> Uebungshinweis vorhanden.
  assert.ok(p.system.includes("Uebungsvorschlag"));
  checkSnapshot("feedback.system.txt", p.system);
  checkSnapshot("feedback.user.txt", p.user);
});
