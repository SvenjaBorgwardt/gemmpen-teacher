/*
  Klassenuebersicht als PDF (AP8).

  GET /api/export/class-pdf?round=...
    -> PDF-Datei (application/pdf): Tabelle mit Kuerzel, Punkten je Kriterium
       und Gesamtnote, nur ueber freigegebene Arbeiten der Runde. Fusszeile
       mit Datum und Fach (siehe lib/pdf/class-overview-pdf.ts).
*/

import { NextResponse } from "next/server";
import { listSubmissions, readAssessment, readConfig } from "@/lib/storage";
import { buildClassOverviewPdf, type ClassOverviewRow } from "@/lib/pdf/class-overview-pdf";

export const runtime = "nodejs";

function todayDisplay(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${now.getFullYear()}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("round");
  if (!roundId) {
    return NextResponse.json({ error: "roundId ist erforderlich." }, { status: 400 });
  }

  const submissions = await listSubmissions(roundId);
  const rows: ClassOverviewRow[] = [];
  let configId = "";

  for (const submission of submissions) {
    const assessment = await readAssessment(roundId, submission.id);
    if (!assessment || !assessment.released || submission.status !== "released") continue;
    rows.push({ submission, assessment });
    if (!configId) configId = submission.configId || assessment.configId;
  }

  if (!configId) {
    // Auch ohne freigegebene Arbeit: Fach-Konfiguration ggf. aus irgendeiner
    // Arbeit der Runde ableiten, damit die Sprache/Titel-Wahl stimmt.
    configId = submissions.find((s) => s.configId)?.configId || "";
  }

  const config = configId ? await readConfig(configId) : null;
  if (!config) {
    return NextResponse.json(
      { error: "Fuer diese Runde wurde noch keine Fach-Konfiguration zugeordnet." },
      { status: 404 },
    );
  }

  const bytes = await buildClassOverviewPdf({
    config,
    roundId,
    rows,
    dateDisplay: todayDisplay(),
  });

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="class-overview-${roundId}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
