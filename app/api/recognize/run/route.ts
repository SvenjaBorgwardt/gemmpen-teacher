/*
  Arbeitet eine Runde ab: transkribiert jede Seite jeder Arbeit, die noch kein
  bestaetigtes Transkript hat, mit dem Vision-Slot der Auswertung. Liest dabei
  auch einen Vorschlag aus der Kopfzeile (Aufgaben-Code, Kuerzel, Blattnummer),
  siehe lib/transcription/header.ts. Der Vorschlag ueberschreibt NIE eine
  bestehende Zuordnung; er kommt als headerSuggestion im Ergebnis mit und die
  Uebernahme bleibt eine bewusste Aktion der Lehrkraft (z.B. in der
  Pruefen-Seite aus AP6).

  POST /api/recognize/run  { roundId }
    -> verarbeitet alle offenen Seiten der Runde synchron und gibt am Ende
       den vollstaendigen Fortschritt zurueck (Sandbox-Hinweis aus
       UEBERGABE.md: Hintergrundprozesse ueberleben den Wechsel zwischen
       Shell-Aufrufen nicht zuverlaessig, daher synchroner Ablauf mit
       Fortschritts-Feld pro Arbeit statt Streaming).
  GET  /api/recognize/run?round=...
    -> liefert den aktuellen Verarbeitungsstand der Runde (welche Arbeiten
       schon ein Transkript haben), ohne etwas neu zu berechnen.

  Fehler pro Arbeit stoppen nicht den ganzen Lauf: jede Arbeit bekommt ein
  eigenes Ergebnis (ok oder errorMessageKey), damit eine nicht erreichbare
  Auswertung fuer ALLE Arbeiten sofort und verstaendlich gemeldet wird, statt
  nur die erste zum Absturz zu bringen.
*/

import { NextResponse } from "next/server";
import path from "path";
import {
  listSubmissions,
  readTranscript,
  writeTranscript,
  writeSubmission,
  readAppConfig,
} from "@/lib/storage";
import { readPageImage } from "@/lib/ingest/store";
import { OllamaError } from "@/lib/ollama";
import { transcribePage, mergeTranscripts, type VisionChatClient } from "@/lib/transcription/transcribe";
import { resolveVisionClient } from "@/lib/transcription/resolve-vision";
import { readHeaderSuggestion, type HeaderSuggestion } from "@/lib/transcription/header";
import type { Submission, Transcript } from "@/lib/types";

export const runtime = "nodejs";

interface SubmissionRunResult {
  submissionId: string;
  studentAlias: string;
  status: "done" | "skipped" | "error";
  /** Locale-Schluessel der Fehlermeldung, falls status=error. */
  errorMessageKey?: string;
  unclearCount?: number;
  /** Vorschlag aus der Kopfzeile der ersten Seite, falls lesbar. */
  headerSuggestion?: HeaderSuggestion;
}

interface RunResponse {
  roundId: string;
  total: number;
  processed: number;
  /** true = echte Auswertung gelesen; false = Platzhalter (Auswertung nicht erreichbar). */
  usingRealClient: boolean;
  results: SubmissionRunResult[];
}

/** Extrahiert die pageId aus einem gespeicherten Bildpfad ("pages/<id>.png"). */
function pageIdFromPath(imagePath: string): string {
  const base = path.basename(imagePath);
  return base.replace(/\.header\.png$/, "").replace(/\.png$/, "");
}

async function imageToBase64(roundId: string, pageId: string): Promise<string | null> {
  const buffer = await readPageImage(roundId, pageId, "page");
  if (!buffer) return null;
  return buffer.toString("base64");
}

async function headerImageToBase64(roundId: string, pageId: string): Promise<string | null> {
  const buffer = await readPageImage(roundId, pageId, "header");
  if (!buffer) return null;
  return buffer.toString("base64");
}

