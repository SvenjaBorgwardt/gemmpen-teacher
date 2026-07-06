/*
  Schema-Validierung: alle drei Beispiel-Konfigurationen muessen gueltig sein,
  und typische Verstoesse muessen erkannt werden.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSubjectConfig } from "../rubric/validate";
import { loadExample, exampleIds } from "./helpers";

test("drei Beispiel-Konfigurationen existieren", () => {
  const ids = exampleIds();
  assert.deepEqual(ids, ["deutsch-eroerterung", "englisch-comment", "wirtschaft-fachtext"]);
});

for (const id of ["englisch-comment", "deutsch-eroerterung", "wirtschaft-fachtext"]) {
  test(`Beispiel-Konfiguration ${id} ist gueltig`, () => {
    const config = loadExample(id);
    const result = validateSubjectConfig(config);
    assert.equal(result.valid, true, JSON.stringify(result.errors, null, 2));
    assert.equal(result.errors.length, 0);
  });
}

test("fehlende Pflichtfelder werden erkannt", () => {
  const result = validateSubjectConfig({});
  assert.equal(result.valid, false);
  const paths = result.errors.map((e) => e.path);
  assert.ok(paths.includes("id"));
  assert.ok(paths.includes("rubric"));
});

test("ungueltiges Notensystem wird erkannt", () => {
  const config = loadExample("englisch-comment") as unknown as Record<string, unknown>;
  config.gradingSystem = "sterne-1-5";
  const result = validateSubjectConfig(config);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.path === "gradingSystem"));
});

test("teacherScores auf unbekanntes Kriterium wird erkannt", () => {
  const config = loadExample("englisch-comment");
  config.rubric.calibrationSamples[0].teacherScores["gibt-es-nicht"] = 5;
  const result = validateSubjectConfig(config);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.path.includes("gibt-es-nicht")));
});

test("Alles-oder-Nichts-Regel mit nur einem Teil wird erkannt", () => {
  const config = loadExample("englisch-comment");
  const cre = config.rubric.criteria.find((c) => c.allOrNothing);
  assert.ok(cre?.allOrNothing);
  cre.allOrNothing.parts = ["Claim"];
  const result = validateSubjectConfig(config);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.path.includes("allOrNothing.parts")));
});
