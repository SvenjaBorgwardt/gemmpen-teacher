/*
  Server-seitiges Ablegen der Ingest-Ergebnisse in data/submissions/.
  Ergaenzt lib/storage.ts um die Bild- und Seiten-Ablage. Nutzt die dort
  definierten Basispfade (dataRoot). Nur serverseitig (Node fs).

  Layout je Runde:
    data/submissions/<roundId>/
      pages/<pageId>.png          entzerrtes Seitenbild
      pages/<pageId>.header.png   Kopfzeilen-Ausschnitt
      pages.json                  Index aller erkannten Seiten (vor Zuordnung)
      <submissionId>/submission.json   (nach Zuordnung, ueber lib/storage.ts)

  Die Bilder liegen bewusst NICHT in public/ (Schuelerdaten bleiben lokal
  und ausserhalb des ausgelieferten Ordners). Sie werden ueber eine
  API-Route ausgeliefert (app/api/ingest/image).
*/

import { promises as fs } from "fs";
import path from "path";
import { dataRoot } from "../storage";
import type { IngestPageResult } from "./types";

/** Ein Seiten-Eintrag im pages.json-Index einer Runde. */
export interface StoredPage {
  pageId: string;
  templateDetected: boolean;
  orientationConfident: boolean;
  sourceName: string;
  sourcePageIndex: number;
  /** Kuerzel des zugeordneten Schuelers, leer solange nicht zugeordnet. */
  assignedAlias?: string;
  createdAt: string;
}

function submissionsDir(): string {
  return path.join(dataRoot(), "submissions");
}
function roundDir(roundId: string): string {
  return path.join(submissionsDir(), safeSeg(roundId));
}
function pagesDir(roundId: string): string {
  return path.join(roundDir(roundId), "pages");
}
function pagesIndexFile(roundId: string): string {
  return path.join(roundDir(roundId), "pages.json");
}

/** Verhindert Pfad-Ausbruch ueber praeparierte IDs. */
function safeSeg(id: string): string {
  const cleaned = path.basename(id);
  if (cleaned !== id || cleaned.includes("..") || cleaned.trim() === "") {
    throw new Error(`Ungueltige ID: ${id}`);
  }
  return cleaned;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** Speichert Seitenbild und Kopfzeile und ergaenzt den Runden-Index. */
export async function storePage(
  roundId: string,
  pageId: string,
  pageImage: Buffer,
  headerImage: Buffer,
  meta: Omit<StoredPage, "pageId" | "createdAt">,
): Promise<StoredPage> {
  safeSeg(pageId);
  await ensureDir(pagesDir(roundId));
  await fs.writeFile(path.join(pagesDir(roundId), `${pageId}.png`), pageImage);
  await fs.writeFile(path.join(pagesDir(roundId), `${pageId}.header.png`), headerImage);

  const entry: StoredPage = {
    pageId,
    createdAt: new Date().toISOString(),
    ...meta,
  };
  const index = await readPagesIndex(roundId);
  index.push(entry);
  await writePagesIndex(roundId, index);
  return entry;
}

export async function readPagesIndex(roundId: string): Promise<StoredPage[]> {
  try {
    const raw = await fs.readFile(pagesIndexFile(roundId), "utf8");
    return JSON.parse(raw) as StoredPage[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writePagesIndex(roundId: string, index: StoredPage[]): Promise<void> {
  await ensureDir(roundDir(roundId));
  await fs.writeFile(pagesIndexFile(roundId), JSON.stringify(index, null, 2), "utf8");
}

/** Liest die Rohbytes eines gespeicherten Seiten- oder Kopfzeilenbildes. */
export async function readPageImage(
  roundId: string,
  pageId: string,
  variant: "page" | "header",
): Promise<Buffer | null> {
  safeSeg(pageId);
  const file = path.join(
    pagesDir(roundId),
    variant === "header" ? `${pageId}.header.png` : `${pageId}.png`,
  );
  try {
    return await fs.readFile(file);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/** Loescht eine Seite (Bilder plus Index-Eintrag). */
export async function deletePage(roundId: string, pageId: string): Promise<void> {
  safeSeg(pageId);
  await fs.rm(path.join(pagesDir(roundId), `${pageId}.png`), { force: true });
  await fs.rm(path.join(pagesDir(roundId), `${pageId}.header.png`), { force: true });
  const index = (await readPagesIndex(roundId)).filter((p) => p.pageId !== pageId);
  await writePagesIndex(roundId, index);
}

/** Ordnet mehrere Seiten einem Schueler-Kuerzel zu (Index-Update). */
export async function assignPages(
  roundId: string,
  pageIds: string[],
  studentAlias: string,
): Promise<void> {
  const set = new Set(pageIds);
  const index = await readPagesIndex(roundId);
  for (const p of index) {
    if (set.has(p.pageId)) p.assignedAlias = studentAlias;
  }
  await writePagesIndex(roundId, index);
}

/** Baut die oeffentlichen URLs fuer ein Seitenergebnis. */
export function pageResultUrls(
  roundId: string,
  pageId: string,
): Pick<IngestPageResult, "imageUrl" | "headerUrl"> {
  const base = `/api/ingest/image?round=${encodeURIComponent(roundId)}&page=${encodeURIComponent(pageId)}`;
  return {
    imageUrl: `${base}&variant=page`,
    headerUrl: `${base}&variant=header`,
  };
}
