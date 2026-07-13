"use client";

/*
  Bewerten-Detailansicht (AP7).

  Editierbare Karten pro Kriterium: Punktzahl (aenderbar, innerhalb der
  Punktespanne des Kriteriums), Begruendung mit Zitaten (aenderbar), dazu
  eine Gesamtuebersicht mit der Note im konfigurierten Notensystem, die bei
  jeder Punktaenderung sofort neu berechnet wird (lib/grading/grade.ts,
  rein im Client fuer sofortiges Feedback; das Sichern bestaetigt denselben
  Wert serverseitig ueber lib/assess/pipeline.ts: recalculateAssessment).

  Der Feedback-Entwurf (Staerke, Beobachtungen, naechster Schritt, Uebung)
  ist ebenfalls editierbar.

  Sichern speichert Aenderungen ueber POST /api/assess/submission; jede
  inhaltliche Aenderung erzeugt dort ein DpoPair (Original, Korrektur,
  Kontext) in data/dpo/<roundId>.jsonl. Freigeben ruft POST /api/assess/release.
*/

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { calculateGrade } from "@/lib/grading/grade";
import { ScoreObject } from "@/components/score-object";
import type {
  Assessment,
  CriterionAssessment,
  FeedbackDraft,
  GradingSystem,
  Submission,
  SubjectConfig,
} from "@/lib/types";

interface DetailResponse {
  submission: Submission;
  config: SubjectConfig | null;
  studentText: string;
  assessment: Assessment | null;
  feedback: FeedbackDraft | null;
}

const CATEGORY_CLASS: Record<string, string> = {
  grammar: "border-cat-grammar",
  sentence: "border-cat-sentence",
  vocabulary: "border-cat-vocabulary",
  connectives: "border-cat-connectives",
};

export default function AssessDetailPage() {
  return (
    <Suspense fallback={null}>
      <AssessDetail />
    </Suspense>
  );
}

