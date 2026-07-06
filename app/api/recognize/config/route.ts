/*
  Lesen und Aendern der App-Einstellungen fuer die Auswertung (Ollama):
  Basis-Adresse und die beiden Modellnamen (visionModel, gradingModel).

  GET  -> aktuelle Einstellungen (mit Defaults, falls noch keine Datei existiert)
  POST { ollamaBaseUrl?, visionModel?, gradingModel? } -> speichert Aenderungen
*/

import { NextResponse } from "next/server";
import { readAppConfig, writeAppConfig } from "@/lib/storage";
import type { AppConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const config = await readAppConfig();
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  let body: Partial<AppConfig>;
  try {
    body = (await req.json()) as Partial<AppConfig>;
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }

  const current = await readAppConfig();
  const next: AppConfig = {
    ollamaBaseUrl: (body.ollamaBaseUrl ?? current.ollamaBaseUrl).trim() || current.ollamaBaseUrl,
    visionModel: (body.visionModel ?? current.visionModel).trim() || current.visionModel,
    gradingModel: (body.gradingModel ?? current.gradingModel).trim() || current.gradingModel,
    updatedAt: new Date().toISOString(),
  };
  await writeAppConfig(next);
  return NextResponse.json(next);
}
