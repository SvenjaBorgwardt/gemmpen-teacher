/*
  Uebersicht einer Runde fuer die Pruefen-Seite (AP6).

  GET /api/review/rounds            -> Liste aller Runden-IDs
  GET /api/review/rounds?round=...  -> alle Arbeiten dieser Runde mit Status,
                                        Kuerzel, Kopfzeilen-Vorschlag, Seitenzahl
                                        und Unsicherheits-Zaehler.

  Die Erkennung selbst (Vision-Aufruf) laeuft weiter ueber
  POST /api/recognize/run (AP3); diese Route liest nur, was schon da ist.
*/

import { NextResponse } from "next/server";
import { listRoundsWithLabels, listSubmissions, readTranscript } from "@/lib/storage";
import { transcriptUnclearCount, canConfirmTranscript } from "@/lib/review/unclear";

export const runtime = "nodejs";

export interface ReviewSubmissionSummary {
  submissionId: string;
  studentAlias: string;
  taskCode?: string;
  status: string;
  pageCount: number;
  hasTranscript: boolean;
  confirmed: boolean;
  unclearCount: number;
  canConfirm: boolean;
  headerSuggestion?: {
    taskCode: string | null;
    studentAlias: string | null;
    sheetNumber: string | null;
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("round");

  if (!roundId) {
    const rounds = await listRoundsWithLabels();
    return NextResponse.json({ rounds });
  }

  const submissions = await listSubmissions(roundId);
  const items: ReviewSubmissionSummary[] = [];
  for (const s of submissions) {
    const transcript = await readTranscript(roundId, s.id);
    items.push({
      submissionId: s.id,
      studentAlias: s.studentAlias,
      taskCode: s.taskCode,
      status: s.status,
      pageCount: s.pages.length,
      hasTranscript: Boolean(transcript),
      confirmed: transcript?.confirmed ?? false,
      unclearCount: transcript ? transcriptUnclearCount(transcript.lines) : 0,
      canConfirm: canConfirmTranscript(transcript),
      headerSuggestion: s.headerSuggestion,
    });
  }

  return NextResponse.json({ roundId, items });
}
