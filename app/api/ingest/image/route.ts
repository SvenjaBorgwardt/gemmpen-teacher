/*
  Liefert ein gespeichertes Seiten- oder Kopfzeilenbild aus data/submissions/.
  Die Bilder liegen ausserhalb von public/, damit Schuelerdaten nicht mit
  ausgeliefert werden. Diese Route reicht sie nur lokal durch.
*/

import { readPageImage } from "@/lib/ingest/store";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("round");
  const pageId = url.searchParams.get("page");
  const variant = url.searchParams.get("variant") === "header" ? "header" : "page";

  if (!roundId || !pageId) {
    return new Response("round und page sind erforderlich.", { status: 400 });
  }

  let buffer: Buffer | null;
  try {
    buffer = await readPageImage(roundId, pageId, variant);
  } catch {
    return new Response("Ungueltige Anfrage.", { status: 400 });
  }
  if (!buffer) {
    return new Response("Nicht gefunden.", { status: 404 });
  }

  const body = new Uint8Array(buffer);
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
