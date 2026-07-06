/*
  Tests fuer die Kernlogik der Pruefen-Seite (AP6): Parsing der
  Unsicherheits-Markierungen [[wort?]] und die Bestaetigen-Sperre.
*/

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  canConfirmTranscript,
  countUnclearMarkers,
  estimateLineHighlight,
  groupLinesByPage,
  hasUnclearMarkers,
  splitUnclearSegments,
  transcriptHasUnclearMarkers,
  transcriptUnclearCount,
} from "../review/unclear";
import type { Transcript, TranscriptLine } from "../types";

test("countUnclearMarkers: zaehlt [[wort?]]-Markierungen in einer Zeile", () => {
  assert.equal(countUnclearMarkers("Ganz normaler Text."), 0);
  assert.equal(countUnclearMarkers("Ein [[unsicheres?]] Wort."), 1);
  assert.equal(countUnclearMarkers("[[eins?]] und [[zwei?]] und [[drei?]]"), 3);
  assert.equal(countUnclearMarkers("[[?]]"), 1);
});

test("hasUnclearMarkers: erkennt, ob noch mindestens eine Markierung da ist", () => {
  assert.equal(hasUnclearMarkers("Alles klar."), false);
  assert.equal(hasUnclearMarkers("Fast [[fertig?]]."), true);
});

test("splitUnclearSegments: zerlegt eine Zeile in normale und unsichere Abschnitte", () => {
  const segments = splitUnclearSegments("Das ist [[schwer?]] zu lesen.");
  assert.deepEqual(
    segments.map((s) => [s.kind, s.text]),
    [
      ["plain", "Das ist "],
      ["unclear", "schwer"],
      ["plain", " zu lesen."],
    ],
  );
});

test("splitUnclearSegments: [[?]] ohne Text ergibt einen leeren unsicheren Abschnitt", () => {
  const segments = splitUnclearSegments("[[?]]");
  assert.equal(segments.length, 1);
  assert.equal(segments[0].kind, "unclear");
  assert.equal(segments[0].text, "");
});

test("splitUnclearSegments: reiner Text ohne Markierung ergibt einen einzigen plain-Abschnitt", () => {
  const segments = splitUnclearSegments("Ganz normaler Text.");
  assert.equal(segments.length, 1);
  assert.equal(segments[0].kind, "plain");
  assert.equal(segments[0].text, "Ganz normaler Text.");
});

test("splitUnclearSegments: leere Zeile ergibt einen leeren Abschnitt, keinen Absturz", () => {
  const segments = splitUnclearSegments("");
  assert.equal(segments.length, 1);
  assert.equal(segments[0].text, "");
});

test("transcriptUnclearCount und transcriptHasUnclearMarkers ueber mehrere Zeilen", () => {
  const lines: TranscriptLine[] = [
    { index: 0, text: "Alles klar hier." },
    { index: 1, text: "Ein [[unsicheres?]] Wort und noch [[eins?]]." },
    { index: 2, text: "Wieder klar." },
  ];
  assert.equal(transcriptUnclearCount(lines), 2);
  assert.equal(transcriptHasUnclearMarkers(lines), true);

  const cleared: TranscriptLine[] = [
    { index: 0, text: "Alles klar hier." },
    { index: 1, text: "Ein geklaertes Wort und noch eins." },
  ];
  assert.equal(transcriptUnclearCount(cleared), 0);
  assert.equal(transcriptHasUnclearMarkers(cleared), false);
});

function makeTranscript(lines: TranscriptLine[]): Transcript {
  return {
    submissionId: "sub-test",
    lines,
    unclearCount: transcriptUnclearCount(lines),
    confirmed: false,
    updatedAt: new Date().toISOString(),
  };
}

test("canConfirmTranscript: Sperre so lange noch [[wort?]] im Text steht", () => {
  const withUncertainty = makeTranscript([
    { index: 0, text: "Text mit [[luecke?]]." },
  ]);
  assert.equal(canConfirmTranscript(withUncertainty), false);

  const cleared = makeTranscript([{ index: 0, text: "Text ohne Luecke." }]);
  assert.equal(canConfirmTranscript(cleared), true);
});

