/*
  Validierung einer Fach-Konfiguration (SubjectConfig) gegen das Rubric-Schema.

  Bewusst ohne externe Schema-Bibliothek: die Regeln aus rubric.schema.json sind
  hier als kleine, abhaengigkeitsfreie Pruefungen umgesetzt. So bleibt der Build
  stabil, egal ob eine JSON-Schema-Engine installiert ist. Die JSON-Datei
  rubric.schema.json bleibt die maschinenlesbare Referenz fuer externe Werkzeuge.
*/

import type { SubjectConfig, GradingSystem } from "../types";

/** Ein einzelner Validierungs-Fehler mit Pfad und Klartext. */
export interface ValidationError {
  /** Pfad zur Fundstelle, z.B. "rubric.criteria[0].maxPoints". */
  path: string;
  /** Verstaendliche Beschreibung. */
  message: string;
}

/** Ergebnis einer Validierung. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const GRADING_SYSTEMS: GradingSystem[] = ["nrw-points", "grades-1-6", "percent"];
const COLOR_KEYS = ["grammar", "sentence", "vocabulary", "connectives"];
const LENGTHS = ["short", "medium", "long"];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Prueft eine unbekannte Struktur gegen das SubjectConfig-Schema.
 * Gibt alle gefundenen Fehler zurueck (nicht nur den ersten).
 */
export function validateSubjectConfig(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const err = (path: string, message: string) => errors.push({ path, message });

  if (!isObject(input)) {
    return { valid: false, errors: [{ path: "", message: "Konfiguration ist kein Objekt." }] };
  }

  const c = input;

  // Metadaten
  if (!isNonEmptyString(c.id)) err("id", "id fehlt oder ist leer.");
  else if (!/^[a-z0-9][a-z0-9-]*$/.test(c.id))
    err("id", "id darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.");
  if (!isNonEmptyString(c.name)) err("name", "name fehlt oder ist leer.");
  if (!isNonEmptyString(c.subject)) err("subject", "subject fehlt oder ist leer.");
  if (typeof c.textLanguage !== "string" || c.textLanguage.length < 2)
    err("textLanguage", "textLanguage fehlt oder ist zu kurz.");
  if (typeof c.feedbackLanguage !== "string" || c.feedbackLanguage.length < 2)
    err("feedbackLanguage", "feedbackLanguage fehlt oder ist zu kurz.");
  if (typeof c.classLevel !== "string") err("classLevel", "classLevel fehlt.");
  if (typeof c.level !== "string") err("level", "level fehlt.");
  if (!GRADING_SYSTEMS.includes(c.gradingSystem as GradingSystem))
    err("gradingSystem", `gradingSystem muss eines sein von: ${GRADING_SYSTEMS.join(", ")}.`);
  if (typeof c.createdAt !== "string") err("createdAt", "createdAt fehlt.");
  if (typeof c.updatedAt !== "string") err("updatedAt", "updatedAt fehlt.");

  // Feedback-Stil
  if (!isObject(c.feedbackStyle)) {
    err("feedbackStyle", "feedbackStyle fehlt oder ist kein Objekt.");
  } else {
    const fs = c.feedbackStyle;
    if (!isNonEmptyString(fs.tone)) err("feedbackStyle.tone", "tone fehlt oder ist leer.");
    if (!LENGTHS.includes(fs.length as string))
      err("feedbackStyle.length", `length muss eines sein von: ${LENGTHS.join(", ")}.`);
    if (typeof fs.includePractice !== "boolean")
      err("feedbackStyle.includePractice", "includePractice muss true oder false sein.");
  }

  // Verbotswoerter
  if (!Array.isArray(c.forbiddenWords) || c.forbiddenWords.length < 1) {
    err("forbiddenWords", "forbiddenWords muss eine nicht leere Liste sein.");
  } else if (!c.forbiddenWords.every((w) => isNonEmptyString(w))) {
    err("forbiddenWords", "forbiddenWords darf nur nicht leere Texte enthalten.");
  }

  // Rubric
  validateRubric(c.rubric, "rubric", err);

  return { valid: errors.length === 0, errors };
}

function validateRubric(
  rubric: unknown,
  base: string,
  err: (path: string, message: string) => void,
): void {
  if (!isObject(rubric)) {
    err(base, "rubric fehlt oder ist kein Objekt.");
    return;
  }

  if (!isNonEmptyString(rubric.taskPrompt)) err(`${base}.taskPrompt`, "taskPrompt fehlt oder ist leer.");

  if (!Array.isArray(rubric.expectedPoints)) {
    err(`${base}.expectedPoints`, "expectedPoints muss eine Liste sein.");
  } else {
    rubric.expectedPoints.forEach((p, i) => {
      if (!isNonEmptyString(p)) err(`${base}.expectedPoints[${i}]`, "Eintrag ist leer.");
    });
  }

  if (!Array.isArray(rubric.criteria) || rubric.criteria.length < 1) {
    err(`${base}.criteria`, "criteria muss mindestens ein Kriterium enthalten.");
  } else {
    const seenIds = new Set<string>();
    rubric.criteria.forEach((cr, i) => {
      validateCriterion(cr, `${base}.criteria[${i}]`, err, seenIds);
    });
  }

  if (rubric.calibrationSamples !== undefined) {
    if (!Array.isArray(rubric.calibrationSamples)) {
      err(`${base}.calibrationSamples`, "calibrationSamples muss eine Liste sein.");
    } else {
      const criterionIds = Array.isArray(rubric.criteria)
        ? new Set(
            rubric.criteria
              .filter((cr): cr is Record<string, unknown> => isObject(cr))
              .map((cr) => cr.id)
              .filter((id): id is string => typeof id === "string"),
          )
        : new Set<string>();
      rubric.calibrationSamples.forEach((s, i) => {
        validateCalibrationSample(s, `${base}.calibrationSamples[${i}]`, err, criterionIds);
      });
    }
  } else {
    err(`${base}.calibrationSamples`, "calibrationSamples fehlt (leere Liste ist erlaubt).");
  }
}

