/*
  Kalibrierung (Wizard-Schritt 5, AP5).

  Nimmt eine (noch nicht gespeicherte) SubjectConfig mit ein oder zwei
  bewerteten Beispielarbeiten entgegen und laesst runCalibration (lib/rubric)
  gegen den gradingModel-Slot laufen. Ergebnis: Abweichung je Kriterium.
*/

import { NextResponse } from "next/server";
import { runCalibration } from "@/lib/rubric/calibrate";
import { validateSubjectConfig } from "@/lib/rubric/validate";
import { resolveGradingClient } from "@/lib/prompts/resolve-client";
import type { SubjectConfig } from "@/lib/types";

export const runtime = "nodejs";

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
      {
        error: "Die Konfiguration ist fuer die Kalibrierung noch nicht vollstaendig.",
        details: check.errors,
      },
      { status: 400 },
    );
  }
  const config = body as SubjectConfig;

  if (config.rubric.calibrationSamples.length === 0) {
    return NextResponse.json(
      { error: "Fuer die Kalibrierung sind keine Beispielarbeiten hinterlegt." },
      { status: 400 },
    );
  }

  const { client, usingRealClient } = await resolveGradingClient();

  try {
    const report = await runCalibration(config, client);
    return NextResponse.json({ report, usingRealClient });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Die Kalibrierung ist fehlgeschlagen." },
      { status: 502 },
    );
  }
}
