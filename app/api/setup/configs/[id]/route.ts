/*
  Einzelne Fach-Konfiguration: Lesen (Bearbeiten-Vorbelegung im Wizard) und
  Loeschen (Faecher-Seite, mit Rueckfrage im Client).
*/

import { NextResponse } from "next/server";
import { readConfig, deleteConfig } from "@/lib/storage";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const config = await readConfig(id);
  if (!config) {
    return NextResponse.json({ error: "Konfiguration nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json({ config });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await deleteConfig(id);
  return NextResponse.json({ ok: true });
}
