/*
  Bewertungskette starten (AP7).

  POST /api/assess/run { roundId, submissionId? }
    -> ohne submissionId: bewertet alle Arbeiten der Runde mit Status
       "checked" (noch nicht bewertet). Mit submissionId: bewertet genau
       diese eine Arbeit erneut (z.B. auf Wunsch der Lehrkraft).
       Jede Arbeit laeuft einzeln; ein Fehler bei einer Arbeit bricht den
       gesamten Lauf NICHT ab (Hausregel: Fehler pro Arbeit statt
       Totalabbruch), sondern wird im Ergebnis vermerkt.

  Nutzt die Bewertungskette aus lib/assess/pipeline.ts (AP4-Bausteine:
  Inhaltsabgleich, Kriterien-Bewertung, Feedback) und den Client aus
  lib/prompts/resolve-client.ts (echtes Ollama oder Mock-Fallback, AP5-Muster).
*/

import { NextResponse } from "next/server";
import {
  listSubmissions,
  readSubmission,
  writeSubmission,
  readTranscript,
  readConfig,
  writeAssessment,
  writeFeedback,
} from "@/lib/storage";
import { resolveGradingClient } from "@/lib/prompts/resolve-client";
import { assessSubmission } from "@/lib/assess/pipeline";
import { transcriptToText } from "@/lib/assess/text";
import type { Submission } from "@/lib/types";

export const runtime = "nodejs";

interface RunRequest {
  roundId?: string;
  submissionId?: string;
}

interface RunItemResult {
  submissionId: string;
  status: "done" | "skipped" | "error";
  errorMessageKey?: string;
  errorDetail?: string;
}

export async function POST(req: Request) {
  let body: RunRequest;
  try {
    body = (await req.json()) as RunRequest;
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }
  const roundId = (body.roundId ?? "").trim();
  if (!roundId) {
    return NextResponse.json({ error: "round ist erforderlich." }, { status: 400 });
  }

  let targets: Submission[];
  if (body.submissionId) {
    const single = await readSubmission(roundId, body.submissionId);
    targets = single ? [single] : [];
  } else {
    const all = await listSubmissions(roundId);
    targets = all.filter((s) => s.status === "checked");
  }

  const { client, usingRealClient } = await resolveGradingClient();

  const results: RunItemResult[] = [];
  let processed = 0;

  for (const submission of targets) {
    try {
      if (!submission.configId) {
        results.push({
          submissionId: submission.id,
          status: "error",
          errorMessageKey: "assess.error.noConfig",
        });
        continue;
      }
      const config = await readConfig(submission.configId);
      if (!config) {
        results.push({
          submissionId: submission.id,
          status: "error",
          errorMessageKey: "assess.error.noConfig",
        });
        continue;
      }
      const transcript = await readTranscript(roundId, submission.id);
      if (!transcript || !transcript.confirmed) {
        results.push({
          submissionId: submission.id,
          status: "skipped",
        });
        continue;
      }

      const studentText = transcriptToText(transcript);
      const { assessment, feedback } = await assessSubmission(
        config,
        submission.id,
        studentText,
        client,
      );

      await writeAssessment(roundId, assessment);
      await writeFeedback(roundId, feedback);
      await writeSubmission({
        ...submission,
        status: submission.status === "released" ? submission.status : "assessed",
        updatedAt: new Date().toISOString(),
      });

      results.push({ submissionId: submission.id, status: "done" });
      processed += 1;
    } catch (err) {
      results.push({
        submissionId: submission.id,
        status: "error",
        errorMessageKey: "assess.error.unknown",
        errorDetail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    roundId,
    total: targets.length,
    processed,
    usingRealClient,
    results,
  });
}
