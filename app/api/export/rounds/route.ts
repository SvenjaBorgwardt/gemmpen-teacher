/*
  Uebersicht einer Runde fuer die Export-Seite (AP8).

  GET /api/export/rounds            -> Liste aller Runden-IDs
  GET /api/export/rounds?round=...  -> alle Arbeiten dieser Runde, aufgeteilt in
                                        freigegeben (exportierbar) und noch nicht
                                        freigegeben (mit Hinweis, wo die Arbeit
                                        gerade steht: Pruefen oder Bewerten).

  Export ist nur fuer freigegebene Arbeiten gedacht (Submission.status ===
  "released", siehe AP7-Uebergabe). Alles andere wird zwar aufgelistet, aber
  nicht exportiert, mit einem lesbaren Stand-Hinweis (Locale-Schluessel).
*/

import { NextResponse } from "next/server";
import { listRoundsWithLabels, listSubmissions, readAssessment, listConfigs } from "@/lib/storage";
import type { SubmissionStatus } from "@/lib/types";

export const runtime = "nodejs";

export interface ExportSubmissionSummary {
  submissionId: string;
  studentAlias: string;
  status: SubmissionStatus;
  released: boolean;
  gradeDisplay?: string;
  /** Locale-Schluessel, der beschreibt, wo eine nicht freigegebene Arbeit steht. */
  stageMessageKey?: string;
}

/** Ordnet einem noch nicht freigegebenen Status einen erklaerenden Locale-Schluessel zu. */
function stageMessageKeyFor(status: SubmissionStatus): string {
  switch (status) {
    case "ingested":
    case "transcribed":
      return "export.stage.review";
    case "checked":
      return "export.stage.assess";
    case "assessed":
      return "export.stage.release";
    default:
      return "export.stage.review";
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("round");

  if (!roundId) {
    const rounds = await listRoundsWithLabels();
    return NextResponse.json({ rounds });
  }

  const submissions = await listSubmissions(roundId);
  const items: ExportSubmissionSummary[] = [];
  for (const s of submissions) {
    const assessment = await readAssessment(roundId, s.id);
    const released = s.status === "released" && Boolean(assessment?.released);
    items.push({
      submissionId: s.id,
      studentAlias: s.studentAlias,
      status: s.status,
      released,
      gradeDisplay: assessment?.gradeDisplay,
      stageMessageKey: released ? undefined : stageMessageKeyFor(s.status),
    });
  }

  const configId = submissions.find((s) => s.configId)?.configId || "";
  const configs = await listConfigs();
  const config = configs.find((c) => c.id === configId) ?? null;

  const releasedCount = items.filter((i) => i.released).length;

  return NextResponse.json({
    roundId,
    items,
    releasedCount,
    totalCount: items.length,
    configId,
    configName: config?.name ?? "",
    configSubject: config?.subject ?? "",
  });
}
