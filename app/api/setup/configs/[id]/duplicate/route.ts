/*
  Dupliziert eine vorhandene Fach-Konfiguration (Faecher-Seite).
  Neue id und neuer Name (Zusatz "Kopie"/"copy" ueber die Locale-Datei im
  Client bestimmt und mitgeschickt), Zeitstempel werden neu gesetzt.
*/

import { NextResponse } from "next/server";
import { readConfig, writeConfig, listConfigs } from "@/lib/storage";

export const runtime = "nodejs";

interface Params {
  params: Promise<{ id: string }>;
}

interface DuplicateRequest {
  /** Anzeigename fuer die Kopie, z.B. "Englisch Comment (Kopie)". */
  name: string;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "fach"
  );
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const source = await readConfig(id);
  if (!source) {
    return NextResponse.json({ error: "Konfiguration nicht gefunden." }, { status: 404 });
  }

  let body: DuplicateRequest;
  try {
    body = (await req.json()) as DuplicateRequest;
  } catch {
    body = { name: `${source.name} (2)` };
  }
  const name = body.name && body.name.trim() !== "" ? body.name.trim() : `${source.name} (2)`;

  const existingIds = new Set((await listConfigs()).map((c) => c.id));
  const base = slugify(name) || slugify(source.id);
  let newId = base;
  let n = 2;
  while (existingIds.has(newId)) {
    newId = `${base}-${n}`;
    n += 1;
  }

  const now = new Date().toISOString();
  const copy = {
    ...source,
    id: newId,
    name,
    createdAt: now,
    updatedAt: now,
  };
  await writeConfig(copy);
  return NextResponse.json({ config: copy });
}
