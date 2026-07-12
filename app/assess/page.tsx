"use client";

/*
  Bewerten-Uebersicht (AP7).

  JETZT: eine Runde waehlen, bei Bedarf die Fach-Konfiguration festlegen,
  die Bewertungskette fuer eine Arbeit oder alle offenen Arbeiten starten.
  DANACH: die Vorschlaege pruefen, anpassen und freigeben (Hausregel 4).

  Ablauf:
  1. Runde waehlen (aus data/submissions/, gemerkt in localStorage, wie AP6).
  2. Fach-Konfiguration waehlen, falls die Arbeiten der Runde noch keine
     zugeordnet haben (Submission.configId ist beim Hochladen noch leer).
  3. "Bewertung starten" ruft POST /api/assess/run auf (alle Arbeiten mit
     Status "geprueft"), zeigt den Fortschritt und Fehler pro Arbeit statt
     eines Totalabbruchs.
  4. Liste aller Arbeiten der Runde mit Status (unbewertet, bewertet,
     freigegeben) und Note. Klick oeffnet die Detailansicht.
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

interface AssessSubmissionSummary {
  submissionId: string;
  studentAlias: string;
  taskCode?: string;
  status: string;
  hasAssessment: boolean;
  gradeDisplay?: string;
  released: boolean;
}

interface ConfigOption {
  id: string;
  name: string;
  subject: string;
}

type RunState = "idle" | "running" | "done" | "error";

function statusKey(item: AssessSubmissionSummary): string {
  if (item.released) return "assess.status.released";
  if (item.hasAssessment) return "assess.status.assessed";
  return "assess.status.open";
}

function statusTone(item: AssessSubmissionSummary): "muted" | "amber" | "ok" {
  if (item.released) return "ok";
  if (item.hasAssessment) return "amber";
  return "muted";
}

export default function AssessPage() {
  return (
    <Suspense fallback={null}>
      <AssessOverview />
    </Suspense>
  );
}

function AssessOverview() {
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [roundId, setRoundId] = useState<string>("");
  const [rounds, setRounds] = useState<RoundOption[]>([]);
  const [items, setItems] = useState<AssessSubmissionSummary[] | null>(null);
  const [configs, setConfigs] = useState<ConfigOption[]>([]);
  const [currentConfigId, setCurrentConfigId] = useState<string>("");
  const [selectedConfigId, setSelectedConfigId] = useState<string>("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [runProgress, setRunProgress] = useState<{ processed: number; total: number } | null>(
    null,
  );
  const [runErrors, setRunErrors] = useState<string[]>([]);
  const [runPlaceholder, setRunPlaceholder] = useState(false);

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
    const res = await fetch("/api/assess/rounds");
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
    const res = await fetch(`/api/assess/rounds?round=${encodeURIComponent(round)}`);
    if (!res.ok) {
      setItems([]);
      return;
    }
    const data = (await res.json()) as {
      items: AssessSubmissionSummary[];
      currentConfigId: string;
      configs: ConfigOption[];
    };
    setItems(data.items);
    setConfigs(data.configs);
    setCurrentConfigId(data.currentConfigId);
    setSelectedConfigId(data.currentConfigId || data.configs[0]?.id || "");
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

  const saveConfig = useCallback(async () => {
    if (!roundId || !selectedConfigId) return;
    setSavingConfig(true);
    try {
      await fetch("/api/assess/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, configId: selectedConfigId }),
      });
      await loadItems(roundId);
    } finally {
      setSavingConfig(false);
    }
  }, [roundId, selectedConfigId, loadItems]);

  const startAssessment = useCallback(
    async (submissionId?: string) => {
      if (!roundId) return;
      setRunState("running");
      setRunErrors([]);
      setRunProgress(null);
      setRunPlaceholder(false);
      try {
        const res = await fetch("/api/assess/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roundId, submissionId }),
        });
        if (!res.ok) {
          setRunState("error");
          setRunErrors([t("assess.run.error")]);
          return;
        }
        const data = (await res.json()) as {
          total: number;
          processed: number;
          usingRealClient?: boolean;
          results: Array<{ submissionId: string; status: string; errorMessageKey?: string }>;
        };
        setRunProgress({ processed: data.processed, total: data.total });
        setRunPlaceholder(data.usingRealClient === false && data.processed > 0);
        const errors = data.results
          .filter((r) => r.status === "error")
          .map((r) => `${r.submissionId}: ${r.errorMessageKey ? t(r.errorMessageKey) : t("assess.run.error")}`);
        setRunErrors(errors);
        setRunState(errors.length > 0 && data.processed === 0 ? "error" : "done");
        await loadItems(roundId);
      } catch {
        setRunState("error");
        setRunErrors([t("assess.run.error")]);
      }
    },
    [roundId, loadItems, t],
  );

  const openCount = useMemo(
    () => (items ?? []).filter((i) => !i.hasAssessment).length,
    [items],
  );
  const assessedCount = useMemo(
    () => (items ?? []).filter((i) => i.hasAssessment && !i.released).length,
    [items],
  );
  const releasedCount = useMemo(() => (items ?? []).filter((i) => i.released).length, [items]);

  const needsConfig = !currentConfigId;

  return (
    <div>
      <AssessHeader />

      {/* Runde waehlen */}
      <div className="gp-card p-5 mb-6">
        <label htmlFor="assess-round-select" className="block font-serif text-xl text-ink mb-1">
          {t("assess.round.label")}
        </label>
        {rounds.length === 0 ? (
          <p className="text-ink-soft text-[15px]">{t("assess.round.none")}</p>
        ) : (
          <select
            id="assess-round-select"
            value={roundId}
            onChange={(e) => {
              setRoundId(e.target.value);
              router.replace(`/assess?round=${encodeURIComponent(e.target.value)}`);
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
            {t("assess.round.toUpload")}
          </Link>
        )}
      </div>

      {roundId && (
        <>
          {/* Fach-Konfiguration */}
          <div className="gp-card p-5 mb-6">
            <p className="font-serif text-xl text-ink mb-1">{t("assess.config.title")}</p>
            <p className="text-ink-soft text-[15px] mb-3">
              {needsConfig ? t("assess.config.hintMissing") : t("assess.config.hintSet")}
            </p>
            {configs.length === 0 ? (
              <Link href="/setup" className="gp-button-ghost inline-flex">
                {t("assess.config.toSetup")}
              </Link>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedConfigId}
                  onChange={(e) => setSelectedConfigId(e.target.value)}
                  className="rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
                >
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.subject})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="gp-button-ghost"
                  onClick={() => void saveConfig()}
                  disabled={savingConfig || !selectedConfigId}
                >
                  {savingConfig ? t("assess.config.saving") : t("assess.config.use")}
                </button>
              </div>
            )}
          </div>

          {/* Bewertung starten */}
          <div className="gp-card p-5 mb-6">
            <p className="font-serif text-xl text-ink mb-1">{t("assess.run.title")}</p>
            <p className="text-ink-soft text-[15px] mb-3">{t("assess.run.hint")}</p>
            <button
              type="button"
              className="gp-button"
              onClick={() => void startAssessment()}
              disabled={runState === "running" || needsConfig}
            >
              {runState === "running" ? t("assess.run.running") : t("assess.run.start")}
            </button>
            {needsConfig && (
              <p className="text-amber-strong text-sm mt-2">{t("assess.run.needsConfig")}</p>
            )}
            {runState === "running" && (
              <p className="text-ink-soft text-sm mt-2">{t("assess.run.inProgress")}</p>
            )}
            {runState === "done" && runProgress && (
              <p className="text-ink-soft text-sm mt-2">
                {t("assess.run.done").replace("{{count}}", String(runProgress.processed))}
              </p>
            )}
            {runState === "done" && runPlaceholder && (
              <p className="mt-2 rounded-md border border-amber-soft bg-amber-soft/60 px-3 py-2 text-sm text-ink-soft">
                {t("assess.run.placeholder")}
              </p>
            )}
            {runErrors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {runErrors.map((e, i) => (
                  <li key={i} className="text-alert text-sm">
                    {e}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Liste der Arbeiten */}
          <h2 className="font-serif text-2xl text-ink mb-1">{t("assess.list.title")}</h2>
          {items === null ? (
            <div className="gp-card p-6 text-ink-soft">{t("assess.list.loading")}</div>
          ) : items.length === 0 ? (
            <div className="gp-card p-6 text-ink-soft">{t("assess.list.empty")}</div>
          ) : (
            <>
              <p className="text-ink-soft text-[15px] mb-4">
                {t("assess.list.summary")
                  .replace("{{released}}", String(releasedCount))
                  .replace("{{assessed}}", String(assessedCount))
                  .replace("{{open}}", String(openCount))}
              </p>
              <ul className="grid gap-3">
                {items.map((item) => (
                  <SubmissionRow
                    key={item.submissionId}
                    item={item}
                    roundId={roundId}
                    onRunOne={() => void startAssessment(item.submissionId)}
                    running={runState === "running"}
                    disabled={needsConfig}
                  />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

function AssessHeader() {
  const { t } = useI18n();
  return (
    <div className="mb-8">
      <h1 className="text-4xl mb-4">{t("assess.title")}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-amber-strong font-semibold mb-1">
            {t("common.now")}
          </p>
          <p className="text-ink">{t("assess.now")}</p>
        </div>
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
            {t("common.next")}
          </p>
          <p className="text-ink-soft">{t("assess.next")}</p>
        </div>
      </div>
    </div>
  );
}

function SubmissionRow({
  item,
  roundId,
  onRunOne,
  running,
  disabled,
}: {
  item: AssessSubmissionSummary;
  roundId: string;
  onRunOne: () => void;
  running: boolean;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const tone = statusTone(item);
  const toneClass =
    tone === "ok"
      ? "bg-amber-soft text-amber-strong"
      : tone === "amber"
        ? "bg-cat-vocabulary/15 text-amber-strong"
        : "bg-line/60 text-ink-soft";

  return (
    <li className="gp-card p-4 flex flex-wrap items-center gap-4">
      <span className={`text-xs px-2 py-1 rounded-md font-semibold shrink-0 ${toneClass}`}>
        {t(statusKey(item))}
      </span>
      <span className="font-serif text-xl text-ink">{item.studentAlias}</span>
      {item.gradeDisplay && (
        <span className="text-ink-soft text-[15px] font-semibold">{item.gradeDisplay}</span>
      )}
      {!item.hasAssessment && (
        <button
          type="button"
          className="text-[15px] text-amber-strong font-semibold hover:underline"
          onClick={onRunOne}
          disabled={running || disabled}
        >
          {t("assess.list.runOne")}
        </button>
      )}
      <Link
        href={`/assess/${encodeURIComponent(item.submissionId)}?round=${encodeURIComponent(roundId)}`}
        className="ml-auto text-amber-strong text-[15px] font-semibold hover:underline"
      >
        {item.hasAssessment ? t("assess.list.open") : t("assess.list.openDisabled")}
      </Link>
    </li>
  );
}
