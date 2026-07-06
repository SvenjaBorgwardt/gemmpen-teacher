/*
  Verwaltung der erkannten Seiten einer Runde:
  - GET  ?round=...        Liste aller Seiten (Galerie)
  - POST { round, pageIds, studentAlias, taskCode }  Zuordnung zu einem Kuerzel
  - DELETE ?round=&page=   Seite loeschen
*/

import { NextResponse } from "next/server";
import {
  readPagesIndex,
  assignPages,
  deletePage,
  pageResultUrls,
} from "@/lib/ingest/store";
import { writeSubmission, readSubmission } from "@/lib/storage";
import type { AssignRequest } from "@/lib/ingest/types";
import type { Submission, SubmissionPage } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("round");
  if (!roundId) {
    return NextResponse.json({ error: "round ist erforderlich." }, { status: 400 });
  }
  let index;
  try {
    index = await readPagesIndex(roundId);
  } catch {
    return NextResponse.json({ error: "Ungueltige Runde." }, { status: 400 });
  }
  const pages = index.map((p) => ({
    ...p,
    ...pageResultUrls(roundId, p.pageId),
  }));
  return NextResponse.json({ roundId, pages });
}

export async function POST(req: Request) {
  let body: AssignRequest;
  try {
    body = (await req.json()) as AssignRequest;
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }
  const roundId = (body.roundId || "").trim();
  const alias = (body.studentAlias || "").trim();
  if (!roundId || !alias || !Array.isArray(body.pageIds) || body.pageIds.length === 0) {
    return NextResponse.json(
      { error: "Runde, Kuerzel und Seiten sind erforderlich." },
      { status: 400 },
    );
  }

  try {
    await assignPages(roundId, body.pageIds, alias);
  } catch {
    return NextResponse.json({ error: "Ungueltige Runde oder Seite." }, { status: 400 });
  }

  // Eine Submission je Kuerzel: vorhandene mit gleichem Kuerzel weiterfuehren,
  // sonst neue anlegen. Seiten in Reihenfolge uebernehmen.
  const index = await readPagesIndex(roundId);
  const now = new Date().toISOString();

  // Es kann schon eine Submission fuer dieses Kuerzel geben (Folgeseiten).
  const submissionId = `sub-${alias}`;
  const existing = await readSubmission(roundId, submissionId);

  const pagesForAlias = index.filter((p) => p.assignedAlias === alias);
  const submissionPages: SubmissionPage[] = pagesForAlias.map((p, i) => ({
    index: i,
    imagePath: `pages/${p.pageId}.png`,
    headerImagePath: `pages/${p.pageId}.header.png`,
    templateDetected: p.templateDetected,
  }));

  const submission: Submission = {
    id: existing?.id ?? submissionId,
    roundId,
    configId: existing?.configId ?? "",
    studentAlias: alias,
    taskCode: body.taskCode ?? existing?.taskCode,
    pages: submissionPages,
    status: existing?.status ?? "ingested",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await writeSubmission(submission);

  return NextResponse.json({ ok: true, submissionId: submission.id });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const roundId = url.searchParams.get("round");
  const pageId = url.searchParams.get("page");
  if (!roundId || !pageId) {
    return NextResponse.json({ error: "round und page sind erforderlich." }, { status: 400 });
  }
  try {
    await deletePage(roundId, pageId);
  } catch {
    return NextResponse.json({ error: "Ungueltige Anfrage." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
