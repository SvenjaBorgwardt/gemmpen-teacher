/*
  Fach-Konfiguration einer Runde festlegen (AP7).

  POST /api/assess/config { roundId, configId }
    -> schreibt configId auf jede Arbeit der Runde, die noch keine hat (oder
       eine andere), damit die Bewertungskette weiss, welches Raster gilt.
       Wird von der Bewerten-Uebersicht aufgerufen, bevor die Kette startet
       (Submission.configId ist beim Hochladen noch leer, siehe AP2/AP7-Notiz).
*/

import { NextResponse } from "next/server";
import { listSubmissions, writeSubmission, readConfig } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { roundId?: string; configId?: string };
  try {
    body = (await req.json()) as { roundId?: string; configId?: string };
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }
  const roundId = (body.roundId ?? "").trim();
  const configId = (body.configId ?? "").trim();
  if (!roundId || !configId) {
    return NextResponse.json({ error: "round und configId sind erforderlich." }, { status: 400 });
  }

  const config = await readConfig(configId);
  if (!config) {
    return NextResponse.json({ error: "Diese Fach-Konfiguration wurde nicht gefunden." }, { status: 404 });
  }

  const submissions = await listSubmissions(roundId);
  let updated = 0;
  for (const s of submissions) {
    if (s.configId === configId) continue;
    await writeSubmission({ ...s, configId, updatedAt: new Date().toISOString() });
    updated += 1;
  }

  return NextResponse.json({ ok: true, configId, updated });
}
