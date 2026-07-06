/*
  Bestaetigen einer geprueften Arbeit (AP6).

  POST /api/review/confirm { roundId, submissionId }
    -> setzt transcript.confirmed = true und submission.status = "checked",
       aber NUR wenn keine Unsicherheits-Markierung ([[wort?]]) mehr im Text
       steht. Die Lehrkraft muss jede Unsicherheit selbst entscheiden, bevor
       eine Arbeit fuer die Bewertung freigegeben ist.
*/

import { NextResponse } from "next/server";
import { readSubmission, writeSubmission, readTranscript, writeTranscript } from "@/lib/storage";
import { canConfirmTranscript } from "@/lib/review/unclear";

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
  const transcript = await readTranscript(roundId, submissionId);
  if (!submission || !transcript) {
    return NextResponse.json({ error: "Arbeit oder Transkript nicht gefunden." }, { status: 404 });
  }

  if (!canConfirmTranscript(transcript)) {
    return NextResponse.json(
      { error: "Es gibt noch unsichere Stellen im Text. Bitte erst alle klaeren." },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  await writeTranscript(roundId, { ...transcript, confirmed: true, updatedAt: now });
  await writeSubmission({
    ...submission,
    status: submission.status === "released" || submission.status === "assessed"
      ? submission.status
      : "checked",
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, status: "checked" });
}
