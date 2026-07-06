/*
  Detailansicht und Korrektur einer einzelnen Arbeit (AP6).

  GET  /api/review/submission?round=&id=
    -> Submission (inkl. Seiten-Bild-URLs), Transkript.

  POST /api/review/submission { roundId, submissionId, lines, studentAlias?, taskCode? }
    -> speichert die editierten Zeilen (Korrekturen der Lehrkraft) und
       optional eine uebernommene Kuerzel-/Aufgaben-Code-Aenderung (z.B. aus
       dem Kopfzeilen-Vorschlag). Setzt NIE selbststaendig confirmed=true;
       dafuer ist /api/review/confirm da.
*/

import { NextResponse } from "next/server";
import {
  readSubmission,
  writeSubmission,
  readTranscript,
  writeTranscript,
} from "@/lib/storage";
import { pageResultUrls } from "@/lib/ingest/store";
import { transcriptUnclearCount, canConfirmTranscript } from "@/lib/review/unclear";
import type { TranscriptLine } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("round");
  const submissionId = url.searchParams.get("id");
  if (!roundId || !submissionId) {
    return NextResponse.json({ error: "round und id sind erforderlich." }, { status: 400 });
  }

  const submission = await readSubmission(roundId, submissionId);
  if (!submission) {
    return NextResponse.json({ error: "Arbeit nicht gefunden." }, { status: 404 });
  }
  const transcript = await readTranscript(roundId, submissionId);

  const pages = submission.pages.map((page) => {
    const pageId = page.imagePath.replace(/^pages\//, "").replace(/\.png$/, "");
    return { ...page, ...pageResultUrls(roundId, pageId) };
  });

  return NextResponse.json({
    submission: { ...submission, pages },
    transcript,
    unclearCount: transcript ? transcriptUnclearCount(transcript.lines) : 0,
    canConfirm: canConfirmTranscript(transcript),
  });
}

interface SaveRequest {
  roundId: string;
  submissionId: string;
  lines: TranscriptLine[];
  studentAlias?: string;
  taskCode?: string;
}

export async function POST(req: Request) {
  let body: SaveRequest;
  try {
    body = (await req.json()) as SaveRequest;
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }
  const roundId = (body.roundId || "").trim();
  const submissionId = (body.submissionId || "").trim();
  if (!roundId || !submissionId || !Array.isArray(body.lines)) {
    return NextResponse.json(
      { error: "round, id und lines sind erforderlich." },
      { status: 400 },
    );
  }

  const submission = await readSubmission(roundId, submissionId);
  const existingTranscript = await readTranscript(roundId, submissionId);
  if (!submission || !existingTranscript) {
    return NextResponse.json({ error: "Arbeit oder Transkript nicht gefunden." }, { status: 404 });
  }

  const lines: TranscriptLine[] = body.lines.map((l, i) => ({
    index: typeof l.index === "number" ? l.index : i,
    text: typeof l.text === "string" ? l.text : "",
    position: l.position,
  }));

  const updatedTranscript = {
    ...existingTranscript,
    lines,
    unclearCount: transcriptUnclearCount(lines),
    // Eine Korrektur macht ein zuvor bestaetigtes Transkript wieder offen,
    // falls doch noch eine Unsicherheit uebrig ist; ansonsten bleibt der
    // bestaetigte Zustand unveraendert (die Lehrkraft bestaetigt separat).
    confirmed: existingTranscript.confirmed && !lines.some((l) => /\[\[[^\]]*\]\]/.test(l.text)),
    updatedAt: new Date().toISOString(),
  };
  await writeTranscript(roundId, updatedTranscript);

  if (body.studentAlias || body.taskCode) {
    await writeSubmission({
      ...submission,
      studentAlias: body.studentAlias?.trim() || submission.studentAlias,
      taskCode: body.taskCode?.trim() || submission.taskCode,
      updatedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    ok: true,
    transcript: updatedTranscript,
    unclearCount: transcriptUnclearCount(lines),
    canConfirm: canConfirmTranscript(updatedTranscript),
  });
}
