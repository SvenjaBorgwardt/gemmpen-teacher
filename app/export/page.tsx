"use client";

/*
  Export-Seite (AP8).

  JETZT: PDFs fuer freigegebene Arbeiten herunterladen (einzelnes Feedback-
  Blatt je Arbeit, Klassenuebersicht, optional die Korrektur-Datei).
  DANACH: die Blaetter ausdrucken oder an die Klasse verteilen (Hausregel 4).

  Nur freigegebene Arbeiten (Submission.status === "released") lassen sich
  exportieren. Nicht freigegebene Arbeiten werden zusaetzlich aufgelistet,
  mit einem Hinweis, wo sie gerade stehen (Pruefen oder Bewerten), damit klar
  ist, was noch zu tun ist, bevor exportiert werden kann.
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

interface ExportSubmissionSummary {
  submissionId: string;
  studentAlias: string;
  status: string;
  released: boolean;
  gradeDisplay?: string;
  stageMessageKey?: string;
}

interface RoundData {
  items: ExportSubmissionSummary[];
  releasedCount: number;
  totalCount: number;
  configName: string;
}

interface DpoFileInfo {
  roundId: string;
  count: number;
}

/** Loest einen Download aus, indem die Antwort als Blob geholt und ueber einen unsichtbaren Link gestartet wird. */
async function downloadFile(url: string, fallbackName: string): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { messageKey?: string; error?: string };
    return body.messageKey ?? body.error ?? "error";
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  const fileName = match?.[1] ?? fallbackName;
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(objectUrl);
  return null;
}

export default function ExportPage() {
  return (
    <Suspense fallback={null}>
      <ExportOverview />
    </Suspense>
  );
}

