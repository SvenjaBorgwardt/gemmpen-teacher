"use client";

/*
  Pruefen-Uebersicht (AP6).

  JETZT: eine Runde waehlen, die Erkennung starten (falls noch nicht
  geschehen) und offene Arbeiten pruefen. DANACH: geprueft-bestaetigte
  Arbeiten koennen bewertet werden.

  Ablauf:
  1. Runde waehlen (aus data/submissions/, gemerkt in localStorage).
  2. "Erkennung starten" ruft POST /api/recognize/run auf (AP3) und zeigt den
     Fortschritt; danach laedt die Liste neu.
  3. Liste aller Arbeiten der Runde mit Status, Kuerzel (Kopfzeilen-Vorschlag
     als uebernehmbar markiert), Seitenzahl. Klick auf eine Arbeit oeffnet die
     Detailansicht (Split-View, app/review/[id]/page.tsx).
*/

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const LAST_ROUND_KEY = "gemmpen.lastRound";

/** Runde mit Anzeigename: gespeicherter Stapelname, sonst die technische roundId. */
interface RoundOption {
  id: string;
  label: string;
}

interface SubmissionSummary {
  submissionId: string;
  studentAlias: string;
  taskCode?: string;
  status: string;
  pageCount: number;
  hasTranscript: boolean;
  confirmed: boolean;
  unclearCount: number;
  canConfirm: boolean;
  headerSuggestion?: {
    taskCode: string | null;
    studentAlias: string | null;
    sheetNumber: string | null;
  };
}

type RunState = "idle" | "running" | "done" | "error";

function statusKey(item: SubmissionSummary): string {
  if (!item.hasTranscript) return "review.status.recognizing";
  if (item.confirmed) return "review.status.checked";
  return "review.status.open";
}

function statusTone(item: SubmissionSummary): "muted" | "amber" | "ok" {
  if (!item.hasTranscript) return "muted";
  if (item.confirmed) return "ok";
  return "amber";
}

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewOverview />
    </Suspense>
  );
}

