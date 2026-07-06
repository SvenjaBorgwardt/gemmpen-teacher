/*
  Schutzschild fuer verbotene Woerter (Hausregel 2).
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { guardText, findForbidden } from "../prompts/postprocess";
import { DEFAULT_FORBIDDEN_WORDS } from "../types";

test("verbotene Woerter werden ersetzt, ganze Woerter, ohne Ruecksicht auf Gross-/Kleinschreibung", () => {
  const words = ["falsch", "weak"];
  const r = guardText("Das ist Falsch und etwas weak.", words);
  assert.equal(r.clean, false);
  assert.ok(!/falsch/i.test(r.text));
  assert.ok(!/\bweak\b/i.test(r.text));
  assert.equal(r.hits.length, 2);
});

test("Teiltreffer innerhalb anderer Woerter zaehlen nicht", () => {
  // "lack" darf nicht in "black" treffen.
  const r = guardText("The black cat sleeps.", ["lack"]);
  assert.equal(r.clean, true);
  assert.equal(r.text, "The black cat sleeps.");
});

test("sauberer Text bleibt unveraendert", () => {
  const r = guardText("Du gehst die Aufgabe klar an.", DEFAULT_FORBIDDEN_WORDS);
  assert.equal(r.clean, true);
  assert.equal(r.hits.length, 0);
});

test("findForbidden meldet Treffer ohne zu ersetzen", () => {
  const hits = findForbidden("This is missing.", DEFAULT_FORBIDDEN_WORDS);
  assert.ok(hits.some((h) => h.word === "missing"));
});
