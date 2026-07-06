/*
  Uebersicht einer Runde fuer die Bewerten-Seite (AP7).

  GET  /api/assess/rounds
    -> Liste aller Runden-IDs (wie /api/review/rounds).

  GET  /api/assess/rounds?round=...
    -> alle Arbeiten dieser Runde mit Status "checked" oder weiter
       (checked, assessed, released), je mit Kuerzel, Status, Note (falls
       bewertet). Arbeiten, die noch nicht geprueft sind, werden nicht
       gelistet: die Bewertung setzt ein bestaetigtes Transkript voraus (AP6).

  Da Submission.configId beim Hochladen noch leer ist (AP2 ordnet keine
  Fach-Konfiguration zu), liefert die Route zusaetzlich die Fach-Konfiguration
  der Runde, falls schon eine gesetzt wurde (aus der ersten Arbeit mit
  configId), sowie die Liste aller verfuegbaren Konfigurationen, damit die
  Bewerten-Seite eine auswaehlen lassen kann, bevor die Kette startet.
*/

import { NextResponse } from "next/server";
import { listRoundsWithLabels, listSubmissions, readAssessment, listConfigs } from "@/lib/storage";

export const runtime = "nodejs";

export interface AssessSubmissionSummary {
  submissionId: string;
  studentAlias: string;
  taskCode?: string;
  status: string;
  hasAssessment: boolean;
  gradeDisplay?: string;
  released: boolean;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("round");

  if (!roundId) {
    const rounds = await listRoundsWithLabels();
    return NextResponse.json({ rounds });
  }

  const submissions = await listSubmissions(roundId);
  const checkedOrFurther = submissions.filter((s) =>
    ["checked", "assessed", "released"].includes(s.status),
  );

  const items: AssessSubmissionSummary[] = [];
  for (const s of checkedOrFurther) {
    const assessment = await readAssessment(roundId, s.id);
    items.push({
      submissionId: s.id,
      studentAlias: s.studentAlias,
      taskCode: s.taskCode,
      status: s.status,
      hasAssessment: Boolean(assessment),
      gradeDisplay: assessment?.gradeDisplay,
      released: assessment?.released ?? s.status === "released",
    });
  }

  const currentConfigId = checkedOrFurther.find((s) => s.configId)?.configId || "";
  const configs = await listConfigs();

  return NextResponse.json({
    roundId,
    items,
    currentConfigId,
    configs: configs.map((c) => ({ id: c.id, name: c.name, subject: c.subject })),
  });
}
