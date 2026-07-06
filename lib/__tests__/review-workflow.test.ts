/*
  Statuswechsel der Pruefen-Seite (AP6), end-to-end ueber lib/storage.ts in
  einen temporaeren Datenordner (wie lib/__tests__/wizard.test.ts es fuer den
  Assistenten macht). Deckt die Definition of Done ab: eine Beispiel-Submission
  mit zwei Seiten und einem Transkript mit drei unsicheren Woertern laesst
  sich pruefen (Korrekturen landen in data/submissions/) und erst nach
  Klaerung aller Unsicherheiten bestaetigen (Status wechselt sichtbar).

  Bewusst ohne HTTP-Server: die API-Routen unter app/api/review/* sind duenne
  Wrapper um lib/storage.ts und lib/review/unclear.ts; diese Tests pruefen die
  eigentliche Logik direkt, wie es die Routen tun wuerden.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { canConfirmTranscript, transcriptUnclearCount } from "../review/unclear";
import type { Submission, SubmissionPage, Transcript, TranscriptLine } from "../types";

test("Pruefen-Ablauf: zwei Seiten, drei unsichere Woerter, erst nach Klaerung bestaetigbar", async () => {
  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "gp-review-"));
  const previousDataDir = process.env.GEMMPEN_DATA_DIR;
  process.env.GEMMPEN_DATA_DIR = tmpRoot;

  try {
    const {
      writeSubmission,
      readSubmission,
      writeTranscript,
      readTranscript,
    } = await import("../storage");

    const roundId = "runde-test-2026";
    const submissionId = "sub-AB12";
    const now = new Date().toISOString();

    const pages: SubmissionPage[] = [
      { index: 0, imagePath: "pages/p1.png", headerImagePath: "pages/p1.header.png", templateDetected: true },
      { index: 1, imagePath: "pages/p2.png", templateDetected: true },
    ];

    const submission: Submission = {
      id: submissionId,
      roundId,
      configId: "",
      studentAlias: "AB12",
      pages,
      status: "ingested",
      headerSuggestion: { taskCode: "NSLOG01", studentAlias: "AB12", sheetNumber: "1" },
      createdAt: now,
      updatedAt: now,
    };
    await writeSubmission(submission);

    // Transkript mit drei unsicheren Woertern, verteilt ueber zwei Seiten.
    const lines: TranscriptLine[] = [
      {
        index: 0,
        text: "This is a [[cleer?]] sentence about AI.",
        position: { pageIndex: 0, top: 0, bottom: 0 },
      },
      {
        index: 1,
        text: "Another line without any issue.",
        position: { pageIndex: 0, top: 0, bottom: 0 },
      },
      {
        index: 2,
        text: "A [[secnd?]] page starts [[hree?]].",
        position: { pageIndex: 1, top: 0, bottom: 0 },
      },
    ];
    const transcript: Transcript = {
      submissionId,
      lines,
      unclearCount: transcriptUnclearCount(lines),
      confirmed: false,
      updatedAt: now,
    };
    await writeTranscript(roundId, transcript);

    // Vorher: drei unsichere Stellen, Bestaetigen ist gesperrt.
    const loaded = await readTranscript(roundId, submissionId);
    assert.ok(loaded);
    assert.equal(transcriptUnclearCount(loaded!.lines), 3);
    assert.equal(canConfirmTranscript(loaded), false);

    // Lehrkraft klaert zwei der drei Stellen (wie ein POST an
    // /api/review/submission es tun wuerde: Zeilen ersetzen, neu speichern).
    const partiallyFixed = loaded!.lines.map((l) =>
      l.index === 0 ? { ...l, text: "This is a clear sentence about AI." } : l,
    );
    await writeTranscript(roundId, {
      ...loaded!,
      lines: partiallyFixed,
      unclearCount: transcriptUnclearCount(partiallyFixed),
      updatedAt: new Date().toISOString(),
    });
    const afterPartial = await readTranscript(roundId, submissionId);
    assert.equal(transcriptUnclearCount(afterPartial!.lines), 2);
    assert.equal(canConfirmTranscript(afterPartial), false);

    // Letzte Stelle klaeren: jetzt bestaetigbar.
    const fullyFixed = afterPartial!.lines.map((l) =>
      l.index === 2 ? { ...l, text: "A second page starts here." } : l,
    );
    await writeTranscript(roundId, {
      ...afterPartial!,
      lines: fullyFixed,
      unclearCount: transcriptUnclearCount(fullyFixed),
      updatedAt: new Date().toISOString(),
    });
    const beforeConfirm = await readTranscript(roundId, submissionId);
    assert.equal(transcriptUnclearCount(beforeConfirm!.lines), 0);
    assert.equal(canConfirmTranscript(beforeConfirm), true);

    // Bestaetigen (wie POST /api/review/confirm): transcript.confirmed=true,
    // submission.status="checked".
    await writeTranscript(roundId, {
      ...beforeConfirm!,
      confirmed: true,
      updatedAt: new Date().toISOString(),
    });
    const currentSubmission = await readSubmission(roundId, submissionId);
    await writeSubmission({
      ...currentSubmission!,
      status: "checked",
      updatedAt: new Date().toISOString(),
    });

    const finalTranscript = await readTranscript(roundId, submissionId);
    const finalSubmission = await readSubmission(roundId, submissionId);
    assert.equal(finalTranscript!.confirmed, true);
    assert.equal(finalSubmission!.status, "checked");

    // Der Kopfzeilen-Vorschlag bleibt erhalten und hat nie automatisch den
    // Namen ueberschrieben (er wurde in diesem Test nie uebernommen).
    assert.equal(finalSubmission!.studentAlias, "AB12");
    assert.equal(finalSubmission!.headerSuggestion?.studentAlias, "AB12");
  } finally {
    if (previousDataDir === undefined) delete process.env.GEMMPEN_DATA_DIR;
    else process.env.GEMMPEN_DATA_DIR = previousDataDir;
    await rm(tmpRoot, { recursive: true, force: true });
  }
});

test("Bestaetigen-Sperre: eine erneute Unsicherheit macht eine Arbeit wieder ungueltig fuer die Bestaetigung", () => {
  // Simuliert das Verhalten aus app/api/review/submission/route.ts: eine
  // Korrektur, die eine neue Unsicherheit einfuehrt (z.B. Tippfehler-Marker
  // von Hand eingetragen), darf canConfirm nicht mehr erlauben.
  const lines: TranscriptLine[] = [{ index: 0, text: "Vorher klar." }];
  const transcript: Transcript = {
    submissionId: "sub-x",
    lines,
    unclearCount: 0,
    confirmed: false,
    updatedAt: new Date().toISOString(),
  };
  assert.equal(canConfirmTranscript(transcript), true);

  const withNewUncertainty: Transcript = {
    ...transcript,
    lines: [{ index: 0, text: "Jetzt doch [[unsicher?]]." }],
  };
  assert.equal(canConfirmTranscript(withNewUncertainty), false);
});
