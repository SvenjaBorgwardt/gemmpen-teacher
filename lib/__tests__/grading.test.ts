/*
  Notenberechnung (AP7, lib/grading/grade.ts) in allen drei Notensystemen.
  Reine Funktionstests, kein Dateizugriff noetig.
*/

import { test } from "node:test";
import assert from "node:assert/strict";

import { calculateGrade, sumPoints } from "../grading/grade";

test("NRW-Notenpunkte: volle Punkte ergeben 15/15 und sehr gut", () => {
  const g = calculateGrade("nrw-points", 42, 42);
  assert.equal(g.display, "15 / 15");
  assert.equal(g.label, "sehr gut");
  assert.equal(g.ratio, 1);
});

test("NRW-Notenpunkte: die Haelfte der Punkte ergibt eine mittlere Einordnung", () => {
  const g = calculateGrade("nrw-points", 21, 42);
  assert.equal(g.display, "7.5 / 15");
  assert.equal(g.label, "befriedigend");
});

test("NRW-Notenpunkte: null Punkte ergeben ungenuegend", () => {
  const g = calculateGrade("nrw-points", 0, 42);
  assert.equal(g.display, "0 / 15");
  assert.equal(g.label, "ungenuegend");
});

test("Schulnoten 1-6: volle Punkte ergeben Note 1", () => {
  const g = calculateGrade("grades-1-6", 30, 30);
  assert.equal(g.display, "1,0");
  assert.equal(g.label, "sehr gut");
});

test("Schulnoten 1-6: null Punkte ergeben Note 6", () => {
  const g = calculateGrade("grades-1-6", 0, 30);
  assert.equal(g.display, "6,0");
  assert.equal(g.label, "ungenuegend");
});

test("Schulnoten 1-6: 80 Prozent liegen im guten Bereich", () => {
  const g = calculateGrade("grades-1-6", 24, 30);
  // 80% -> Note 2,0
  assert.equal(g.display, "2,0");
  assert.equal(g.label, "gut");
});

test("Prozent: volle Punkte ergeben 100 Prozent", () => {
  const g = calculateGrade("percent", 20, 20);
  assert.equal(g.display, "100 %");
  assert.equal(g.label, "sehr gut");
});

test("Prozent: die Haelfte der Punkte ergibt 50 Prozent", () => {
  const g = calculateGrade("percent", 10, 20);
  assert.equal(g.display, "50 %");
});

test("Notenberechnung reagiert auf jede Punktaenderung (dasselbe Maximum, andere Punkte)", () => {
  const before = calculateGrade("percent", 10, 20);
  const after = calculateGrade("percent", 15, 20);
  assert.notEqual(before.display, after.display);
  assert.equal(after.display, "75 %");
});

test("Notenberechnung bei Punkte-Maximum 0 bricht nicht ab (ratio 0)", () => {
  const g = calculateGrade("nrw-points", 0, 0);
  assert.equal(g.ratio, 0);
  assert.equal(g.display, "0 / 15");
});

test("Punkte ausserhalb der Spanne werden begrenzt (negativ und ueber Maximum)", () => {
  const negative = calculateGrade("percent", -5, 20);
  assert.equal(negative.ratio, 0);
  const overMax = calculateGrade("percent", 25, 20);
  assert.equal(overMax.ratio, 1);
});

test("sumPoints summiert eine Liste von Kriterien-Punkten", () => {
  assert.equal(sumPoints([5, 10, 0, 3.5]), 18.5);
  assert.equal(sumPoints([]), 0);
});
