"use client";

/*
  Einrichten-Assistent (AP5): linearer Wizard mit sechs Schritten, ein Schritt
  pro Screen (Hausregel 4). Kein JSON sichtbar, alles Formulare.

  1. Fach, Textsprache, Feedback-Sprache, Klassenstufe, Niveau
  2. Aufgabenstellung eingeben oder als Datei hochladen
  3. Erwartungshorizont, Raster-Vorschlag (gradingModel-Slot), frei editierbar
  4. Notensystem und Feedback-Stil
  5. Optional: Beispielarbeiten und Kalibrierung (runCalibration)
  6. Zusammenfassung, Validierung (validateSubjectConfig), Speichern

  Bearbeiten/Duplizieren: ?edit=<id> laedt eine vorhandene Konfiguration mit
  gleicher id (Speichern ueberschreibt sie). ?duplicate=<id> laedt sie ohne
  id (Speichern legt eine neue Konfiguration an).

  Die Auswertung (Raster-Vorschlag, Kalibrierung) laeuft ueber API-Routen, die
  selbst zwischen dem echten Ollama-Client und dem Mock waehlen
  (lib/prompts/resolve-client.ts). Der Assistent bleibt dadurch auch ohne
  laufende Auswertung durchspielbar.
*/

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type {
  CalibrationReport,
  GradingSystem,
  RubricSuggestionResult,
  SubjectConfig,
} from "@/lib/types";
import {
  blankDraft,
  buildConfigFromDraft,
  draftFromConfig,
  expectedPointsFromText,
  makeLocalKey,
  type DraftCriterion,
  type WizardDraft,
} from "@/lib/wizard/draft";
import { readUploadedTaskFile } from "@/lib/wizard/file-text";

const TOTAL_STEPS = 6;

function withVars(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replace(`{{${k}}}`, String(v)),
    template,
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupWizard />
    </Suspense>
  );
}

