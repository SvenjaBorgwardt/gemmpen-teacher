/*
  Textumbruch fuer die PDF-Erzeugung (AP8, lib/pdf/wrap.ts).
  Reine Funktionstests mit einer einfachen Zeichen-Zaehlung als Messfunktion,
  kein echtes PDF-Rendering noetig.
*/

import { test } from "node:test";
import assert from "node:assert/strict";

import { wrapText, paginateLines } from "../pdf/wrap";

/** Einfache Messfunktion: eine Einheit je Zeichen (deterministisch, testbar). */
const charWidth: (text: string) => number = (t) => t.length;

test("kurzer Text, der ganz in eine Zeile passt, bleibt eine Zeile", () => {
  const lines = wrapText("Kurzer Satz.", 50, charWidth);
  assert.deepEqual(lines, ["Kurzer Satz."]);
});

test("langer Text wird an Wortgrenzen umgebrochen, kein Wort wird mitten drin getrennt", () => {
  const text = "Dies ist ein laengerer Satz der mehrere Zeilen braucht um vollstaendig zu passen";
  const lines = wrapText(text, 20, charWidth);
  assert.ok(lines.length > 1, "sollte mehrere Zeilen ergeben");
  for (const line of lines) {
    assert.ok(line.length <= 20, `Zeile "${line}" ueberschreitet die Breite`);
  }
  // Kein Zeichen geht verloren: alle Woerter aus dem Original tauchen in der
  // zusammengefuegten Ausgabe wieder auf.
  const rejoined = lines.join(" ").replace(/\s+/g, " ");
  const originalWords = text.split(/\s+/);
  const rejoinedWords = rejoined.split(/\s+/);
  assert.deepEqual(rejoinedWords, originalWords);
});

test("ein einzelnes Wort, das breiter als die Zeile ist, wird hart umgebrochen (nichts geht verloren)", () => {
  const longWord = "Donaudampfschifffahrtsgesellschaftskapitaen";
  const lines = wrapText(longWord, 10, charWidth);
  assert.ok(lines.length > 1);
  for (const line of lines) {
    assert.ok(line.length <= 10);
  }
  assert.equal(lines.join(""), longWord);
});

test("bestehende Zeilenumbrueche werden als Absatzgrenzen respektiert", () => {
  const text = "Erster Absatz.\nZweiter Absatz.";
  const lines = wrapText(text, 100, charWidth);
  assert.deepEqual(lines, ["Erster Absatz.", "Zweiter Absatz."]);
});

test("leere Absaetze erzeugen eine leere Zeile fuer Abstand", () => {
  const text = "Erster Absatz.\n\nDritter Absatz nach einer Leerzeile.";
  const lines = wrapText(text, 100, charWidth);
  assert.deepEqual(lines, ["Erster Absatz.", "", "Dritter Absatz nach einer Leerzeile."]);
});

test("leerer Text ergibt eine einzelne leere Zeile statt eines Absturzes", () => {
  const lines = wrapText("", 50, charWidth);
  assert.deepEqual(lines, [""]);
});

test("sehr lange Feedback-Texte (mehrere Saetze) brechen sauber um, keine Zeile ist zu breit", () => {
  const longFeedback =
    "Deine Einleitung nennt das Thema klar und du nutzt ein passendes Beispiel aus dem Text. " +
    "Im zweiten Gegenargument fehlt noch ein Beleg, der die Behauptung stuetzt. " +
    "Achte beim naechsten Mal darauf, jedes Argument mit einer Begruendung und einem Beispiel zu vervollstaendigen.";
  const maxWidth = 60;
  const lines = wrapText(longFeedback, maxWidth, charWidth);
  assert.ok(lines.length > 3);
  for (const line of lines) {
    assert.ok(line.length <= maxWidth, `Zeile zu breit: "${line}" (${line.length})`);
  }
});

test("paginateLines teilt Zeilen in Seiten mit fester Zeilenzahl auf", () => {
  const lines = Array.from({ length: 25 }, (_, i) => `Zeile ${i + 1}`);
  const pages = paginateLines(lines, 10);
  assert.equal(pages.length, 3);
  assert.equal(pages[0].length, 10);
  assert.equal(pages[1].length, 10);
  assert.equal(pages[2].length, 5);
  // Keine Zeile geht verloren oder wird verdoppelt.
  assert.deepEqual(pages.flat(), lines);
});

test("paginateLines mit leerer Zeilenliste ergibt eine leere Seite statt eines Absturzes", () => {
  const pages = paginateLines([], 10);
  assert.deepEqual(pages, [[]]);
});
