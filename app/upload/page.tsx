"use client";

/*
  Hochladen-Seite (AP2).

  Ablauf (Hausregel 4: der Screen sagt, was JETZT zu tun ist und was DANACH kommt):
  1. JETZT: Stapel benennen und Fotos oder Scan-PDFs hierher ziehen.
  2. Der Client rendert PDFs zu Seitenbildern und liest Fotos ein,
     schickt jede Seite an /api/ingest (entzerren, zuschneiden, ablegen).
  3. Galerie zeigt jede erkannte Seite mit Kopfzeilen-Ausschnitt, Hinweis
     ob die Vorlage erkannt wurde, Zuordnung zu einem Kuerzel und Loeschen.
  4. DANACH: weiter zum Pruefen.

  Alle Bild- und Dateiverarbeitung laeuft lokal (Browser + lokale API).
*/

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import {
  classifyFile,
  readPhotoFile,
  renderPdfToPages,
} from "@/lib/ingest/pdf-client";
import type {
  IngestPageInput,
  IngestPageResult,
  IngestResponse,
} from "@/lib/ingest/types";

type FileStage = "reading" | "rendering" | "uploading" | "done" | "error" | "skipped";

interface FileProgress {
  id: string;
  name: string;
  stage: FileStage;
  pageCount?: number;
}

interface GalleryPage extends IngestPageResult {
  assignedAlias?: string;
}