function ReviewOverview() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [roundId, setRoundId] = useState<string>("");
  const [rounds, setRounds] = useState<RoundOption[]>([]);
  const [items, setItems] = useState<SubmissionSummary[] | null>(null);
  const [runState, setRunState] = useState<RunState>("idle");
  const [runProgress, setRunProgress] = useState<{ processed: number; total: number } | null>(
    null,
  );
  const [runPlaceholder, setRunPlaceholder] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  // Runde bestimmen: URL-Parameter zuerst, sonst zuletzt genutzte Runde. Der
  // Aufruf steht in einer async IIFE innerhalb des Effekts (wie in
  // app/settings/page.tsx), damit kein setState direkt im Effekt-Body steht.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      const fromUrl = searchParams.get("round");
      if (fromUrl) {
        setRoundId(fromUrl);
        return;
      }
      const stored = window.localStorage.getItem(LAST_ROUND_KEY);
      if (stored) setRoundId(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const loadRounds = useCallback(async () => {
    const res = await fetch("/api/review/rounds");
    if (!res.ok) return;
    const data = (await res.json()) as { rounds: RoundOption[] };
    setRounds(data.rounds);
    if (!roundId && data.rounds.length > 0) {
      setRoundId(data.rounds[data.rounds.length - 1].id);
    }
  }, [roundId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadRounds();
    })();
    return () => {
      cancelled = true;
    };
    // Nur beim ersten Laden die Rundenliste holen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadItems = useCallback(async (round: string) => {
    if (!round) {
      setItems(null);
      return;
    }
    const res = await fetch(`/api/review/rounds?round=${encodeURIComponent(round)}`);
    if (!res.ok) {
      setItems([]);
      return;
    }
    const data = (await res.json()) as { items: SubmissionSummary[] };
    setItems(data.items);
  }, []);

  useEffect(() => {
    if (!roundId) return;
    window.localStorage.setItem(LAST_ROUND_KEY, roundId);
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadItems(roundId);
    })();
    return () => {
      cancelled = true;
    };
  }, [roundId, loadItems]);

  const startRecognition = useCallback(async () => {
    if (!roundId) return;
    setRunState("running");
    setRunError(null);
    setRunProgress(null);
    setRunPlaceholder(false);
    try {
      const res = await fetch("/api/recognize/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId }),
      });
      if (!res.ok) {
        setRunState("error");
        setRunError(t("review.run.error"));
        return;
      }
      const data = (await res.json()) as {
        total: number;
        processed: number;
        usingRealClient?: boolean;
        results: Array<{ status: string; errorMessageKey?: string }>;
      };
      setRunProgress({ processed: data.processed, total: data.total });
      setRunPlaceholder(data.usingRealClient === false && data.processed > 0);
      const firstError = data.results.find((r) => r.status === "error");
      if (firstError?.errorMessageKey) {
        setRunState("error");
        setRunError(t(firstError.errorMessageKey));
      } else {
        setRunState("done");
      }
      await loadItems(roundId);
    } catch {
      setRunState("error");
      setRunError(t("review.run.error"));
    }
  }, [roundId, loadItems, t]);

  const openCount = useMemo(
    () => (items ?? []).filter((i) => i.hasTranscript && !i.confirmed).length,
    [items],
  );
  const recognizingCount = useMemo(
    () => (items ?? []).filter((i) => !i.hasTranscript).length,
    [items],
  );
  const checkedCount = useMemo(() => (items ?? []).filter((i) => i.confirmed).length, [items]);

  return (
    <div>
      <ReviewHeader />

      {/* Runde waehlen */}
      <div className="gp-card p-5 mb-6">
        <label htmlFor="round-select" className="block font-serif text-xl text-ink mb-1">
          {t("review.round.label")}
        </label>
        {rounds.length === 0 ? (
          <p className="text-ink-soft text-[15px]">{t("review.round.none")}</p>
        ) : (
          <select
            id="round-select"
            value={roundId}
            onChange={(e) => {
              setRoundId(e.target.value);
              router.replace(`/review?round=${encodeURIComponent(e.target.value)}`);
            }}
            className="w-full max-w-md rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
          >
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        )}
        {rounds.length === 0 && (
          <Link href="/upload" className="gp-button mt-3 inline-flex">
            {t("review.round.toUpload")}
          </Link>
        )}
      </div>

      {roundId && (
        <>
          {/* Erkennung starten */}
          <div className="gp-card p-5 mb-6">
            <p className="font-serif text-xl text-ink mb-1">{t("review.recognize.title")}</p>
            <p className="text-ink-soft text-[15px] mb-3">{t("review.recognize.hint")}</p>
            <button
              type="button"
              className="gp-button"
              onClick={() => void startRecognition()}
              disabled={runState === "running"}
            >
              {runState === "running"
                ? t("review.recognize.running")
                : t("review.recognize.start")}
            </button>
            {runState === "running" && (
              <p className="text-ink-soft text-sm mt-2">{t("review.recognize.inProgress")}</p>
            )}
            {runState === "done" && runProgress && (
              <p className="text-ink-soft text-sm mt-2">
                {t("review.recognize.done").replace("{{count}}", String(runProgress.processed))}
              </p>
            )}
            {runState === "done" && runPlaceholder && (
              <p className="mt-2 rounded-md border border-amber-soft bg-amber-soft/60 px-3 py-2 text-sm text-ink-soft">
                {t("review.recognize.placeholder")}
              </p>
            )}
            {runState === "error" && runError && (
              <p className="text-alert text-sm mt-2">{runError}</p>
            )}
          </div>

          {/* Liste der Arbeiten */}
          <h2 className="font-serif text-2xl text-ink mb-1">{t("review.list.title")}</h2>
          {items === null ? (
            <div className="gp-card p-6 text-ink-soft">{t("review.list.loading")}</div>
          ) : items.length === 0 ? (
            <div className="gp-card p-6 text-ink-soft">{t("review.list.empty")}</div>
          ) : (
            <>
              <p className="text-ink-soft text-[15px] mb-4">
                {t("review.list.summary")
                  .replace("{{checked}}", String(checkedCount))
                  .replace("{{open}}", String(openCount))
                  .replace("{{recognizing}}", String(recognizingCount))}
              </p>
              <ul className="grid gap-3">
                {items.map((item) => (
                  <SubmissionRow key={item.submissionId} item={item} roundId={roundId} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ReviewHeader() {
  const { t } = useI18n();
  return (
    <div className="mb-8">
      <h1 className="text-4xl mb-4">{t("review.title")}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-amber-strong font-semibold mb-1">
            {t("common.now")}
          </p>
          <p className="text-ink">{t("review.now")}</p>
        </div>
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
            {t("common.next")}
          </p>
          <p className="text-ink-soft">{t("review.next")}</p>
        </div>
      </div>
    </div>
  );
}

function SubmissionRow({ item, roundId }: { item: SubmissionSummary; roundId: string }) {
  const { t } = useI18n();
  const tone = statusTone(item);
  const toneClass =
    tone === "ok"
      ? "bg-amber-soft text-amber-strong"
      : tone === "amber"
        ? "bg-cat-vocabulary/15 text-amber-strong"
        : "bg-line/60 text-ink-soft";

  const suggestedAlias = item.headerSuggestion?.studentAlias;
  const showSuggestion = Boolean(suggestedAlias) && suggestedAlias !== item.studentAlias;

  return (
    <li className="gp-card p-4">
      <Link
        href={`/review/${encodeURIComponent(item.submissionId)}?round=${encodeURIComponent(roundId)}`}
        className="flex flex-wrap items-center gap-4"
      >
        <span className={`text-xs px-2 py-1 rounded-md font-semibold shrink-0 ${toneClass}`}>
          {t(statusKey(item))}
        </span>
        <span className="font-serif text-xl text-ink">
          {item.studentAlias}
          {showSuggestion && (
            <span className="ml-2 text-sm font-sans font-normal text-ink-soft">
              {t("review.list.suggestion")}: {suggestedAlias}
            </span>
          )}
        </span>
        <span className="text-ink-soft text-[15px]">
          {item.pageCount} {t("review.list.pages")}
        </span>
        {item.hasTranscript && !item.confirmed && (
          <span className="text-[15px] text-amber-strong font-semibold">
            {item.unclearCount > 0
              ? t("review.list.unclearCount").replace("{{count}}", String(item.unclearCount))
              : t("review.list.readyToConfirm")}
          </span>
        )}
        <span className="ml-auto text-amber-strong text-[15px] font-semibold">
          {t("review.list.open")}
        </span>
      </Link>
    </li>
  );
}
