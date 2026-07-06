/*
  Raster-Vorschlag (Wizard-Schritt 3, AP5).

  Nimmt Aufgabenstellung und Erwartungshorizont entgegen, rendert den
  Raster-Vorschlag-Prompt (lib/prompts) und schickt ihn an den gradingModel-
  Slot (echter Client oder Mock-Fallback, siehe lib/prompts/resolve-client.ts).
  Antwort ist eine RubricSuggestionResult-Liste; die Lehrkraft bearbeitet sie
  danach vollstaendig in Formularen (kein JSON in der UI).
*/

import { NextResponse } from "next/server";
import { renderRubricSuggest } from "@/lib/prompts/render";
import { parseJsonResponse } from "@/lib/prompts/chat";
import { resolveGradingClient } from "@/lib/prompts/resolve-client";
import type { GradingSystem, RubricSuggestionResult } from "@/lib/types";

export const runtime = "nodejs";

interface SuggestRequest {
  subject: string;
  level: string;
  textLanguage: string;
  gradingSystem: GradingSystem;
  taskPrompt: string;
  expectedPoints: string[];
}

export async function POST(req: Request) {
  let body: SuggestRequest;
  try {
    body = (await req.json()) as SuggestRequest;
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }

  if (!body.taskPrompt || body.taskPrompt.trim() === "") {
    return NextResponse.json({ error: "Aufgabenstellung fehlt." }, { status: 400 });
  }
  if (!Array.isArray(body.expectedPoints) || body.expectedPoints.length === 0) {
    return NextResponse.json({ error: "Erwartungshorizont fehlt." }, { status: 400 });
  }

  const prompt = renderRubricSuggest({
    subject: body.subject || "",
    level: body.level || "",
    textLanguage: body.textLanguage || "",
    gradingSystem: body.gradingSystem || "nrw-points",
    taskPrompt: body.taskPrompt,
    expectedPoints: body.expectedPoints,
  });

  const { client, usingRealClient } = await resolveGradingClient();

  try {
    const raw = await client.complete(prompt);
    const parsed = parseJsonResponse<RubricSuggestionResult>(raw);
    if (!Array.isArray(parsed.criteria) || parsed.criteria.length === 0) {
      return NextResponse.json(
        { error: "Der Vorschlag enthielt keine Kriterien." },
        { status: 502 },
      );
    }
    return NextResponse.json({ suggestion: parsed, usingRealClient });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Der Vorschlag ist fehlgeschlagen." },
      { status: 502 },
    );
  }
}
