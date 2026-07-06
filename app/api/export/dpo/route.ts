/*
  DPO-Export als JSONL-Download (AP8).

  GET /api/export/dpo               -> Liste aller Runden mit vorhandenen
                                        Korrektur-Paaren (data/dpo/<roundId>.jsonl),
                                        je mit Anzahl Paare.
  GET /api/export/dpo?round=...     -> die JSONL-Datei dieser Runde als Download.

  Die Datei bleibt lokal (kein Cloud-Upload, siehe Bauplan Abschnitt 0); dieser
  Endpunkt liefert sie nur zum Herunterladen auf den eigenen Rechner der
  Lehrkraft aus.
*/

import { NextResponse } from "next/server";
import { listDpoFiles, readDpoPairs } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("round");

  if (!roundId) {
    const files = await listDpoFiles();
    const items = [];
    for (const fileId of files) {
      const pairs = await readDpoPairs(fileId);
      items.push({ roundId: fileId, count: pairs.length });
    }
    return NextResponse.json({ items });
  }

  const pairs = await readDpoPairs(roundId);
  const jsonl = pairs.map((p) => JSON.stringify(p)).join("\n") + (pairs.length > 0 ? "\n" : "");

  return new NextResponse(jsonl, {
    status: 200,
    headers: {
      "Content-Type": "application/jsonl; charset=utf-8",
      "Content-Disposition": `attachment; filename="korrekturen-${roundId}.jsonl"`,
      "Cache-Control": "no-store",
    },
  });
}