function ExportOverview() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [roundId, setRoundId] = useState<string>("");
  const [rounds, setRounds] = useState<RoundOption[]>([]);
  const [data, setData] = useState<RoundData | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingClass, setDownloadingClass] = useState(false);
  const [downloadingDpo, setDownloadingDpo] = useState(false);
  const [dpoInfo, setDpoInfo] = useState<DpoFileInfo | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

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
    const res = await fetch("/api/export/rounds");
    if (!res.ok) return;
    const json = (await res.json()) as { rounds: RoundOption[] };
    setRounds(json.rounds);
    if (!roundId && json.rounds.length > 0) {
      setRoundId(json.rounds[json.rounds.length - 1].id);
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
      setData(null);
      setDpoInfo(null);
      return;
    }
    const res = await fetch(`/api/export/rounds?round=${encodeURIComponent(round)}`);
    if (!res.ok) {
      setData(null);
      return;
    }
    const json = (await res.json()) as RoundData;
    setData(json);

    const dpoRes = await fetch("/api/export/dpo");
    if (dpoRes.ok) {
      const dpoJson = (await dpoRes.json()) as { items: DpoFileInfo[] };
      setDpoInfo(dpoJson.items.find((i) => i.roundId === round) ?? { roundId: round, count: 0 });
    }
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

  const releasedItems = useMemo(() => (data?.items ?? []).filter((i) => i.released), [data]);
  const pendingItems = useMemo(() => (data?.items ?? []).filter((i) => !i.released), [data]);

  const downloadOne = useCallback(
    async (item: ExportSubmissionSummary) => {
      setDownloadingId(item.submissionId);
      setErrorText(null);
      const messageKey = await downloadFile(
        `/api/export/feedback-pdf?round=${encodeURIComponent(roundId)}&id=${encodeURIComponent(item.submissionId)}`,
        `feedback-${item.studentAlias}.pdf`,
      );
      if (messageKey) setErrorText(t("export.error.download"));
      setDownloadingId(null);
    },
    [roundId, t],
  );

  const downloadAll = useCallback(async () => {
    // Nacheinander statt parallel, damit der Browser nicht mehrere
    // gleichzeitige Downloads blockiert oder durcheinanderbringt.
    for (const item of releasedItems) {
      await downloadOne(item);
    }
  }, [releasedItems, downloadOne]);

  const downloadClassOverview = useCallback(async () => {
    setDownloadingClass(true);
    setErrorText(null);
    const messageKey = await downloadFile(
      `/api/export/class-pdf?round=${encodeURIComponent(roundId)}`,
      `class-overview-${roundId}.pdf`,
    );
    if (messageKey) setErrorText(t("export.error.download"));
    setDownloadingClass(false);
  }, [roundId, t]);

  const downloadDpo = useCallback(async () => {
    setDownloadingDpo(true);
    setErrorText(null);
    const messageKey = await downloadFile(
      `/api/export/dpo?round=${encodeURIComponent(roundId)}`,
      `korrekturen-${roundId}.jsonl`,
    );
    if (messageKey) setErrorText(t("export.error.download"));
    setDownloadingDpo(false);
  }, [roundId, t]);

  return (
    <div>
      <ExportHeader />

      {/* Runde waehlen */}
      <div className="gp-card p-5 mb-6">
        <label htmlFor="export-round-select" className="block font-serif text-xl text-ink mb-1">
          {t("export.round.label")}
        </label>
        {rounds.length === 0 ? (
          <p className="text-ink-soft text-[15px]">{t("export.round.none")}</p>
        ) : (
          <select
            id="export-round-select"
            value={roundId}
            onChange={(e) => {
              setRoundId(e.target.value);
              router.replace(`/export?round=${encodeURIComponent(e.target.value)}`);
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
          <Link href="/assess" className="gp-button mt-3 inline-flex">
            {t("export.round.toAssess")}
          </Link>
        )}
      </div>

      {roundId && data && (
        <>
          {errorText && (
            <div className="gp-card p-4 mb-6 border-l-4 border-alert">
              <p className="text-ink text-[15px]">{errorText}</p>
            </div>
          )}

          {/* Freigegebene Arbeiten: PDFs herunterladen */}
          <div className="gp-card p-5 mb-6">
            <p className="font-serif text-xl text-ink mb-1">{t("export.released.title")}</p>
            <p className="text-ink-soft text-[15px] mb-4">
              {t("export.released.summary")
                .replace("{{released}}", String(data.releasedCount))
                .replace("{{total}}", String(data.totalCount))}
            </p>

            {releasedItems.length === 0 ? (
              <p className="text-ink-soft text-[15px]">{t("export.released.empty")}</p>
            ) : (
              <>
                <button
                  type="button"
                  className="gp-button mb-4"
                  onClick={() => void downloadAll()}
                  disabled={downloadingId !== null}
                >
                  {t("export.released.downloadAll")}
                </button>
                <ul className="grid gap-2">
                  {releasedItems.map((item) => (
                    <li
                      key={item.submissionId}
                      className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-paper-raised px-4 py-3"
                    >
                      <span className="font-serif text-lg text-ink">{item.studentAlias}</span>
                      {item.gradeDisplay && (
                        <span className="text-ink-soft text-[15px] font-semibold">
                          {item.gradeDisplay}
                        </span>
                      )}
                      <button
                        type="button"
                        className="ml-auto text-amber-strong text-[15px] font-semibold hover:underline disabled:opacity-50"
                        onClick={() => void downloadOne(item)}
                        disabled={downloadingId !== null}
                      >
                        {downloadingId === item.submissionId
                          ? t("export.released.downloading")
                          : t("export.released.downloadOne")}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* Klassenuebersicht */}
          <div className="gp-card p-5 mb-6">
            <p className="font-serif text-xl text-ink mb-1">{t("export.classOverview.title")}</p>
            <p className="text-ink-soft text-[15px] mb-3">{t("export.classOverview.hint")}</p>
            <button
              type="button"
              className="gp-button-ghost"
              onClick={() => void downloadClassOverview()}
              disabled={downloadingClass || releasedItems.length === 0}
            >
              {downloadingClass
                ? t("export.classOverview.downloading")
                : t("export.classOverview.download")}
            </button>
            {releasedItems.length === 0 && (
              <p className="text-ink-soft text-sm mt-2">{t("export.classOverview.emptyHint")}</p>
            )}
          </div>

          {/* Nicht freigegebene Arbeiten */}
          {pendingItems.length > 0 && (
            <div className="gp-card p-5 mb-6">
              <p className="font-serif text-xl text-ink mb-1">{t("export.pending.title")}</p>
              <p className="text-ink-soft text-[15px] mb-3">{t("export.pending.hint")}</p>
              <ul className="grid gap-2">
                {pendingItems.map((item) => (
                  <li
                    key={item.submissionId}
                    className="flex flex-wrap items-center gap-3 rounded-md border border-line px-4 py-3"
                  >
                    <span className="font-serif text-lg text-ink-soft">{item.studentAlias}</span>
                    <span className="text-ink-soft text-[15px]">
                      {item.stageMessageKey ? t(item.stageMessageKey) : ""}
                    </span>
                    <Link
                      href={
                        item.status === "checked" || item.status === "assessed"
                          ? `/assess/${encodeURIComponent(item.submissionId)}?round=${encodeURIComponent(roundId)}`
                          : `/review?round=${encodeURIComponent(roundId)}`
                      }
                      className="ml-auto text-amber-strong text-[15px] font-semibold hover:underline"
                    >
                      {t("export.pending.goTo")}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* DPO-Export */}
          <div className="gp-card p-5">
            <p className="font-serif text-xl text-ink mb-1">{t("export.dpo.title")}</p>
            <p className="text-ink-soft text-[15px] mb-3">{t("export.dpo.explainer")}</p>
            {dpoInfo && dpoInfo.count > 0 ? (
              <>
                <p className="text-ink-soft text-[15px] mb-3">
                  {t("export.dpo.count").replace("{{count}}", String(dpoInfo.count))}
                </p>
                <button
                  type="button"
                  className="gp-button-ghost"
                  onClick={() => void downloadDpo()}
                  disabled={downloadingDpo}
                >
                  {downloadingDpo ? t("export.dpo.downloading") : t("export.dpo.download")}
                </button>
              </>
            ) : (
              <p className="text-ink-soft text-[15px]">{t("export.dpo.empty")}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ExportHeader() {
  const { t } = useI18n();
  return (
    <div className="mb-8">
      <h1 className="text-4xl mb-4">{t("export.title")}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-amber-strong font-semibold mb-1">
            {t("common.now")}
          </p>
          <p className="text-ink">{t("export.now")}</p>
        </div>
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
            {t("common.next")}
          </p>
          <p className="text-ink-soft">{t("export.next")}</p>
        </div>
      </div>
    </div>
  );
}
