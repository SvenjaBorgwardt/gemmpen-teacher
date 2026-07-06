/*
  Entwurfs-Zustand des Einrichten-Assistenten (AP5) und Hilfsfunktionen, um
  daraus eine vollstaendige SubjectConfig zu bauen. Der Assistent haelt seinen
  Zustand als flaches, formularnahes Objekt; erst beim Speichern (Schritt 6)
  entsteht daraus eine SubjectConfig, die gegen validateSubjectConfig geprueft
  wird.
*/

import { DEFAULT_FORBIDDEN_WORDS } from "../types";
import type {
  CalibrationSample,
  Criterion,
  FeedbackStyle,
  GradingSystem,
  SubjectConfig,
} from "../types";

/** Ein Kriterium im Entwurf, mit einer stabilen lokalen Editier-id. */
export interface DraftCriterion extends Criterion {
  /** Nur fuer die Formular-Liste (React key), nicht Teil der gespeicherten Config. */
  localKey: string;
}

/** Eine Beispielarbeit im Entwurf, mit Punkten je Kriterium als Text (Formularfeld). */
export interface DraftCalibrationSample {
  localKey: string;
  id: string;
  text: string;
  note: string;
  /** criterionId -> Punkte als Text, damit leere Felder moeglich sind. */
  scoreText: Record<string, string>;
}

export interface WizardDraft {
  /** Gesetzt, wenn eine vorhandene Konfiguration bearbeitet wird (gleiche id behalten). */
  editingId: string | null;
  createdAt: string | null;

  // Schritt 1
  subject: string;
  textLanguage: string;
  feedbackLanguage: string;
  classLevel: string;
  level: string;

  // Schritt 2
  taskPrompt: string;
  taskUploadNote: string | null;

  // Schritt 3
  expectedPointsText: string;
  criteria: DraftCriterion[];
  rubricSuggestionRequested: boolean;

  // Schritt 4
  gradingSystem: GradingSystem;
  tone: string;
  length: FeedbackStyle["length"];
  includePractice: boolean;

  // Schritt 5
  calibrationSamples: DraftCalibrationSample[];

  forbiddenWords: string[];
}

let localKeyCounter = 0;
export function makeLocalKey(): string {
  localKeyCounter += 1;
  return `local-${Date.now()}-${localKeyCounter}`;
}

export function blankDraft(): WizardDraft {
  return {
    editingId: null,
    createdAt: null,
    subject: "",
    textLanguage: "de",
    feedbackLanguage: "de",
    classLevel: "",
    level: "",
    taskPrompt: "",
    taskUploadNote: null,
    expectedPointsText: "",
    criteria: [],
    rubricSuggestionRequested: false,
    gradingSystem: "nrw-points",
    tone: "warm und klar",
    length: "medium",
    includePractice: true,
    calibrationSamples: [],
    forbiddenWords: [...DEFAULT_FORBIDDEN_WORDS],
  };
}

/** Baut den Formular-Entwurf aus einer vorhandenen SubjectConfig (Bearbeiten/Duplizieren). */
export function draftFromConfig(config: SubjectConfig, keepId: boolean): WizardDraft {
  return {
    editingId: keepId ? config.id : null,
    createdAt: keepId ? config.createdAt : null,
    subject: config.subject,
    textLanguage: config.textLanguage,
    feedbackLanguage: config.feedbackLanguage,
    classLevel: config.classLevel,
    level: config.level,
    taskPrompt: config.rubric.taskPrompt,
    taskUploadNote: null,
    expectedPointsText: config.rubric.expectedPoints.join("\n"),
    criteria: config.rubric.criteria.map((c) => ({ ...c, localKey: makeLocalKey() })),
    rubricSuggestionRequested: config.rubric.criteria.length > 0,
    gradingSystem: config.gradingSystem,
    tone: config.feedbackStyle.tone,
    length: config.feedbackStyle.length,
    includePractice: config.feedbackStyle.includePractice,
    calibrationSamples: config.rubric.calibrationSamples.map((s) => ({
      localKey: makeLocalKey(),
      id: s.id,
      text: s.text,
      note: s.note ?? "",
      scoreText: Object.fromEntries(
        Object.entries(s.teacherScores).map(([k, v]) => [k, String(v)]),
      ),
    })),
    forbiddenWords: [...config.forbiddenWords],
  };
}

export function expectedPointsFromText(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "fach"
  );
}

/** Erzeugt eine neue, eindeutige id aus dem Fach- und Anzeigenamen. */
export function newConfigId(name: string, existingIds: string[]): string {
  const base = slugify(name);
  const taken = new Set(existingIds);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Baut die zu speichernde SubjectConfig aus dem Entwurf. existingIds nur fuer neue Konfigurationen relevant. */
export function buildConfigFromDraft(
  draft: WizardDraft,
  displayName: string,
  existingIds: string[],
): SubjectConfig {
  const now = new Date().toISOString();
  const id = draft.editingId ?? newConfigId(displayName, existingIds);

  const criteria: Criterion[] = draft.criteria.map((c) => {
    const { localKey, ...rest } = c;
    void localKey;
    return rest;
  });

  const calibrationSamples: CalibrationSample[] = draft.calibrationSamples
    .filter((s) => s.text.trim() !== "")
    .map((s) => ({
      id: s.id,
      text: s.text,
      note: s.note || undefined,
      teacherScores: Object.fromEntries(
        Object.entries(s.scoreText)
          .map(([k, v]) => [k, Number(v)])
          .filter(([, v]) => Number.isFinite(v as number)),
      ),
    }));

  return {
    id,
    name: displayName,
    subject: draft.subject,
    textLanguage: draft.textLanguage,
    feedbackLanguage: draft.feedbackLanguage,
    classLevel: draft.classLevel,
    level: draft.level,
    gradingSystem: draft.gradingSystem,
    feedbackStyle: {
      tone: draft.tone,
      length: draft.length,
      includePractice: draft.includePractice,
    },
    forbiddenWords: draft.forbiddenWords,
    rubric: {
      taskPrompt: draft.taskPrompt,
      expectedPoints: expectedPointsFromText(draft.expectedPointsText),
      criteria,
      calibrationSamples,
    },
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
  };
}
