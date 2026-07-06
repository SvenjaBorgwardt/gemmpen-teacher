/*
  Freigabe einer bewerteten Arbeit (AP7).

  POST /api/assess/release { roundId, submissionId }
    -> setzt assessment.released = true und submission.status = "released".
       Voraussetzung fuer den Export (AP8): nur freigegebene Arbeiten werden
       dort als Feedback-Blatt erzeugt. Setzt voraus, dass eine Bewertung
       bereits vorliegt (Status "assessed" oder schon "released").
*/

import { NextResponse } from "next/server";
import { readSubmission, writeSubmission, readAssessment, writeAssessment } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { roundId?: string; submissionId?: string };
  try {
    body = (await req.json()) as { roundId?: string; submissionId?: string };
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }
  const roundId = (body.roundId ?? "").trim();
  const submissionId = (body.submissionId ?? "").trim();
  if (!roundId || !submissionId) {
    return NextResponse.json({ error: "round und id sind erforderlich." }, { status: 400 });
  }

  const submission = await readSubmission(roundId, submissionId);
  const assessment = await readAssessment(roundId, submissionId);
  if (!submission || !assessment) {
    return NextResponse.json({ error: "Arbeit ist noch nicht bewertet." }, { status: 404 });
  }

  const now = new Date().toISOString();
  await writeAssessment(roundId, { ...assessment, released: true, updatedAt: now });
  await writeSubmission({ ...submission, status: "released", updatedAt: now });

  return NextResponse.json({ ok: true, status: "released" });
}