function makeRoundId(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `round-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export default function UploadPage() {
  const { t } = useI18n();

  const [roundLabel, setRoundLabel] = useState("");
  const [roundId] = useState(makeRoundId);
  const [files, setFiles] = useState<FileProgress[]>([]);
  const [pages, setPages] = useState<GalleryPage[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const setFileStage = useCallback(
    (id: string, stage: FileStage, pageCount?: number) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, stage, pageCount: pageCount ?? f.pageCount } : f)),
      );
    },
    [],
  );

  const sendPages = useCallback(
    async (inputs: IngestPageInput[]) => {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, roundLabel, pages: inputs }),
      });
      if (!res.ok) throw new Error("Ingest fehlgeschlagen");
      const data = (await res.json()) as IngestResponse;
      setPages((prev) => [...prev, ...data.results]);
    },
    [roundId, roundLabel],
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const arr = Array.from(fileList);
      for (const file of arr) {
        const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setFiles((prev) => [...prev, { id, name: file.name, stage: "reading" }]);

        const kind = classifyFile(file);
        try {
          if (kind === "pdf") {
            setFileStage(id, "rendering");
            const pagesInput = await renderPdfToPages(file);
            setFileStage(id, "uploading", pagesInput.length);
            await sendPages(pagesInput);
            setFileStage(id, "done", pagesInput.length);
          } else if (kind === "image") {
            const input = await readPhotoFile(file);
            setFileStage(id, "uploading", 1);
            await sendPages([input]);
            setFileStage(id, "done", 1);
          } else {
            setFileStage(id, "skipped");
          }
        } catch {
          setFileStage(id, "error");
        }
      }
    },
    [sendPages, setFileStage],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const assignAlias = useCallback(
    async (pageId: string, alias: string, following: boolean) => {
      const trimmed = alias.trim();
      if (!trimmed) return;
      // Zielseiten bestimmen: nur diese, oder diese und alle folgenden.
      const idx = pages.findIndex((p) => p.pageId === pageId);
      const targets = following ? pages.slice(idx) : [pages[idx]];
      const pageIds = targets.map((p) => p.pageId);

      const res = await fetch("/api/ingest/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, studentAlias: trimmed, pageIds }),
      });
      if (!res.ok) return;
      const targetSet = new Set(pageIds);
      setPages((prev) =>
        prev.map((p) => (targetSet.has(p.pageId) ? { ...p, assignedAlias: trimmed } : p)),
      );
    },
    [pages, roundId],
  );

  const deletePage = useCallback(
    async (pageId: string) => {
      const url = `/api/ingest/pages?round=${encodeURIComponent(roundId)}&page=${encodeURIComponent(pageId)}`;
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) return;
      setPages((prev) => prev.filter((p) => p.pageId !== pageId));
    },
    [roundId],
  );

  const hasPages = pages.length > 0;
  const notRecognisedCount = useMemo(
    () => pages.filter((p) => !p.templateDetected).length,
    [pages],
  );

  return (
    <div>
      <PageHeaderNowNext />

      {/* Schritt 1: Stapel benennen */}
      <div className="gp-card p-5 mb-6">
        <label htmlFor="round-label" className="block font-serif text-xl text-ink mb-1">
          {t("upload.round.label")}
        </label>
        <p className="text-ink-soft text-[15px] mb-3">{t("upload.round.hint")}</p>
        <input
          id="round-label"
          type="text"
          value={roundLabel}
          onChange={(e) => setRoundLabel(e.target.value)}
          className="w-full max-w-md rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
          placeholder="Class 11A - 2026-05-12"
        />
      </div>

      {/* Scan-Vorlagen: druckfertige Blaetter, falls die Klasse noch keine hat. */}
      <div className="gp-card p-5 mb-6">
        <p className="font-serif text-xl text-ink mb-1">{t("templates.title")}</p>
        <p className="text-ink-soft text-[15px] mb-3">{t("templates.hint")}</p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/templates/vorlage-linien.pdf"
            download={`${t("templates.lined")}.pdf`}
            className="gp-button-ghost"
          >
            {t("templates.lined")}
          </a>
          <a
            href="/templates/vorlage-kaestchen.pdf"
            download={`${t("templates.squared")}.pdf`}
            className="gp-button-ghost"
          >
            {t("templates.squared")}
          </a>
          <a
            href="/templates/scan-anleitung.pdf"
            download={`${t("templates.guide")}.pdf`}
            className="gp-button-ghost"
          >
            {t("templates.guide")}
          </a>
        </div>
      </div>

      {/* Schritt 2: Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={
          "gp-card p-8 mb-6 text-center border-2 border-dashed transition-colors " +
          (dragging ? "border-amber bg-amber-soft/40" : "border-line")
        }
      >
        <p className="font-serif text-2xl text-ink mb-1">{t("upload.drop.title")}</p>
        <p className="text-ink-soft text-[15px] mb-4">{t("upload.drop.hint")}</p>
        <button type="button" className="gp-button" onClick={() => inputRef.current?.click()}>
          {t("upload.drop.choose")}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.heic,.heif,application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Fortschritt pro Datei */}
      {files.length > 0 && (
        <ul className="mb-8 space-y-2">
          {files.map((f) => (
            <li key={f.id} className="gp-card p-3 flex items-center gap-3 text-[15px]">
              <FileStageIcon stage={f.stage} />
              <span className="text-ink flex-1 truncate">{f.name}</span>
              <span className="text-ink-soft">
                {t(`upload.file.${f.stage}`)}
                {f.pageCount ? ` (${f.pageCount} ${t("upload.file.pages")})` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Schritt 3: Galerie */}
      <h2 className="font-serif text-2xl text-ink mb-1">{t("upload.gallery.title")}</h2>
      {!hasPages ? (
        <div className="gp-card p-6 text-ink-soft">{t("upload.gallery.empty")}</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <div className="gp-card p-4">
              <p className="text-xs uppercase tracking-wide text-amber-strong font-semibold mb-1">
                {t("common.now")}
              </p>
              <p className="text-ink">{t("upload.gallery.now")}</p>
            </div>
            <div className="gp-card p-4">
              <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
                {t("common.next")}
              </p>
              <p className="text-ink-soft">{t("upload.gallery.next")}</p>
            </div>
          </div>

          {notRecognisedCount > 0 && (
            <p className="mb-4 text-[15px] text-ink-soft">
              {notRecognisedCount} / {pages.length} - {t("upload.badge.notDetected")}
            </p>
          )}

          <ul className="grid gap-4 sm:grid-cols-2">
            {pages.map((page) => (
              <GalleryCard
                key={page.pageId}
                page={page}
                onAssign={assignAlias}
                onDelete={deletePage}
              />
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/review" className="gp-button">
              {t("upload.toReview")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Unterkomponenten ---------- */

function PageHeaderNowNext() {
  const { t } = useI18n();
  return (
    <div className="mb-8">
      <h1 className="text-4xl mb-4">{t("upload.title")}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-amber-strong font-semibold mb-1">
            {t("common.now")}
          </p>
          <p className="text-ink">{t("upload.now")}</p>
        </div>
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
            {t("common.next")}
          </p>
          <p className="text-ink-soft">{t("upload.next")}</p>
        </div>
      </div>
    </div>
  );
}

function FileStageIcon({ stage }: { stage: FileStage }) {
  const color =
    stage === "done"
      ? "text-amber-strong"
      : stage === "error" || stage === "skipped"
        ? "text-cat-grammar"
        : "text-ink-soft";
  const spinning = stage === "reading" || stage === "rendering" || stage === "uploading";
  return (
    <span className={color} aria-hidden="true">
      {stage === "done" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : spinning ? (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="animate-spin"
        >
          <path d="M21 12a9 9 0 1 1-6.2-8.6" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      )}
    </span>
  );
}

function GalleryCard({
  page,
  onAssign,
  onDelete,
}: {
  page: GalleryPage;
  onAssign: (pageId: string, alias: string, following: boolean) => void;
  onDelete: (pageId: string) => void;
}) {
  const { t } = useI18n();
  const [alias, setAlias] = useState(page.assignedAlias ?? "");

  return (
    <li className="gp-card p-4">
      <div className="flex gap-3">
        <img
          src={page.imageUrl}
          alt=""
          className="w-24 h-32 object-cover rounded-md border border-line bg-paper"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] text-ink truncate">
            {t("upload.page.source")} {page.sourceName}
          </p>
          <p className="text-ink-soft text-sm mb-2">
            {t("upload.page.page")} {page.sourcePageIndex + 1}
          </p>
          {page.templateDetected ? (
            <span className="inline-block text-xs px-2 py-1 rounded-md bg-amber-soft text-amber-strong font-semibold">
              {t("upload.badge.detected")}
            </span>
          ) : (
            <span className="inline-block text-xs px-2 py-1 rounded-md bg-cat-grammar/15 text-cat-grammar font-semibold">
              {t("upload.badge.notDetected")}
            </span>
          )}
        </div>
      </div>

      {/* Kopfzeilen-Ausschnitt */}
      <div className="mt-3">
        <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
          {t("upload.badge.header")}
        </p>
        <img
          src={page.headerUrl}
          alt=""
          className="w-full h-12 object-cover rounded-md border border-line bg-paper"
        />
      </div>

      {/* Zuordnung */}
      <div className="mt-3">
        <label className="block text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
          {t("upload.assign.label")}
          {page.assignedAlias ? ` - ${t("upload.assign.assigned")}: ${page.assignedAlias}` : ""}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder={t("upload.assign.placeholder")}
            className="flex-1 min-w-[8rem] rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
          />
          <button
            type="button"
            className="gp-button-ghost"
            onClick={() => onAssign(page.pageId, alias, false)}
          >
            {t("upload.assign.apply")}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            className="text-[15px] text-amber-strong font-semibold hover:underline"
            onClick={() => onAssign(page.pageId, alias, true)}
          >
            {t("upload.assign.applyFollowing")}
          </button>
          <button
            type="button"
            className="text-[15px] text-cat-grammar font-semibold hover:underline"
            onClick={() => onDelete(page.pageId)}
          >
            {t("upload.delete")}
          </button>
        </div>
      </div>
    </li>
  );
}
