"use client";

/*
  Pruefen-Detailansicht (AP6): Split-View.

  Links: das entzerrte Scan-Bild der aktuell fokussierten Seite, zoombar
  (Buttons + Mausrad), mehrseitig blaetterbar.
  Rechts: der erkannte Text, zeilenweise editierbar. Unsichere Woerter
  ([[wort?]]) sind gelb hinterlegt und per Klick fokussierbar; der Fokus
  einer Zeile hebt die zugehoerige Bildregion links hervor (echte Position
  aus dem Ingest, falls vorhanden, sonst eine proportionale Schaetzung ueber
  die Zeilennummer, siehe lib/review/unclear.ts).

  Bestaetigen-Knopf: nur aktiv, wenn keine [[wort?]]-Markierung mehr im Text
  steht (Hausregel: jede Unsicherheit muss von der Lehrkraft entschieden
  werden). Nach dem Bestaetigen wechselt der Status sichtbar auf "geprueft".
*/

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import {
  countUnclearMarkers,
  estimateLineHighlight,
  groupLinesByPage,
  hasUnclearMarkers,
  splitUnclearSegments,
  transcriptHasUnclearMarkers,
} from "@/lib/review/unclear";
import type { HeaderSuggestion, Submission, SubmissionPage, Transcript, TranscriptLine } from "@/lib/types";

interface DetailResponse {
  submission: Submission & { pages: Array<SubmissionPage & { imageUrl: string; headerUrl: string }> };
  transcript: Transcript | null;
  unclearCount: number;
  canConfirm: boolean;
}

export default function ReviewDetailPage() {
  return (
    <Suspense fallback={null}>
      <ReviewDetail />
    </Suspense>
  );
}

