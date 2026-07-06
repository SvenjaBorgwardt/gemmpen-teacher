/*
  Client-seitiges Rendern von PDF-Seiten zu Bildern (nur im Browser).
  Nutzt pdfjs-dist. Jede Seite wird bei ~300 dpi zu einem PNG-Data-URL
  gerendert. Auch mehrseitige PDFs (Stapel mehrerer Schueler) werden Seite
  fuer Seite zerlegt.

  Wird nur in Client-Komponenten importiert (dynamischer Import in der
  Hochladen-Seite), nie serverseitig.
*/

import type { IngestPageInput } from "./types";

// A4-Hoehe in Zoll = 297 mm / 25.4. Bei 300 dpi Zielaufloesung ergibt sich
// die noetige Skalierung aus der PDF-Punktgroesse (72 dpi Basis).
const TARGET_DPI = 300;
const PDF_BASE_DPI = 72;

/** Rendert alle Seiten eines PDFs zu IngestPageInput (pdf-page). */
export async function renderPdfToPages(file: File): Promise<IngestPageInput[]> {
  // pdfjs-dist dynamisch laden (kein SSR).
  const pdfjs = await import("pdfjs-dist");
  // Worker als gebuendelte Modul-URL setzen (webpack/Turbopack loesen das auf).
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;

  const pages: IngestPageInput[] = [];
  const scale = TARGET_DPI / PDF_BASE_DPI;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas nicht verfuegbar.");
    await page.render({ canvasContext: ctx, viewport }).promise;

    pages.push({
      kind: "pdf-page",
      sourceName: file.name,
      sourcePageIndex: i - 1,
      dataUrl: canvas.toDataURL("image/png"),
    });
    page.cleanup();
  }
  await doc.destroy();
  return pages;
}

/** Liest eine Bilddatei (jpg/png/heic) als Data-URL fuer den Foto-Weg. */
export async function readPhotoFile(file: File): Promise<IngestPageInput> {
  const dataUrl = await fileToDataUrl(file);
  return {
    kind: "photo",
    sourceName: file.name,
    sourcePageIndex: 0,
    dataUrl,
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

/** Ordnet eine Datei ihrem Weg zu (PDF oder Bild). */
export function classifyFile(file: File): "pdf" | "image" | "unknown" {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|heic|heif)$/.test(name)
  ) {
    return "image";
  }
  return "unknown";
}
