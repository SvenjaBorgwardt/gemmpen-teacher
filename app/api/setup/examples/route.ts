/*
  Beispiel-Konfigurationen (Startvorlagen) fuer den Einrichten-Assistenten.

  GET /api/setup/examples -> { examples: SubjectConfig[] }
    Liest die mitgelieferten Vorlagen aus data/config/beispiele/. Diese sind
    read-only Startpunkte; das Auswaehlen uebernimmt die Felder in ein neues
    Fach. Fehlt der Ordner, kommt eine leere Liste (Beispiele sind optional).
*/

import { NextResponse } from "next/server";
import { listExampleConfigs } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET() {
  const examples = await listExampleConfigs();
  return NextResponse.json({ examples });
}