function ReviewDetail() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const submissionId = params.id;
  const roundId = searchParams.get("round") ?? "";

  const [data, setData] = useState<DetailResponse | null>(null);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [focusedLineIndex, setFocusedLineIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!roundId || !submissionId) return;
    const res = await fetch(
      `/api/review/submission?round=${encodeURIComponent(roundId)}&id=${encodeURIComponent(submissionId)}`,
    );
    if (!res.ok) return;
    const json = (await res.json()) as DetailResponse;
    setData(json);
    setLines(json.transcript?.lines ?? []);
    setAliasDraft(json.submission.studentAlias);
  }, [roundId, submissionId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const linesByPage = useMemo(() => groupLinesByPage(lines), [lines]);
  const currentPage = data?.submission.pages[activePageIndex];

  const unclearCount = useMemo(
    () => lines.reduce((sum, l) => sum + countUnclearMarkers(l.text), 0),
    [lines],
  );
  const canConfirm = useMemo(
    () => lines.length > 0 && !transcriptHasUnclearMarkers(lines),
    [lines],
  );

  const persistLines = useCallback(
    async (nextLines: TranscriptLine[]) => {
      if (!roundId || !submissionId) return;
      setSaving(true);
      setSavedHint(false);
      try {
        await fetch("/api/review/submission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundId, submissionId, lines: nextLines }),
        });
        setSavedHint(true);
      } finally {
        setSaving(false);
      }
    },
    [roundId, submissionId],
  );

  const updateLineText = useCallback(
    (index: number, text: string) => {
      setLines((prev) => {
        const next = prev.map((l) => (l.index === index ? { ...l, text } : l));
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void persistLines(next), 600);
        return next;
      });
    },
    [persistLines],
  );

  const focusLine = useCallback(
    (line: TranscriptLine) => {
      setFocusedLineIndex(line.index);
      const pageIndex = line.position?.pageIndex ?? 0;
      setActivePageIndex(pageIndex);
    },
    [],
  );

  const confirm = useCallback(async () => {
    if (!roundId || !submissionId) return;
    setConfirming(true);
    setConfirmError(null);
    try {
      const res = await fetch("/api/review/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, submissionId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setConfirmError(body.error ?? t("review.detail.confirmError"));
        return;
      }
      await load();
    } finally {
      setConfirming(false);
    }
  }, [roundId, submissionId, load, t]);

  const applyHeaderAlias = useCallback(
    async (suggestion: HeaderSuggestion) => {
      if (!suggestion.studentAlias || !roundId || !submissionId) return;
      setAliasDraft(suggestion.studentAlias);
      await fetch("/api/review/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId,
          submissionId,
          lines,
          studentAlias: suggestion.studentAlias,
        }),
      });
      await load();
    },
    [roundId, submissionId, lines, load],
  );

  if (!data) {
    return (
      <div>
        <DetailHeader alias={aliasDraft} confirmed={false} />
        <div className="gp-card p-6 text-ink-soft">{t("review.detail.loading")}</div>
      </div>
    );
  }

  const confirmed = data.transcript?.confirmed ?? false;
  const suggestion = data.submission.headerSuggestion;
  const showAliasSuggestion =
    suggestion?.studentAlias && suggestion.studentAlias !== data.submission.studentAlias;

  return (
    <div>
      <DetailHeader alias={aliasDraft} confirmed={confirmed} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href={`/review?round=${encodeURIComponent(roundId)}`} className="gp-button-ghost">
          {t("review.detail.back")}
        </Link>
        {showAliasSuggestion && (
          <button
            type="button"
            className="text-[15px] text-amber-strong font-semibold hover:underline"
            onClick={() => void applyHeaderAlias(suggestion!)}
          >
            {t("review.detail.applySuggestion").replace(
              "{{alias}}",
              suggestion!.studentAlias ?? "",
            )}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Links: Scan-Bild */}
        <div className="gp-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-ink">
              {t("review.detail.page")} {activePageIndex + 1} / {data.submission.pages.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="gp-button-ghost px-2 py-1"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                aria-label={t("review.detail.zoomOut")}
              >
                -
              </button>
              <span className="text-ink-soft text-sm w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                className="gp-button-ghost px-2 py-1"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                aria-label={t("review.detail.zoomIn")}
              >
                +
              </button>
            </div>
          </div>

          <div className="relative overflow-auto rounded-md border border-line bg-paper max-h-[70vh]">
            {currentPage && (
              <div
                className="relative inline-block"
                style={{ width: `${zoom * 100}%`, minWidth: "100%" }}
              >
                <img
                  src={currentPage.imageUrl}
                  alt=""
                  className="block w-full h-auto select-none"
                  draggable={false}
                />
                {focusedLineIndex !== null &&
                  (() => {
                    const focusedLine = lines.find((l) => l.index === focusedLineIndex);
                    if (!focusedLine) return null;
                    const pageLines = linesByPage.get(activePageIndex) ?? [];
                    const highlight = estimateLineHighlight(focusedLine, pageLines);
                    if (highlight.pageIndex !== activePageIndex) return null;
                    return (
                      <div
                        className="absolute left-0 right-0 pointer-events-none"
                        style={{
                          top: `${highlight.top * 100}%`,
                          height: `${Math.max(1.5, (highlight.bottom - highlight.top) * 100)}%`,
                          background: "rgba(184, 134, 11, 0.25)",
                          borderTop: "2px solid var(--amber-strong)",
                          borderBottom: "2px solid var(--amber-strong)",
                        }}
                      />
                    );
                  })()}
              </div>
            )}
          </div>

          {data.submission.pages.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.submission.pages.map((p, i) => (
                <button
                  key={p.index}
                  type="button"
                  onClick={() => setActivePageIndex(i)}
                  className={
                    "text-sm px-3 py-1.5 rounded-md border " +
                    (i === activePageIndex
                      ? "border-amber-strong bg-amber-soft text-amber-strong font-semibold"
                      : "border-line text-ink-soft hover:bg-amber-soft/40")
                  }
                >
                  {t("review.detail.page")} {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rechts: Text, zeilenweise editierbar */}
        <div className="gp-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-ink">{t("review.detail.textTitle")}</p>
            <p className="text-ink-soft text-sm">
              {saving
                ? t("review.detail.saving")
                : savedHint
                  ? t("review.detail.saved")
                  : ""}
            </p>
          </div>

          {unclearCount > 0 && (
            <p className="mb-3 text-[15px] text-amber-strong font-semibold">
              {t("review.detail.unclearHint").replace("{{count}}", String(unclearCount))}
            </p>
          )}

          <ul className="space-y-2 max-h-[70vh] overflow-auto pr-1">
            {lines.map((line) => (
              <LineEditor
                key={line.index}
                line={line}
                focused={focusedLineIndex === line.index}
                onFocus={() => focusLine(line)}
                onChange={(text) => updateLineText(line.index, text)}
              />
            ))}
            {lines.length === 0 && (
              <li className="text-ink-soft text-[15px]">{t("review.detail.noLines")}</li>
            )}
          </ul>
        </div>
      </div>

      {/* Bestaetigen */}
      <div className="gp-card p-5 mt-6">
        <p className="font-semibold text-ink mb-1">{t("review.detail.confirmTitle")}</p>
        <p className="text-ink-soft text-[15px] mb-3">
          {canConfirm
            ? t("review.detail.confirmReady")
            : t("review.detail.confirmBlocked").replace("{{count}}", String(unclearCount))}
        </p>
        {confirmed ? (
          <p className="text-amber-strong font-semibold">{t("review.detail.confirmedNote")}</p>
        ) : (
          <button
            type="button"
            className="gp-button"
            onClick={() => void confirm()}
            disabled={!canConfirm || confirming}
          >
            {confirming ? t("review.detail.confirming") : t("review.detail.confirm")}
          </button>
        )}
        {confirmError && <p className="text-alert text-sm mt-2">{confirmError}</p>}
      </div>
    </div>
  );
}

function DetailHeader({ alias, confirmed }: { alias: string; confirmed: boolean }) {
  const { t } = useI18n();
  return (
    <div className="mb-6">
      <h1 className="text-4xl mb-4">
        {t("review.detail.title")} {alias ? `- ${alias}` : ""}
      </h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-amber-strong font-semibold mb-1">
            {t("common.now")}
          </p>
          <p className="text-ink">
            {confirmed ? t("review.detail.now.done") : t("review.detail.now")}
          </p>
        </div>
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
            {t("common.next")}
          </p>
          <p className="text-ink-soft">{t("review.detail.next")}</p>
        </div>
      </div>
    </div>
  );
}

function LineUnclearHint() {
  const { t } = useI18n();
  return <p className="text-amber-strong text-xs mt-1">{t("review.detail.lineUnclear")}</p>;
}

function LineEditor({
  line,
  focused,
  onFocus,
  onChange,
}: {
  line: TranscriptLine;
  focused: boolean;
  onFocus: () => void;
  onChange: (text: string) => void;
}) {
  const { t } = useI18n();
  const segments = useMemo(() => splitUnclearSegments(line.text), [line.text]);
  const lineHasUnclear = hasUnclearMarkers(line.text);

  return (
    <li
      className={
        "rounded-md border p-2 transition-colors " +
        (focused ? "border-amber-strong bg-amber-soft/30" : "border-line")
      }
    >
      {/* Vorschau mit gelb hinterlegten unsicheren Woertern, per Klick fokussierbar */}
      <button
        type="button"
        onClick={onFocus}
        className="block w-full text-left text-[15px] leading-relaxed mb-1"
      >
        {segments.map((seg) =>
          seg.kind === "unclear" ? (
            <mark
              key={seg.key}
              className="bg-amber-soft text-amber-strong px-0.5 rounded-sm font-semibold"
            >
              {seg.text || "?"}
            </mark>
          ) : (
            <span key={seg.key}>{seg.text}</span>
          ),
        )}
        {line.text.trim() === "" && (
          <span className="text-ink-soft italic">{t("review.detail.emptyLine")}</span>
        )}
      </button>

      {/* Editierbares Feld */}
      <input
        type="text"
        value={line.text}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-line bg-paper-raised px-2 py-1 text-ink text-[15px]"
      />
      {lineHasUnclear && (
        <LineUnclearHint />
      )}
    </li>
  );
}
