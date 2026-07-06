/*
  Fach-Konfigurationen: Liste und Speichern (Wizard-Schritt 6 und Faecher-Seite).

  GET  -> alle vorhandenen Konfigurationen (data/config/*.json, ohne app.json).
  POST -> validiert eine vollstaendige SubjectConfig und speichert sie.
          Wird sowohl fuer "neu anlegen" als auch fuer "Bearbeiten speichern"
          genutzt (gleiche id ueberschreibt die vorhandene Datei).
*/

import { NextResponse } from "next/server";
import { listConfigs, writeConfig } from "@/lib/storage";
import { validateSubjectConfig } from "@/lib/rubric/validate";
import type { SubjectConfig } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const configs = await listConfigs();
  return NextResponse.json({ configs });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }

  const check = validateSubjectConfig(body);
  if (!check.valid) {
    return NextResponse.json(
      { error: "Die Konfiguration ist nicht gueltig.", details: check.errors },
      { status: 400 },
    );
  }

  const config = body as SubjectConfig;
  await writeConfig(config);
  return NextResponse.json({ config });
}
