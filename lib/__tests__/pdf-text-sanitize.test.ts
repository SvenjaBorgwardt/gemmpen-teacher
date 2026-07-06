/*
  Zeichen-Bereinigung fuer pdf-lib Standardfonts (AP8, lib/pdf/text-sanitize.ts).
  Reine Funktionstests, kein PDF-Rendering noetig.
*/

import { test } from "node:test";
import assert from "node:assert/strict";

import { sanitizeForWinAnsi, isWinAnsiSafe } from "../pdf/text-sanitize";

test("deutsche Umlaute und ss bleiben unveraendert (WinAnsi deckt sie ab)", () => {
  const input = "Grosse Uebung: Waeren, koennten, muessten - fuer Schueler mit ss und ẞ am Zeilenanfang.";
  const clean = sanitizeForWinAnsi(
    "Große Übung: Wären, könnten, müssten - für Schüler mit ß.",
  );
  // Alle Umlaute und ss bleiben exakt erhalten.
  assert.match(clean, /Große/);
  assert.match(clean, /Übung/);
  assert.match(clean, /Wären/);
  assert.match(clean, /könnten/);
  assert.match(clean, /müssten/);
  assert.match(clean, /für/);
  assert.match(clean, /Schüler/);
  assert.match(clean, /ß/);
  assert.ok(input.length > 0); // input nur zur Dokumentation des Testfalls oben
});

test("typografische Anfuehrungszeichen werden auf gerade Anfuehrungszeichen abgebildet", () => {
  const clean = sanitizeForWinAnsi("„Das war ein guter Anfang“, sagte sie.");
  assert.equal(clean, '"Das war ein guter Anfang", sagte sie.');
});

test("Gedankenstriche (en dash, em dash) werden zu einfachen Bindestrichen (Hausregel 1)", () => {
  assert.equal(sanitizeForWinAnsi("2020–2024"), "2020-2024");
  assert.equal(sanitizeForWinAnsi("Ein Gedanke — weitergefuehrt."), "Ein Gedanke - weitergefuehrt.");
});

test("nicht abbildbare Zeichen (z.B. Emoji) werden sauber durch ? ersetzt statt zu crashen", () => {
  const clean = sanitizeForWinAnsi("Gut gemacht \u{1F389}!");
  assert.doesNotThrow(() => clean);
  assert.equal(clean, "Gut gemacht ?!");
});

test("normale ASCII-Texte bleiben unveraendert", () => {
  const text = "This is a normal English sentence with 123 numbers.";
  assert.equal(sanitizeForWinAnsi(text), text);
  assert.ok(isWinAnsiSafe(text));
});

test("isWinAnsiSafe erkennt Texte, die Ersatz brauchen", () => {
  assert.equal(isWinAnsiSafe("café"), true); // e-acute ist in WinAnsi enthalten
  assert.equal(isWinAnsiSafe("Test – Test"), false); // en dash braucht Ersatz
  assert.equal(isWinAnsiSafe("emoji \u{1F600}"), false);
});

test("leere Eingabe ergibt leere Ausgabe", () => {
  assert.equal(sanitizeForWinAnsi(""), "");
});

test("kombinierte Umlaut-Zeichen (Basisbuchstabe + combining diaeresis) werden normalisiert", () => {
  // "a" + combining diaeresis (U+0308) soll zu "ä" (U+00E4, vorkomponiert) werden.
  const decomposed = "ä";
  const clean = sanitizeForWinAnsi(decomposed);
  assert.equal(clean, "ä");
});