/** Verarbeitet eine einzelne Arbeit: alle Seiten transkribieren, Kopfzeile lesen. */
async function processSubmission(
  roundId: string,
  submission: Submission,
  client: VisionChatClient,
  visionModel: string,
): Promise<SubmissionRunResult> {
  if (submission.pages.length === 0) {
    return {
      submissionId: submission.id,
      studentAlias: submission.studentAlias,
      status: "skipped",
    };
  }

  try {
    const pageTranscripts: Transcript[] = [];
    for (const page of submission.pages) {
      const pageId = pageIdFromPath(page.imagePath);
      const imageBase64 = await imageToBase64(roundId, pageId);
      if (!imageBase64) {
        throw new OllamaError(
          "badResponse",
          "recognize.error.imageMissing",
          `Bild fuer Seite ${pageId} nicht gefunden.`,
        );
      }
      const pageTranscript = await transcribePage(
        client,
        visionModel,
        imageBase64,
        submission.id,
        { pageIndex: page.index },
      );
      pageTranscripts.push(pageTranscript);
    }

    const merged = mergeTranscripts(submission.id, pageTranscripts);
    await writeTranscript(roundId, merged);

    // Kopfzeilen-Vorschlag: nur von der ersten Seite, nur falls ein Ausschnitt
    // vorliegt. Scheitert dies, bleibt der restliche Lauf trotzdem gueltig.
    let headerSuggestion: HeaderSuggestion | undefined;
    const firstPage = submission.pages[0];
    if (firstPage?.headerImagePath) {
      const headerPageId = pageIdFromPath(firstPage.headerImagePath);
      try {
        const headerBase64 = await headerImageToBase64(roundId, headerPageId);
        if (headerBase64) {
          headerSuggestion = await readHeaderSuggestion(client, visionModel, headerBase64);
        }
      } catch {
        // Kopfzeile ist nur ein Vorschlag; ein Fehler hier darf die
        // Transkription der Arbeit nicht als Ganzes scheitern lassen.
        headerSuggestion = undefined;
      }
    }

    // Status nur vorwaerts bewegen: eine bereits geprueft/bewertete Arbeit
    // (checked/assessed/released) nicht auf transcribed zuruecksetzen, falls
    // die Runde erneut abgearbeitet wird (z.B. nach einer Korrektur). Der
    // Kopfzeilen-Vorschlag wird zusaetzlich gespeichert, damit die
    // Pruefen-Seite (AP6) ihn anzeigen kann, ohne die Erkennung erneut laufen
    // zu lassen; er ueberschreibt NIE studentAlias/taskCode selbst.
    await writeSubmission({
      ...submission,
      status: submission.status === "ingested" ? "transcribed" : submission.status,
      headerSuggestion: headerSuggestion ?? submission.headerSuggestion,
      updatedAt: new Date().toISOString(),
    });

    return {
      submissionId: submission.id,
      studentAlias: submission.studentAlias,
      status: "done",
      unclearCount: merged.unclearCount,
      headerSuggestion,
    };
  } catch (err) {
    const messageKey =
      err instanceof OllamaError ? err.messageKey : "recognize.error.unknown";
    return {
      submissionId: submission.id,
      studentAlias: submission.studentAlias,
      status: "error",
      errorMessageKey: messageKey,
    };
  }
}

export async function POST(req: Request) {
  let body: { roundId?: string };
  try {
    body = (await req.json()) as { roundId?: string };
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }
  const roundId = (body.roundId ?? "").trim();
  if (!roundId) {
    return NextResponse.json({ error: "roundId ist erforderlich." }, { status: 400 });
  }

  const submissions = await listSubmissions(roundId);
  // Nur Arbeiten ohne bestaetigtes Transkript erneut verarbeiten. Ist noch
  // gar kein Transkript da, oder ist es unbestaetigt, wird (erneut) verarbeitet.
  const open: Submission[] = [];
  for (const s of submissions) {
    const existing = await readTranscript(roundId, s.id);
    if (!existing || !existing.confirmed) open.push(s);
  }

  if (open.length === 0) {
    const response: RunResponse = { roundId, total: submissions.length, processed: 0, usingRealClient: false, results: [] };
    return NextResponse.json(response);
  }

  const appConfig = await readAppConfig();
  // Echte Auswertung, wenn erreichbar; sonst Platzhalter-Erkennung, damit der
  // komplette Ablauf auch ohne installierte Auswertung durchklickbar bleibt
  // (gleiches Muster wie beim Bewerten, siehe resolveGradingClient).
  const { client, usingRealClient } = await resolveVisionClient();

  const results: SubmissionRunResult[] = [];
  for (const submission of open) {
    const result = await processSubmission(roundId, submission, client, appConfig.visionModel);
    results.push(result);
  }

  const response: RunResponse = {
    roundId,
    total: submissions.length,
    processed: results.length,
    usingRealClient,
    results,
  };
  return NextResponse.json(response);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("round");
  if (!roundId) {
    return NextResponse.json({ error: "round ist erforderlich." }, { status: 400 });
  }
  const submissions = await listSubmissions(roundId);
  const items = await Promise.all(
    submissions.map(async (s) => {
      const transcript = await readTranscript(roundId, s.id);
      return {
        submissionId: s.id,
        studentAlias: s.studentAlias,
        status: s.status,
        hasTranscript: Boolean(transcript),
        confirmed: transcript?.confirmed ?? false,
        unclearCount: transcript?.unclearCount ?? 0,
      };
    }),
  );
  return NextResponse.json({ roundId, total: submissions.length, items });
}