function SetupWizard() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const duplicateId = searchParams.get("duplicate");

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<WizardDraft>(blankDraft);
  const [displayName, setDisplayName] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(Boolean(editId || duplicateId));
  const [existingIds, setExistingIds] = useState<string[]>([]);
  const [savedConfig, setSavedConfig] = useState<SubjectConfig | null>(null);

  // Vorhandene Konfiguration laden (Bearbeiten oder Duplizieren als Vorbelegung).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const idToLoad = editId ?? duplicateId;
      if (!idToLoad) {
        setLoadingExisting(false);
        return;
      }
      try {
        const res = await fetch(`/api/setup/configs/${encodeURIComponent(idToLoad)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { config: SubjectConfig };
        if (cancelled) return;
        setDraft(draftFromConfig(data.config, Boolean(editId)));
        setDisplayName(editId ? data.config.name : `${data.config.name} (2)`);
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [editId, duplicateId]);

  useEffect(() => {
    let cancelled = false;
    async function loadIds() {
      const res = await fetch("/api/setup/configs");
      if (!res.ok) return;
      const data = (await res.json()) as { configs: SubjectConfig[] };
      if (!cancelled) setExistingIds(data.configs.map((c) => c.id));
    }
    void loadIds();
    return () => {
      cancelled = true;
    };
  }, []);

  const goNext = useCallback(() => setStep((s) => Math.min(TOTAL_STEPS, s + 1)), []);
  const goBack = useCallback(() => setStep((s) => Math.max(1, s - 1)), []);

  const pageTitleKey = editId ? "setup.titleEdit" : "setup.title";

  if (loadingExisting) {
    return (
      <div>
        <PageHeaderNowNext titleKey={pageTitleKey} />
        <div className="gp-card p-6 text-ink-soft">...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeaderNowNext titleKey={pageTitleKey} />
      <StepProgress current={step} total={TOTAL_STEPS} />

      {step === 1 && <Step1 draft={draft} setDraft={setDraft} onNext={goNext} />}
      {step === 2 && <Step2 draft={draft} setDraft={setDraft} onNext={goNext} onBack={goBack} />}
      {step === 3 && (
        <Step3 draft={draft} setDraft={setDraft} onNext={goNext} onBack={goBack} />
      )}
      {step === 4 && <Step4 draft={draft} setDraft={setDraft} onNext={goNext} onBack={goBack} />}
      {step === 5 && <Step5 draft={draft} setDraft={setDraft} onNext={goNext} onBack={goBack} />}
      {step === 6 && (
        <Step6
          draft={draft}
          displayName={displayName}
          setDisplayName={setDisplayName}
          existingIds={existingIds}
          onBack={goBack}
          savedConfig={savedConfig}
          setSavedConfig={setSavedConfig}
        />
      )}
    </div>
  );

  function PageHeaderNowNext({ titleKey }: { titleKey: string }) {
    const stepNowKeys = [
      "setup.step1.now",
      "setup.step2.now",
      "setup.step3.now",
      "setup.step4.now",
      "setup.step5.now",
      "setup.step6.now",
    ];
    const stepNextKeys = [
      "setup.step1.next",
      "setup.step2.next",
      "setup.step3.next",
      "setup.step4.next",
      "setup.step5.next",
      "setup.step6.next",
    ];
    return (
      <div className="mb-8">
        <h1 className="text-4xl mb-4">{t(titleKey)}</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="gp-card p-4">
            <p className="text-xs uppercase tracking-wide text-amber-strong font-semibold mb-1">
              {t("common.now")}
            </p>
            <p className="text-ink">{t(stepNowKeys[step - 1])}</p>
          </div>
          <div className="gp-card p-4">
            <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
              {t("common.next")}
            </p>
            <p className="text-ink-soft">{t(stepNextKeys[step - 1])}</p>
          </div>
        </div>
      </div>
    );
  }
}

/* ----------------------------------------------------------------------------
   Fortschrittsanzeige
---------------------------------------------------------------------------- */

function StepProgress({ current, total }: { current: number; total: number }) {
  const { t } = useI18n();
  return (
    <div className="mb-6">
      <p className="text-sm text-ink-soft mb-2">
        {withVars(t("setup.step.progress"), { current, total })}
      </p>
      <div className="h-2 rounded-full bg-line overflow-hidden">
        <div
          className="h-full bg-amber-strong transition-all"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function StepNav({
  onNext,
  onBack,
  nextDisabled,
  nextLabel,
}: {
  onNext?: () => void;
  onBack?: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {onBack && (
        <button type="button" className="gp-button-ghost" onClick={onBack}>
          {t("setup.step.back")}
        </button>
      )}
      {onNext && (
        <button
          type="button"
          className="gp-button"
          onClick={onNext}
          disabled={nextDisabled}
          style={nextDisabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        >
          {nextLabel ?? t("setup.step.continue")}
        </button>
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-alert">{message}</p>;
}

/* ----------------------------------------------------------------------------
   Schritt 1: Fach, Sprachen, Klassenstufe, Niveau
---------------------------------------------------------------------------- */

function Step1({
  draft,
  setDraft,
  onNext,
}: {
  draft: WizardDraft;
  setDraft: (updater: (d: WizardDraft) => WizardDraft) => void;
  onNext: () => void;
}) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleNext = () => {
    if (draft.subject.trim() === "") {
      setError(t("setup.step1.error.subject"));
      return;
    }
    if (draft.level.trim() === "") {
      setError(t("setup.step1.error.level"));
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <div className="gp-card p-6 space-y-5">
      <div>
        <label className="block font-serif text-xl text-ink mb-1" htmlFor="subject">
          {t("setup.step1.subject")}
        </label>
        <input
          id="subject"
          type="text"
          value={draft.subject}
          onChange={(e) => set("subject", e.target.value)}
          placeholder={t("setup.step1.subject.placeholder")}
          className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
        />
        <FieldError message={error === t("setup.step1.error.subject") ? error : undefined} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LanguageField
          label={t("setup.step1.textLanguage")}
          value={draft.textLanguage}
          onChange={(v) => set("textLanguage", v)}
        />
        <LanguageField
          label={t("setup.step1.feedbackLanguage")}
          value={draft.feedbackLanguage}
          onChange={(v) => set("feedbackLanguage", v)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block font-serif text-xl text-ink mb-1" htmlFor="classLevel">
            {t("setup.step1.classLevel")}
          </label>
          <input
            id="classLevel"
            type="text"
            value={draft.classLevel}
            onChange={(e) => set("classLevel", e.target.value)}
            placeholder={t("setup.step1.classLevel.placeholder")}
            className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
          />
        </div>
        <div>
          <label className="block font-serif text-xl text-ink mb-1" htmlFor="level">
            {t("setup.step1.level")}
          </label>
          <input
            id="level"
            type="text"
            value={draft.level}
            onChange={(e) => set("level", e.target.value)}
            placeholder={t("setup.step1.level.placeholder")}
            className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
          />
          <FieldError message={error === t("setup.step1.error.level") ? error : undefined} />
        </div>
      </div>

      <StepNav onNext={handleNext} />
    </div>
  );
}

function LanguageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  const isKnown = value === "de" || value === "en";
  const [customMode, setCustomMode] = useState(!isKnown && value !== "");

  return (
    <div>
      <label className="block font-serif text-xl text-ink mb-1">{label}</label>
      <select
        value={customMode ? "other" : value || "de"}
        onChange={(e) => {
          if (e.target.value === "other") {
            setCustomMode(true);
            onChange("");
          } else {
            setCustomMode(false);
            onChange(e.target.value);
          }
        }}
        className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
      >
        <option value="de">{t("setup.step1.lang.de")}</option>
        <option value="en">{t("setup.step1.lang.en")}</option>
        <option value="other">{t("setup.step1.lang.other")}</option>
      </select>
      {customMode && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("setup.step1.lang.otherLabel")}
          className="mt-2 w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
        />
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Schritt 2: Aufgabenstellung
---------------------------------------------------------------------------- */

function Step2({
  draft,
  setDraft,
  onNext,
  onBack,
}: {
  draft: WizardDraft;
  setDraft: (updater: (d: WizardDraft) => WizardDraft) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const result = await readUploadedTaskFile(file, t("setup.step2.upload.pendingNote"));
    // Bei Text-Dateien den Inhalt direkt uebernehmen. Bei PDF/Bild kommt
    // stattdessen der Platzhaltertext ins Feld (editierbar), damit klar ist:
    // der eigentliche Inhalt wird erst bei der Auswertung gelesen.
    setDraft((d) => ({
      ...d,
      taskPrompt: result.text,
      taskUploadNote: result.kind === "pending" ? result.fileName : null,
    }));
  };

  const handleNext = () => {
    if (draft.taskPrompt.trim() === "") {
      setError(t("setup.step2.error.taskPrompt"));
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <div className="gp-card p-6 space-y-4">
      <div>
        <label className="block font-serif text-xl text-ink mb-1" htmlFor="taskPrompt">
          {t("setup.step2.textarea.label")}
        </label>
        <textarea
          id="taskPrompt"
          value={draft.taskPrompt}
          onChange={(e) => setDraft((d) => ({ ...d, taskPrompt: e.target.value }))}
          placeholder={t("setup.step2.textarea.placeholder")}
          rows={8}
          className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
        />
        <FieldError message={error ?? undefined} />
      </div>

      <div className="border-t border-line pt-4">
        <p className="font-serif text-lg text-ink mb-1">{t("setup.step2.upload.label")}</p>
        <p className="text-ink-soft text-[15px] mb-3">{t("setup.step2.upload.hint")}</p>
        <label className="gp-button-ghost cursor-pointer inline-flex">
          {t("setup.step2.upload.choose")}
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown,application/pdf,.pdf,image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {draft.taskUploadNote && (
          <p className="mt-2 text-sm text-ink-soft">
            {t("setup.step2.upload.fileLabel")}: {draft.taskUploadNote}
          </p>
        )}
      </div>

      <StepNav onNext={handleNext} onBack={onBack} />
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Schritt 3: Erwartungshorizont und Raster-Vorschlag
---------------------------------------------------------------------------- */

const COLOR_KEYS = ["grammar", "sentence", "vocabulary", "connectives"] as const;

function Step3({
  draft,
  setDraft,
  onNext,
  onBack,
}: {
  draft: WizardDraft;
  setDraft: (updater: (d: WizardDraft) => WizardDraft) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [examples, setExamples] = useState<SubjectConfig[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadExamples() {
      try {
        const ids = ["englisch-comment", "deutsch-eroerterung", "wirtschaft-fachtext"];
        const results = await Promise.all(
          ids.map(async (id) => {
            const res = await fetch(`/api/setup/configs/${id}`);
            if (!res.ok) return null;
            const data = (await res.json()) as { config: SubjectConfig };
            return data.config;
          }),
        );
        if (!cancelled) setExamples(results.filter((c): c is SubjectConfig => c !== null));
      } catch {
        // Beispiele sind optional; ohne sie funktioniert der Schritt weiter.
      }
    }
    void loadExamples();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFile = async (file: File) => {
    const result = await readUploadedTaskFile(file, "");
    if (result.kind === "text") {
      setDraft((d) => ({ ...d, expectedPointsText: result.text }));
    }
  };

  const generateSuggestion = async () => {
    setGenerating(true);
    setGenerateError(null);
    setUsingMock(false);
    try {
      const res = await fetch("/api/setup/suggest-rubric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: draft.subject,
          level: draft.level,
          textLanguage: draft.textLanguage,
          gradingSystem: draft.gradingSystem,
          taskPrompt: draft.taskPrompt,
          expectedPoints: expectedPointsFromText(draft.expectedPointsText),
        }),
      });
      if (!res.ok) {
        setGenerateError(t("setup.step3.generate.error"));
        return;
      }
      const data = (await res.json()) as {
        suggestion: RubricSuggestionResult;
        usingRealClient: boolean;
      };
      setUsingMock(!data.usingRealClient);
      const criteria: DraftCriterion[] = data.suggestion.criteria.map((c, i) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        maxPoints: c.maxPoints,
        allOrNothing: c.allOrNothing,
        colorKey: COLOR_KEYS[i % COLOR_KEYS.length],
        localKey: makeLocalKey(),
      }));
      setDraft((d) => ({ ...d, criteria, rubricSuggestionRequested: true }));
    } catch {
      setGenerateError(t("setup.step3.generate.error"));
    } finally {
      setGenerating(false);
    }
  };

  const applyExample = (config: SubjectConfig) => {
    setDraft((d) => ({
      ...d,
      expectedPointsText: config.rubric.expectedPoints.join("\n"),
      criteria: config.rubric.criteria.map((c) => ({ ...c, localKey: makeLocalKey() })),
      rubricSuggestionRequested: true,
      taskPrompt: d.taskPrompt.trim() === "" ? config.rubric.taskPrompt : d.taskPrompt,
      gradingSystem: config.gradingSystem,
    }));
  };

  const updateCriterion = (localKey: string, patch: Partial<DraftCriterion>) => {
    setDraft((d) => ({
      ...d,
      criteria: d.criteria.map((c) => (c.localKey === localKey ? { ...c, ...patch } : c)),
    }));
  };

  const removeCriterion = (localKey: string) => {
    setDraft((d) => ({ ...d, criteria: d.criteria.filter((c) => c.localKey !== localKey) }));
  };

  const addCriterion = () => {
    setDraft((d) => ({
      ...d,
      criteria: [
        ...d.criteria,
        {
          id: `kriterium-${d.criteria.length + 1}`,
          name: "",
          description: "",
          maxPoints: 10,
          localKey: makeLocalKey(),
        },
      ],
    }));
  };

  const toggleAllOrNothing = (localKey: string, enabled: boolean) => {
    updateCriterion(localKey, {
      allOrNothing: enabled ? { rule: "", parts: ["", ""] } : undefined,
    });
  };

  const handleNext = () => {
    if (expectedPointsFromText(draft.expectedPointsText).length === 0) {
      setError(t("setup.step3.error.expected"));
      return;
    }
    if (draft.criteria.length === 0) {
      setError(t("setup.step3.error.criteria"));
      return;
    }
    setError(null);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="gp-card p-6 space-y-3">
        <label className="block font-serif text-xl text-ink mb-1" htmlFor="expectedPoints">
          {t("setup.step3.expected.label")}
        </label>
        <p className="text-ink-soft text-[15px]">{t("setup.step3.expected.hint")}</p>
        <textarea
          id="expectedPoints"
          value={draft.expectedPointsText}
          onChange={(e) => setDraft((d) => ({ ...d, expectedPointsText: e.target.value }))}
          placeholder={t("setup.step3.expected.placeholder")}
          rows={6}
          className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
        />
        <label className="gp-button-ghost cursor-pointer inline-flex">
          {t("setup.step3.upload.choose")}
          <input
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="gp-card p-6 space-y-3">
        <button
          type="button"
          className="gp-button"
          onClick={() => void generateSuggestion()}
          disabled={generating}
        >
          {generating ? t("setup.step3.generating") : t("setup.step3.generate")}
        </button>
        {generateError && <FieldError message={generateError} />}
        {usingMock && <p className="text-sm text-ink-soft">{t("setup.step3.usingMock")}</p>}

        {examples.length > 0 && (
          <div className="pt-2 border-t border-line">
            <p className="text-ink-soft text-[15px] mb-2">{t("setup.step3.startFromExample")}</p>
            <ul className="flex flex-wrap gap-2">
              {examples.map((ex) => (
                <li key={ex.id}>
                  <button
                    type="button"
                    className="gp-button-ghost text-sm"
                    onClick={() => applyExample(ex)}
                  >
                    {ex.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="gp-card p-6 space-y-4">
        <h2 className="font-serif text-2xl text-ink">{t("setup.step3.criteria.title")}</h2>
        {draft.criteria.length === 0 ? (
          <p className="text-ink-soft">{t("setup.step3.criteria.empty")}</p>
        ) : (
          <ul className="space-y-4">
            {draft.criteria.map((c) => (
              <li key={c.localKey} className="rounded-md border border-line p-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                  <div>
                    <label className="block text-sm text-ink-soft mb-1">
                      {t("setup.step3.criteria.name")}
                    </label>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateCriterion(c.localKey, { name: e.target.value })}
                      className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-ink-soft mb-1">
                      {t("setup.step3.criteria.maxPoints")}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={c.maxPoints}
                      onChange={(e) =>
                        updateCriterion(c.localKey, { maxPoints: Number(e.target.value) || 0 })
                      }
                      className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-ink-soft mb-1">
                    {t("setup.step3.criteria.description")}
                  </label>
                  <textarea
                    value={c.description}
                    onChange={(e) =>
                      updateCriterion(c.localKey, { description: e.target.value })
                    }
                    rows={2}
                    className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id={`aon-${c.localKey}`}
                    type="checkbox"
                    checked={Boolean(c.allOrNothing)}
                    onChange={(e) => toggleAllOrNothing(c.localKey, e.target.checked)}
                  />
                  <label htmlFor={`aon-${c.localKey}`} className="text-ink text-[15px]">
                    {t("setup.step3.criteria.allOrNothing")}
                  </label>
                </div>
                {c.allOrNothing && (
                  <div className="pl-6 space-y-2">
                    <p className="text-sm text-ink-soft">
                      {t("setup.step3.criteria.allOrNothing.hint")}
                    </p>
                    <input
                      type="text"
                      value={c.allOrNothing.rule}
                      placeholder={t("setup.step3.criteria.allOrNothing.rule")}
                      onChange={(e) =>
                        updateCriterion(c.localKey, {
                          allOrNothing: { ...c.allOrNothing!, rule: e.target.value },
                        })
                      }
                      className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
                    />
                    <textarea
                      value={c.allOrNothing.parts.join("\n")}
                      placeholder={t("setup.step3.criteria.allOrNothing.parts")}
                      onChange={(e) =>
                        updateCriterion(c.localKey, {
                          allOrNothing: {
                            ...c.allOrNothing!,
                            parts: e.target.value.split("\n"),
                          },
                        })
                      }
                      rows={2}
                      className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
                    />
                  </div>
                )}

                <button
                  type="button"
                  className="text-[15px] text-cat-grammar font-semibold hover:underline"
                  onClick={() => removeCriterion(c.localKey)}
                >
                  {t("setup.step3.criteria.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="gp-button-ghost" onClick={addCriterion}>
          {t("setup.step3.criteria.add")}
        </button>
        <FieldError message={error ?? undefined} />
      </div>

      <StepNav onNext={handleNext} onBack={onBack} />
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Schritt 4: Notensystem und Feedback-Stil
---------------------------------------------------------------------------- */

function Step4({
  draft,
  setDraft,
  onNext,
  onBack,
}: {
  draft: WizardDraft;
  setDraft: (updater: (d: WizardDraft) => WizardDraft) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="gp-card p-6 space-y-5">
      <div>
        <label className="block font-serif text-xl text-ink mb-1" htmlFor="gradingSystem">
          {t("setup.step4.gradingSystem")}
        </label>
        <select
          id="gradingSystem"
          value={draft.gradingSystem}
          onChange={(e) =>
            setDraft((d) => ({ ...d, gradingSystem: e.target.value as GradingSystem }))
          }
          className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
        >
          <option value="nrw-points">{t("setup.step4.gradingSystem.nrwPoints")}</option>
          <option value="grades-1-6">{t("setup.step4.gradingSystem.grades16")}</option>
          <option value="percent">{t("setup.step4.gradingSystem.percent")}</option>
        </select>
      </div>

      <div>
        <label className="block font-serif text-xl text-ink mb-1" htmlFor="tone">
          {t("setup.step4.tone")}
        </label>
        <input
          id="tone"
          type="text"
          value={draft.tone}
          onChange={(e) => setDraft((d) => ({ ...d, tone: e.target.value }))}
          placeholder={t("setup.step4.tone.placeholder")}
          className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
        />
      </div>

      <div>
        <label className="block font-serif text-xl text-ink mb-1" htmlFor="length">
          {t("setup.step4.length")}
        </label>
        <select
          id="length"
          value={draft.length}
          onChange={(e) =>
            setDraft((d) => ({ ...d, length: e.target.value as WizardDraft["length"] }))
          }
          className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
        >
          <option value="short">{t("setup.step4.length.short")}</option>
          <option value="medium">{t("setup.step4.length.medium")}</option>
          <option value="long">{t("setup.step4.length.long")}</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="includePractice"
          type="checkbox"
          checked={draft.includePractice}
          onChange={(e) => setDraft((d) => ({ ...d, includePractice: e.target.checked }))}
        />
        <label htmlFor="includePractice" className="text-ink text-[15px]">
          {t("setup.step4.includePractice")}
        </label>
      </div>
      <p className="text-ink-soft text-sm">{t("setup.step4.includePractice.hint")}</p>

      <StepNav onNext={onNext} onBack={onBack} />
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Schritt 5: Beispielarbeiten und Kalibrierung (optional)
---------------------------------------------------------------------------- */

function Step5({
  draft,
  setDraft,
  onNext,
  onBack,
}: {
  draft: WizardDraft;
  setDraft: (updater: (d: WizardDraft) => WizardDraft) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [usingMock, setUsingMock] = useState(false);
  const [report, setReport] = useState<CalibrationReport | null>(null);

  const addSample = () => {
    if (draft.calibrationSamples.length >= 2) return;
    setDraft((d) => ({
      ...d,
      calibrationSamples: [
        ...d.calibrationSamples,
        {
          localKey: makeLocalKey(),
          id: `beispiel-${d.calibrationSamples.length + 1}`,
          text: "",
          note: "",
          scoreText: Object.fromEntries(d.criteria.map((c) => [c.id, ""])),
        },
      ],
    }));
  };

  const removeSample = (localKey: string) => {
    setDraft((d) => ({
      ...d,
      calibrationSamples: d.calibrationSamples.filter((s) => s.localKey !== localKey),
    }));
  };

  const updateSampleText = (localKey: string, text: string) => {
    setDraft((d) => ({
      ...d,
      calibrationSamples: d.calibrationSamples.map((s) =>
        s.localKey === localKey ? { ...s, text } : s,
      ),
    }));
  };

  const updateSampleNote = (localKey: string, note: string) => {
    setDraft((d) => ({
      ...d,
      calibrationSamples: d.calibrationSamples.map((s) =>
        s.localKey === localKey ? { ...s, note } : s,
      ),
    }));
  };

  const updateSampleScore = (localKey: string, criterionId: string, value: string) => {
    setDraft((d) => ({
      ...d,
      calibrationSamples: d.calibrationSamples.map((s) =>
        s.localKey === localKey
          ? { ...s, scoreText: { ...s.scoreText, [criterionId]: value } }
          : s,
      ),
    }));
  };

  const runCalibrationNow = async () => {
    setRunning(true);
    setRunError(null);
    setUsingMock(false);
    setReport(null);
    try {
      const config = buildConfigFromDraft(draft, draft.subject || "Entwurf", []);
      const res = await fetch("/api/setup/calibrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        setRunError(t("setup.step5.error"));
        return;
      }
      const data = (await res.json()) as {
        report: CalibrationReport;
        usingRealClient: boolean;
      };
      setUsingMock(!data.usingRealClient);
      setReport(data.report);
    } catch {
      setRunError(t("setup.step5.error"));
    } finally {
      setRunning(false);
    }
  };

  const explainFor = (meanAbsDelta: number, maxPoints: number): string => {
    const ratio = maxPoints > 0 ? meanAbsDelta / maxPoints : 0;
    if (ratio <= 0.1) return t("setup.step5.result.explain.low");
    if (ratio <= 0.25) return t("setup.step5.result.explain.mid");
    return t("setup.step5.result.explain.high");
  };

  return (
    <div className="space-y-6">
      <div className="gp-card p-6">
        <p className="text-ink-soft">{t("setup.step5.intro")}</p>
      </div>

      {draft.calibrationSamples.map((s, idx) => (
        <div key={s.localKey} className="gp-card p-6 space-y-3">
          <h2 className="font-serif text-xl text-ink">
            {t("setup.step5.sample")} {idx + 1}
          </h2>
          <div>
            <label className="block text-sm text-ink-soft mb-1">
              {t("setup.step5.sample.text")}
            </label>
            <textarea
              value={s.text}
              onChange={(e) => updateSampleText(s.localKey, e.target.value)}
              placeholder={t("setup.step5.sample.textPlaceholder")}
              rows={5}
              className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
            />
          </div>
          <div>
            <label className="block text-sm text-ink-soft mb-1">
              {t("setup.step5.sample.note")}
            </label>
            <input
              type="text"
              value={s.note}
              onChange={(e) => updateSampleNote(s.localKey, e.target.value)}
              className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
            />
          </div>
          {draft.criteria.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {draft.criteria.map((c) => (
                <div key={c.id}>
                  <label className="block text-sm text-ink-soft mb-1">
                    {t("setup.step5.sample.score")} {c.name || c.id} (0-{c.maxPoints})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={c.maxPoints}
                    value={s.scoreText[c.id] ?? ""}
                    onChange={(e) => updateSampleScore(s.localKey, c.id, e.target.value)}
                    className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
                  />
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            className="text-[15px] text-cat-grammar font-semibold hover:underline"
            onClick={() => removeSample(s.localKey)}
          >
            {t("setup.step5.sample.remove")}
          </button>
        </div>
      ))}

      <div className="gp-card p-6 space-y-3">
        {draft.calibrationSamples.length < 2 ? (
          <button type="button" className="gp-button-ghost" onClick={addSample}>
            {t("setup.step5.add")}
          </button>
        ) : (
          <p className="text-sm text-ink-soft">{t("setup.step5.addLimit")}</p>
        )}

        {draft.calibrationSamples.length > 0 && (
          <div className="pt-3 border-t border-line">
            <button
              type="button"
              className="gp-button"
              onClick={() => void runCalibrationNow()}
              disabled={running}
            >
              {running ? t("setup.step5.running") : t("setup.step5.run")}
            </button>
            {runError && <FieldError message={runError} />}
            {usingMock && <p className="mt-2 text-sm text-ink-soft">{t("setup.step5.usingMock")}</p>}
          </div>
        )}

        {report && (
          <div className="pt-4 border-t border-line space-y-3">
            <h3 className="font-serif text-xl text-ink">{t("setup.step5.result.title")}</h3>
            <ul className="space-y-2">
              {report.perCriterion.map((pc) => (
                <li key={pc.criterionId} className="rounded-md border border-line p-3">
                  <p className="text-ink font-semibold">{pc.criterionName}</p>
                  <p className="text-ink-soft text-[15px]">
                    {pc.meanAbsDelta.toFixed(1)} {t("setup.step5.result.points")} ({t("setup.step3.criteria.maxPoints")}: {pc.maxPoints})
                  </p>
                  <p className="text-ink-soft text-sm mt-1">
                    {explainFor(pc.meanAbsDelta, pc.maxPoints)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-ink font-semibold">
              {t("setup.step5.result.mean")}: {report.meanAbsDelta.toFixed(1)}{" "}
              {t("setup.step5.result.points")}
            </p>
          </div>
        )}
      </div>

      <StepNav onNext={onNext} onBack={onBack} />
    </div>
  );
}

/* ----------------------------------------------------------------------------
   Schritt 6: Zusammenfassung, Validierung, Speichern
---------------------------------------------------------------------------- */

function Step6({
  draft,
  displayName,
  setDisplayName,
  existingIds,
  onBack,
  savedConfig,
  setSavedConfig,
}: {
  draft: WizardDraft;
  displayName: string;
  setDisplayName: (v: string) => void;
  existingIds: string[];
  onBack: () => void;
  savedConfig: SubjectConfig | null;
  setSavedConfig: (c: SubjectConfig | null) => void;
}) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string[] | null>(null);

  const totalPoints = useMemo(
    () => draft.criteria.reduce((sum, c) => sum + (c.maxPoints || 0), 0),
    [draft.criteria],
  );

  const gradingSystemLabel = (system: GradingSystem): string => {
    switch (system) {
      case "nrw-points":
        return t("setup.step4.gradingSystem.nrwPoints");
      case "grades-1-6":
        return t("setup.step4.gradingSystem.grades16");
      case "percent":
        return t("setup.step4.gradingSystem.percent");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const name = displayName.trim() !== "" ? displayName.trim() : draft.subject || "Neues Fach";
    const config = buildConfigFromDraft(draft, name, existingIds);
    try {
      const res = await fetch("/api/setup/configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string; details?: Array<{ message: string }> };
        setSaveError(
          data.details && data.details.length > 0
            ? data.details.map((d) => d.message)
            : [data.error ?? t("setup.step6.saveError")],
        );
        return;
      }
      const data = (await res.json()) as { config: SubjectConfig };
      setSavedConfig(data.config);
    } catch {
      setSaveError([t("setup.step6.saveError")]);
    } finally {
      setSaving(false);
    }
  };

  if (savedConfig) {
    return (
      <div className="gp-card p-6 space-y-4">
        <p className="text-ink font-semibold">{t("setup.step6.saved")}</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/subjects" className="gp-button">
            {t("setup.step6.toSubjects")}
          </Link>
          <Link href="/upload" className="gp-button-ghost">
            {t("setup.step6.toUpload")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="gp-card p-6 space-y-3">
        <label className="block font-serif text-xl text-ink mb-1" htmlFor="displayName">
          {t("setup.step6.name")}
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("setup.step6.name.placeholder")}
          className="w-full rounded-md border border-line bg-paper-raised px-3 py-2 text-ink"
        />
        <p className="text-ink-soft text-sm">{t("setup.step6.name.hint")}</p>
      </div>

      <div className="gp-card p-6 space-y-2">
        <h2 className="font-serif text-xl text-ink">{t("setup.step6.section.frame")}</h2>
        <p className="text-ink-soft text-[15px]">
          {draft.subject} - {draft.classLevel} - {draft.level}
        </p>
        <p className="text-ink-soft text-[15px]">
          {draft.textLanguage} / {draft.feedbackLanguage}
        </p>
      </div>

      <div className="gp-card p-6 space-y-2">
        <h2 className="font-serif text-xl text-ink">{t("setup.step6.section.task")}</h2>
        <p className="text-ink-soft text-[15px] whitespace-pre-wrap">{draft.taskPrompt}</p>
      </div>

      <div className="gp-card p-6 space-y-2">
        <h2 className="font-serif text-xl text-ink">{t("setup.step6.section.criteria")}</h2>
        <p className="text-ink-soft text-[15px]">
          {draft.criteria.length} {t("setup.step6.criteriaCount")} - {totalPoints}{" "}
          {t("setup.step6.pointsTotal")}
        </p>
        <ul className="list-disc pl-5 text-ink-soft text-[15px]">
          {draft.criteria.map((c) => (
            <li key={c.localKey}>
              {c.name} ({c.maxPoints})
            </li>
          ))}
        </ul>
      </div>

      <div className="gp-card p-6 space-y-2">
        <h2 className="font-serif text-xl text-ink">{t("setup.step6.section.grading")}</h2>
        <p className="text-ink-soft text-[15px]">{gradingSystemLabel(draft.gradingSystem)}</p>
        <p className="text-ink-soft text-[15px]">{draft.tone}</p>
      </div>

      <div className="gp-card p-6 space-y-2">
        <h2 className="font-serif text-xl text-ink">{t("setup.step6.section.calibration")}</h2>
        {draft.calibrationSamples.length === 0 ? (
          <p className="text-ink-soft text-[15px]">{t("setup.step6.section.noneCalibration")}</p>
        ) : (
          <p className="text-ink-soft text-[15px]">
            {draft.calibrationSamples.length} x {t("setup.step5.sample")}
          </p>
        )}
      </div>

      {saveError && (
        <div className="gp-card p-6 border-cat-grammar">
          <p className="text-alert font-semibold mb-2">{t("setup.step6.error.title")}</p>
          <ul className="list-disc pl-5 text-alert text-[15px]">
            {saveError.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="gp-button-ghost" onClick={onBack}>
          {t("setup.step.back")}
        </button>
        <button
          type="button"
          className="gp-button"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          {saving ? t("setup.step6.saving") : t("setup.step6.save")}
        </button>
      </div>
    </div>
  );
}
