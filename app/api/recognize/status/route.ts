/*
  Verbindungsstatus der Auswertung fuer die Einstellungen-Seite: erreichbar
  ja/nein und geladene Modelle. Wird auch als "Testknopf" genutzt (derselbe
  Aufruf, aus der UI erneut ausgeloest).
*/

import { NextResponse } from "next/server";
import { createOllamaClient } from "@/lib/ollama";

export const runtime = "nodejs";

export async function GET() {
  const client = await createOllamaClient();
  const status = await client.getStatus();
  return NextResponse.json(status);
}