function AssessDetail() {
  const { t } = useI18n();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const submissionId = params.id;
  const roundId = searchParams.get("round") ?? "";

  const [data, setData] = useState<DetailResponse | null>(null);
  const [criteria, setCriteria] = useState<CriterionAssessment[]>([]);
  const [feedback, setFeedback] = useState<FeedbackDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!roundId || !submissionId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/assess/submission?round=${encodeURIComponent(roundId)}&id=${encodeURIComponent(submissionId)}`,
      );
      if (!res.ok) return;
      const json = (await res.json()) as DetailResponse;
      setData(json);
      setCriteria(json.assessment?.criteria ?? []);
      setFeedback(json.feedback);
    } finally {
      setLoading(false);
    }
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

  const config = data?.config ?? null;
  const criteriaById = useMemo(
    () => new Map((config?.rubric.criteria ?? []).map((c) => [c.id, c])),
    [config],
  );

  const totalPoints = useMemo(() => criteria.reduce((sum, c) => sum + c.points, 0), [criteria]);
  const maxPoints = useMemo(
    () => (config?.rubric.criteria ?? []).reduce((sum, c) => sum + c.maxPoints, 0),
    [config],
  );
  const gradingSystem: GradingSystem = config?.gradingSystem ?? "nrw-points";
  const feedbackLanguage = config?.feedbackLanguage ?? "en";
  const grade = useMemo(
    () => calculateGrade(gradingSystem, totalPoints, maxPoints, feedbackLanguage),
    [gradingSystem, totalPoints, maxPoints, feedbackLanguage],
  );
  const scoreSegments = useMemo(
    () =>
      criteria.map((c) => {
        const cr = criteriaById.get(c.criterionId);
        return {
          key: c.criterionId,
          name: cr?.name ?? c.criterionId,
          points: c.points,
          maxPoints: cr?.maxPoints ?? 0,
          colorKey: cr?.colorKey ?? null,
        };
      }),
    [criteria, criteriaById],
  );

  const updateCriterionPoints = useCallback(
    (criterionId: string, points: number) => {
      const max = criteriaById.get(criterionId)?.maxPoints ?? Number.POSITIVE_INFINITY;
      const clamped = Math.min(max, Math.max(0, Number.isNaN(points) ? 0 : points));
      setCriteria((prev) =>
        prev.map((c) => (c.criterionId === criterionId ? { ...c, points: clamped } : c)),
      );
      setSavedHint(false);
    },
    [criteriaById],
  );

  const updateCriterionReasoning = useCallback((criterionId: string, reasoning: string) => {
    setCriteria((prev) =>
      prev.map((c) => (c.criterionId === criterionId ? { ...c, reasoning } : c)),
    );
    setSavedHint(false);
  }, []);

  const updateFeedbackField = useCallback(
    (field: "strength" | "nextStep" | "practice", value: string) => {
      setFeedback((prev) => (prev ? { ...prev, [field]: value } : prev));
      setSavedHint(false);
    },
    [],
  );

  const updateObservation = useCallback((index: number, text: string) => {
    setFeedback((prev) => {
      if (!prev) return prev;
      const observations = prev.observations.map((o, i) => (i === index ? { ...o, text } : o));
      return { ...prev, observations };
    });
    setSavedHint(false);
  }, []);

  const save = useCallback(async () => {
    if (!roundId || !submissionId) return;
    setSaving(true);
    setSavedHint(false);
    try {
      const res = await fetch("/api/assess/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId,
          submissionId,
          criteria: criteria.map((c) => ({
            criterionId: c.criterionId,
            points: c.points,
            reasoning: c.reasoning,
          })),
          feedback: feedback
            ? {
                strength: feedback.strength,
                observations: feedback.observations,
                nextStep: feedback.nextStep,
                practice: feedback.practice,
              }
            : undefined,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { assessment: Assessment; feedback: FeedbackDraft };
        setCriteria(json.assessment.criteria);
        setFeedback(json.feedback);
        setSavedHint(true);
      }
    } finally {
      setSaving(false);
    }
  }, [roundId, submissionId, criteria, feedback]);

  const release = useCallback(async () => {
    if (!roundId || !submissionId) return;
    setReleasing(true);
    setReleaseError(null);
    try {
      await save();
      const res = await fetch("/api/assess/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundId, submissionId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setReleaseError(body.error ?? t("assess.detail.releaseError"));
        return;
      }
      await load();
    } finally {
      setReleasing(false);
    }
  }, [roundId, submissionId, save, load, t]);

  if (loading || !data) {
    return (
      <div>
        <DetailHeader alias="" released={false} />
        <div className="gp-card p-6 text-ink-soft">{t("assess.detail.loading")}</div>
      </div>
    );
  }

  const released = data.submission.status === "released";

  if (!config || !data.assessment) {
    return (
      <div>
        <DetailHeader alias={data.submission.studentAlias} released={released} />
        <div className="gp-card p-6 text-ink-soft">{t("assess.detail.notAssessedYet")}</div>
        <Link href={`/assess?round=${encodeURIComponent(roundId)}`} className="gp-button-ghost mt-4 inline-flex">
          {t("assess.detail.back")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <DetailHeader alias={data.submission.studentAlias} released={released} />

      <div className="mb-6">
        <Link href={`/assess?round=${encodeURIComponent(roundId)}`} className="gp-button-ghost">
          {t("assess.detail.back")}
        </Link>
      </div>

      {/* Gesamtuebersicht als reaktives Score-Objekt (Signatur) */}
      <div className="gp-card p-5 mb-6">
        <p className="font-serif text-xl text-ink mb-3">{t("assess.detail.summary.title")}</p>
        <ScoreObject
          display={grade.display}
          label={grade.label}
          caption={`${totalPoints} / ${maxPoints} ${t("assess.detail.summary.points")}`}
          segments={scoreSegments}
        />
      </div>

      {/* Kriterien-Karten */}
      <h2 className="font-serif text-2xl text-ink mb-3">{t("assess.detail.criteria.title")}</h2>
      <div className="grid gap-4 mb-8">
        {criteria.map((c) => {
          const criterion = criteriaById.get(c.criterionId);
          const borderClass = criterion?.colorKey
            ? CATEGORY_CLASS[criterion.colorKey]
            : "border-line";
          const markColor = criterion?.colorKey
            ? `var(--cat-${criterion.colorKey})`
            : "var(--amber-strong)";
          return (
            <div key={c.criterionId} className={`gp-card p-4 border-l-4 ${borderClass}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <p className="font-semibold text-ink">{criterion?.name ?? c.criterionId}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={criterion?.maxPoints ?? undefined}
                    value={c.points}
                    onChange={(e) =>
                      updateCriterionPoints(c.criterionId, Number(e.target.value))
                    }
                    disabled={released}
                    className="w-20 rounded border border-line bg-paper-raised px-2 py-1 text-ink text-[15px] text-right"
                  />
                  <span className="text-ink-soft text-[15px]">
                    / {criterion?.maxPoints ?? "?"}
                  </span>
                </div>
              </div>
              {criterion?.description && (
                <p className="text-ink-soft text-sm mb-2">{criterion.description}</p>
              )}
              <label className="block text-sm font-semibold text-ink-soft mb-1">
                {t("assess.detail.criteria.reasoning")}
              </label>
              <textarea
                value={c.reasoning}
                onChange={(e) => updateCriterionReasoning(c.criterionId, e.target.value)}
                disabled={released}
                rows={3}
                className="w-full rounded border border-line bg-paper-raised px-2 py-1 text-ink text-[15px] mb-2"
              />
              {c.evidence.length > 0 && (
                <div className="flex flex-wrap gap-x-5 gap-y-2.5 pt-1">
                  {c.evidence.map((q, i) => (
                    <span
                      key={i}
                      className="text-sm italic text-ink ink-underline"
                      style={{ ["--mark" as string]: markColor } as React.CSSProperties}
                    >
                      &ldquo;{q}&rdquo;
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Feedback-Entwurf */}
      {feedback && (
        <>
          <h2 className="font-serif text-2xl text-ink mb-3">{t("assess.detail.feedback.title")}</h2>
          <div className="gp-card p-4 mb-8 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink-soft mb-1">
                {t("assess.detail.feedback.strength")}
              </label>
              <textarea
                value={feedback.strength}
                onChange={(e) => updateFeedbackField("strength", e.target.value)}
                disabled={released}
                rows={2}
                className="w-full rounded border border-line bg-paper-raised px-2 py-1 text-ink text-[15px]"
              />
            </div>

            {feedback.observations.map((o, i) => {
              const obsCriterion = o.criterionId ? criteriaById.get(o.criterionId) : undefined;
              const obsMark = obsCriterion?.colorKey
                ? `var(--cat-${obsCriterion.colorKey})`
                : "var(--amber-strong)";
              return (
                <div key={i}>
                  <label className="block text-sm font-semibold text-ink-soft mb-1">
                    {t("assess.detail.feedback.observation")} {i + 1}
                  </label>
                  <textarea
                    value={o.text}
                    onChange={(e) => updateObservation(i, e.target.value)}
                    disabled={released}
                    rows={2}
                    className="w-full rounded border border-line bg-paper-raised px-2 py-1 text-ink text-[15px] mb-1"
                  />
                  {o.quote && (
                    <p
                      className="text-sm italic text-ink ink-underline inline-block mt-1"
                      style={{ ["--mark" as string]: obsMark } as React.CSSProperties}
                    >
                      &ldquo;{o.quote}&rdquo;
                    </p>
                  )}
                </div>
              );
            })}

            <div>
              <label className="block text-sm font-semibold text-ink-soft mb-1">
                {t("assess.detail.feedback.nextStep")}
              </label>
              <textarea
                value={feedback.nextStep}
                onChange={(e) => updateFeedbackField("nextStep", e.target.value)}
                disabled={released}
                rows={2}
                className="w-full rounded border border-line bg-paper-raised px-2 py-1 text-ink text-[15px]"
              />
            </div>

            {feedback.practice !== undefined && (
              <div>
                <label className="block text-sm font-semibold text-ink-soft mb-1">
                  {t("assess.detail.feedback.practice")}
                </label>
                <textarea
                  value={feedback.practice ?? ""}
                  onChange={(e) => updateFeedbackField("practice", e.target.value)}
                  disabled={released}
                  rows={2}
                  className="w-full rounded border border-line bg-paper-raised px-2 py-1 text-ink text-[15px]"
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Sichern und Freigeben */}
      <div className="gp-card p-5">
        <p className="font-semibold text-ink mb-1">{t("assess.detail.actions.title")}</p>
        <p className="text-ink-soft text-[15px] mb-3">
          {released ? t("assess.detail.actions.releasedNote") : t("assess.detail.actions.hint")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {!released && (
            <button type="button" className="gp-button-ghost" onClick={() => void save()} disabled={saving}>
              {saving ? t("assess.detail.saving") : t("assess.detail.save")}
            </button>
          )}
          {!released && (
            <button
              type="button"
              className="gp-button"
              onClick={() => void release()}
              disabled={releasing}
            >
              {releasing ? t("assess.detail.releasing") : t("assess.detail.release")}
            </button>
          )}
          {savedHint && !released && (
            <span className="text-ink-soft text-sm">{t("assess.detail.saved")}</span>
          )}
        </div>
        {releaseError && <p className="text-alert text-sm mt-2">{releaseError}</p>}
      </div>
    </div>
  );
}

function DetailHeader({ alias, released }: { alias: string; released: boolean }) {
  const { t } = useI18n();
  return (
    <div className="mb-6">
      <h1 className="text-4xl mb-4">
        {t("assess.detail.title")} {alias ? `- ${alias}` : ""}
      </h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-amber-strong font-semibold mb-1">
            {t("common.now")}
          </p>
          <p className="text-ink">
            {released ? t("assess.detail.now.done") : t("assess.detail.now")}
          </p>
        </div>
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
            {t("common.next")}
          </p>
          <p className="text-ink-soft">{t("assess.detail.next")}</p>
        </div>
      </div>
    </div>
  );
}