function validateCriterion(
  cr: unknown,
  base: string,
  err: (path: string, message: string) => void,
  seenIds: Set<string>,
): void {
  if (!isObject(cr)) {
    err(base, "Kriterium ist kein Objekt.");
    return;
  }
  if (!isNonEmptyString(cr.id)) {
    err(`${base}.id`, "id fehlt oder ist leer.");
  } else if (seenIds.has(cr.id)) {
    err(`${base}.id`, `id "${cr.id}" ist mehrfach vergeben.`);
  } else {
    seenIds.add(cr.id);
  }
  if (!isNonEmptyString(cr.name)) err(`${base}.name`, "name fehlt oder ist leer.");
  if (!isNonEmptyString(cr.description)) err(`${base}.description`, "description fehlt oder ist leer.");
  if (typeof cr.maxPoints !== "number" || cr.maxPoints <= 0)
    err(`${base}.maxPoints`, "maxPoints muss eine Zahl groesser 0 sein.");

  if (cr.levels !== undefined) {
    if (!Array.isArray(cr.levels)) {
      err(`${base}.levels`, "levels muss eine Liste sein.");
    } else {
      cr.levels.forEach((lv, i) => {
        if (!isObject(lv)) {
          err(`${base}.levels[${i}]`, "Stufe ist kein Objekt.");
          return;
        }
        if (typeof lv.minPoints !== "number") err(`${base}.levels[${i}].minPoints`, "minPoints fehlt.");
        if (typeof lv.maxPoints !== "number") err(`${base}.levels[${i}].maxPoints`, "maxPoints fehlt.");
        if (!isNonEmptyString(lv.label)) err(`${base}.levels[${i}].label`, "label fehlt.");
        if (!isNonEmptyString(lv.descriptor)) err(`${base}.levels[${i}].descriptor`, "descriptor fehlt.");
      });
    }
  }

  if (cr.allOrNothing !== undefined) {
    if (!isObject(cr.allOrNothing)) {
      err(`${base}.allOrNothing`, "allOrNothing muss ein Objekt sein.");
    } else {
      if (!isNonEmptyString(cr.allOrNothing.rule))
        err(`${base}.allOrNothing.rule`, "rule fehlt oder ist leer.");
      if (!Array.isArray(cr.allOrNothing.parts) || cr.allOrNothing.parts.length < 2)
        err(`${base}.allOrNothing.parts`, "parts muss mindestens zwei Teile enthalten.");
    }
  }

  if (cr.colorKey !== undefined && !COLOR_KEYS.includes(cr.colorKey as string))
    err(`${base}.colorKey`, `colorKey muss eines sein von: ${COLOR_KEYS.join(", ")}.`);
}

function validateCalibrationSample(
  s: unknown,
  base: string,
  err: (path: string, message: string) => void,
  criterionIds: Set<string>,
): void {
  if (!isObject(s)) {
    err(base, "Beispielarbeit ist kein Objekt.");
    return;
  }
  if (!isNonEmptyString(s.id)) err(`${base}.id`, "id fehlt oder ist leer.");
  if (!isNonEmptyString(s.text)) err(`${base}.text`, "text fehlt oder ist leer.");
  if (!isObject(s.teacherScores)) {
    err(`${base}.teacherScores`, "teacherScores fehlt oder ist kein Objekt.");
  } else {
    for (const [k, v] of Object.entries(s.teacherScores)) {
      if (typeof v !== "number") err(`${base}.teacherScores.${k}`, "Punktwert muss eine Zahl sein.");
      if (criterionIds.size > 0 && !criterionIds.has(k))
        err(`${base}.teacherScores.${k}`, `Kein Kriterium mit id "${k}" im Raster.`);
    }
  }
}

/**
 * Wie validateSubjectConfig, wirft aber bei ungueltiger Eingabe eine Ausnahme
 * mit lesbarer Fehlerliste. Praktisch beim Laden einer gespeicherten Datei.
 */
export function assertValidSubjectConfig(input: unknown): asserts input is SubjectConfig {
  const result = validateSubjectConfig(input);
  if (!result.valid) {
    const lines = result.errors.map((e) => `  - ${e.path || "(Wurzel)"}: ${e.message}`).join("\n");
    throw new Error(`Die Konfiguration ist nicht gueltig:\n${lines}`);
  }
}
