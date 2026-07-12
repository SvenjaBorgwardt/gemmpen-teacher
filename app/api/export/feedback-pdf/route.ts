/*
  Feedback-PDF fuer eine einzelne freigegebene Arbeit (AP8).

  GET /api/export/feedback-pdf?round=...&id=...
    -> PDF-Datei (application/pdf) mit drei Seiten (siehe lib/pdf/feedback-pdf.ts).
       Nur fuer freigegebene Arbeiten (Submission.status === "released" und
       Assessment.released === true); sonst 409 mit einem lesbaren Stand-Hinweis.
*/

import { NextResponse } from "next/server";
import {
  readAssessment,
  readConfig,
  readFeedback,
  readSubmission,
} from "@/lib/storage";
import { calculateGrade } from "@/lib/grading/grade";
import { buildFeedbackPdf } from "@/lib/pdf/feedback-pdf";

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
  const submissionId = url.searchParams.get("id");

  if (!roundId || !submissionId) {
    return NextResponse.json({ error: "roundId und id sind erforderlich." }, { status: 400 });
  }

  const submission = await readSubmission(roundId, submissionId);
  if (!submission) {
    return NextResponse.json({ error: "Arbeit nicht gefunden." }, { status: 404 });
  }

  const assessment = await readAssessment(roundId, submissionId);
  if (!assessment || !assessment.released || submission.status !== "released") {
    return NextResponse.json(
      { error: "Diese Arbeit ist noch nicht freigegeben.", messageKey: "export.error.notReleased" },
      { status: 409 },
    );
  }

  const config = await readConfig(submission.configId || assessment.configId);
  if (!config) {
    return NextResponse.json(
      { error: "Die Fach-Konfiguration dieser Arbeit wurde nicht gefunden." },
      { status: 404 },
    );
  }

  const feedback = await readFeedback(roundId, submissionId);
  if (!feedback) {
    return NextResponse.json({ error: "Kein Feedback-Entwurf gefunden." }, { status: 404 });
  }

  const grade = calculateGrade(
    config.gradingSystem,
    assessment.totalPoints,
    assessment.maxPoints,
    config.feedbackLanguage,
  );

  const bytes = await buildFeedbackPdf({
    submission,
    config,
    assessment,
    feedback,
    grade,
    dateDisplay: todayDisplay(),
  });

  const fileName = `feedback-${submission.studentAlias}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