test("canConfirmTranscript: kein Transkript oder keine Zeilen sperrt ebenfalls", () => {
  assert.equal(canConfirmTranscript(null), false);
  assert.equal(canConfirmTranscript(undefined), false);
  assert.equal(canConfirmTranscript(makeTranscript([])), false);
});

test("canConfirmTranscript: drei unsichere Woerter, alle drei muessen geklaert werden", () => {
  const threeUnclear = makeTranscript([
    { index: 0, text: "Erste [[zeile?]] mit einer Stelle." },
    { index: 1, text: "Zweite Zeile mit [[zwei?]] und [[drei?]] Stellen." },
  ]);
  assert.equal(transcriptUnclearCount(threeUnclear.lines), 3);
  assert.equal(canConfirmTranscript(threeUnclear), false);

  // Nur zwei von drei geklaert: immer noch gesperrt.
  const twoCleared = makeTranscript([
    { index: 0, text: "Erste geklaerte Zeile mit einer Stelle." },
    { index: 1, text: "Zweite Zeile mit geklaert und [[drei?]] Stellen." },
  ]);
  assert.equal(canConfirmTranscript(twoCleared), false);

  // Alle drei geklaert: jetzt frei.
  const allCleared = makeTranscript([
    { index: 0, text: "Erste geklaerte Zeile mit einer Stelle." },
    { index: 1, text: "Zweite Zeile mit geklaert und alles Stellen." },
  ]);
  assert.equal(canConfirmTranscript(allCleared), true);
});

test("estimateLineHighlight: nutzt echte Position, wenn vorhanden", () => {
  const line: TranscriptLine = {
    index: 2,
    text: "Zeile mit echter Position.",
    position: { pageIndex: 1, top: 0.4, bottom: 0.5 },
  };
  const highlight = estimateLineHighlight(line, [line]);
  assert.equal(highlight.estimated, false);
  assert.equal(highlight.pageIndex, 1);
  assert.equal(highlight.top, 0.4);
  assert.equal(highlight.bottom, 0.5);
});

test("estimateLineHighlight: proportionale Schaetzung ueber die Zeilennummer ohne echte Position", () => {
  const lines: TranscriptLine[] = [
    { index: 0, text: "Erste Zeile.", position: { pageIndex: 0, top: 0, bottom: 0 } },
    { index: 1, text: "Zweite Zeile.", position: { pageIndex: 0, top: 0, bottom: 0 } },
    { index: 2, text: "Dritte Zeile.", position: { pageIndex: 0, top: 0, bottom: 0 } },
    { index: 3, text: "Vierte Zeile.", position: { pageIndex: 0, top: 0, bottom: 0 } },
  ];
  const highlight = estimateLineHighlight(lines[1], lines);
  assert.equal(highlight.estimated, true);
  assert.equal(highlight.pageIndex, 0);
  // Zweite von vier Zeilen: Bereich 0.25 bis 0.5.
  assert.ok(Math.abs(highlight.top - 0.25) < 1e-9);
  assert.ok(Math.abs(highlight.bottom - 0.5) < 1e-9);
});

test("groupLinesByPage: gruppiert Zeilen nach Seitenindex", () => {
  const lines: TranscriptLine[] = [
    { index: 0, text: "a", position: { pageIndex: 0, top: 0, bottom: 0 } },
    { index: 1, text: "b", position: { pageIndex: 0, top: 0, bottom: 0 } },
    { index: 2, text: "c", position: { pageIndex: 1, top: 0, bottom: 0 } },
  ];
  const grouped = groupLinesByPage(lines);
  assert.equal(grouped.get(0)?.length, 2);
  assert.equal(grouped.get(1)?.length, 1);
});

test("groupLinesByPage: Zeilen ohne Position landen auf Seite 0", () => {
  const lines: TranscriptLine[] = [{ index: 0, text: "ohne Position" }];
  const grouped = groupLinesByPage(lines);
  assert.equal(grouped.get(0)?.length, 1);
});
