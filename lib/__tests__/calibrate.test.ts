/*
  Kalibrierungslauf gegen den Mock-Client. Prueft, dass pro Kriterium und im
  Mittel eine Abweichung berechnet wird und die Struktur stimmt.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { runCalibration } from "../rubric/calibrate";
import { createMockChatClient } from "../prompts/chat.mock";
import { loadExample } from "./helpers";

test("Kalibrierung laeuft gegen den Mock und liefert Abweichungen", async () => {
  const config = loadExample("englisch-comment");
  const client = createMockChatClient({ pointsBelowMax: 1 });
  const report = await runCalibration(config, client);

  assert.equal(report.configId, "englisch-comment");
  // Zwei Beispielarbeiten sind hinterlegt.
  assert.equal(report.samples.length, 2);
  // Jede Beispielarbeit hat Abweichungen fuer jedes bewertete Kriterium.
  for (const sr of report.samples) {
    assert.ok(sr.deviations.length > 0);
    for (const d of sr.deviations) {
      assert.equal(d.absDelta, Math.abs(d.modelPoints - d.teacherPoints));
      assert.ok(d.maxPoints > 0);
    }
  }
  // perCriterion deckt alle Kriterien ab.
  assert.equal(report.perCriterion.length, config.rubric.criteria.length);
  // Mittlere Abweichung ist eine endliche Zahl >= 0.
  assert.ok(Number.isFinite(report.meanAbsDelta));
  assert.ok(report.meanAbsDelta >= 0);
});

test("Kalibrierung ohne Beispielarbeiten wirft verstaendlich", async () => {
  const config = loadExample("englisch-comment");
  config.rubric.calibrationSamples = [];
  const client = createMockChatClient();
  await assert.rejects(() => runCalibration(config, client), /keine Beispielarbeiten/);
});

test("Mock vergibt Maximalpunkte minus below; delta ist model minus teacher", async () => {
  const config = loadExample("deutsch-eroerterung");
  const report = await runCalibration(config, createMockChatClient({ pointsBelowMax: 1 }));
  // Fuer jedes bewertete Kriterium: modelPoints = maxPoints - 1 (nicht unter 0).
  for (const sr of report.samples) {
    for (const d of sr.deviations) {
      assert.equal(d.modelPoints, Math.max(0, d.maxPoints - 1));
      assert.equal(d.delta, d.modelPoints - d.teacherPoints);
    }
  }
});
