/*
  Ingest-API: nimmt vom Client vorbereitete Seiten entgegen (Fotos oder aus
  PDF gerenderte Seiten), entzerrt und schneidet sie zu und legt sie in
  data/submissions/<roundId>/ ab.

  Der Client rendert PDFs mit pdfjs zu Seitenbildern und schickt jede Seite
  einzeln als Data-URL. Fotos werden direkt als Data-URL geschickt.
*/

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { decodeImage, encodePng, downscaleForDetection } from "@/lib/ingest/node-image";
import { detectMarkers } from "@/lib/ingest/markers";
import { dewarpPhoto, dewarpScannerPage } from "@/lib/ingest/dewarp";
import { storePage, pageResultUrls } from "@/lib/ingest/store";
import { writeRoundLabel } from "@/lib/storage";
import type {
  IngestRequest,
  IngestResponse,
  IngestPageResult,
} from "@/lib/ingest/types";

export const runtime = "nodejs";

function dataUrlToBuffer(dataUrl: string): Buffer {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Buffer.from(b64, "base64");
}

export async function POST(req: Request) {
  let body: IngestRequest;
  try {
    body = (await req.json()) as IngestRequest;
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }

  const roundId = (body.roundId || "").trim();
  if (!roundId || !Array.isArray(body.pages) || body.pages.length === 0) {
    return NextResponse.json({ error: "Runde und Seiten sind erforderlich." }, { status: 400 });
  }

  // Von der Lehrkraft vergebener Stapelname: einmal je Runde speichern, damit
  // er ueberall dort erscheint, wo Runden gelistet werden (Pruefen/Bewerten/
  // Export), statt dass nur die technische roundId sichtbar bleibt.
  if (body.roundLabel) {
    await writeRoundLabel(roundId, body.roundLabel);
  }

  const results: IngestPageResult[] = [];

  for (const input of body.pages) {
    const buffer = dataUrlToBuffer(input.dataUrl);

    // Marker-Erkennung auf einer verkleinerten Fassung (schnell), Entzerrung
    // dann auf voller Aufloesung, damit die Handschrift scharf bleibt.
    const { image: small, scale } = await downscaleForDetection(buffer);
    const full = await decodeImage(buffer);

    // Marker auf klein finden, Koordinaten auf voll hochskalieren, dann
    // die volle Fassung verarbeiten. Wir nutzen dafuer direkt dewarp auf voll,
    // da detectMarkers robust genug auf voller Aufloesung ist; die kleine
    // Fassung dient nur der Schnellpruefung, ob ueberhaupt Marker da sind.
    const quickCheck = detectMarkers(small);
    void scale;

    const result =
      input.kind === "pdf-page" ? dewarpScannerPage(full) : dewarpPhoto(full);

    // Wenn die volle Fassung keine Marker fand, aber die kleine schon
    // (oder umgekehrt), bleibt es beim Ergebnis der vollen Fassung; der
    // quickCheck dient nur als zusaetzliches Signal in der Diagnose.
    void quickCheck;

    const pageId = randomUUID();
    const [pagePng, headerPng] = await Promise.all([
      encodePng(result.page),
      encodePng(result.header),
    ]);
    await storePage(roundId, pageId, pagePng, headerPng, {
      templateDetected: result.templateDetected,
      orientationConfident: result.orientationConfident,
      sourceName: input.sourceName,
      sourcePageIndex: input.sourcePageIndex,
    });

    results.push({
      pageId,
      templateDetected: result.templateDetected,
      orientationConfident: result.orientationConfident,
      sourceName: input.sourceName,
      sourcePageIndex: input.sourcePageIndex,
      ...pageResultUrls(roundId, pageId),
    });
  }

  const response: IngestResponse = { roundId, results };
  return NextResponse.json(response);
}
