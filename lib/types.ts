/*
  Kern-Datentypen fuer gemmpen-teacher.

  Orientierung: data/-Struktur aus Abschnitt 0 des Bauplans.
    data/config/       -> SubjectConfig (eine Datei pro Fach)
    data/submissions/  -> Submission, Transcript, Assessment, FeedbackDraft (pro Runde)
    data/dpo/          -> DpoPair (Korrektur-Paare als JSONL)

  Diese Typen sind der gemeinsame Vertrag fuer alle folgenden Arbeitspakete (AP2 bis AP8).
  Felder sind bewusst grosszuegig gehalten; spaetere Pakete duerfen erweitern, nicht umbenennen.
*/

/* ----------------------------------------------------------------------------
   Gemeinsame Hilfstypen
---------------------------------------------------------------------------- */

/** Sprache der Oberflaeche und der Locale-Dateien. */
export type UiLocale = "de" | "en";

/** Sprache eines Textes oder des Feedbacks (freier ISO-Code, nicht auf UI begrenzt). */
export type LanguageCode = string;

/** Unterstuetzte Notensysteme fuer die Gesamtnote. */
export type GradingSystem =
  | "nrw-points" // NRW Notenpunkte 0-15
  | "grades-1-6" // deutsche Schulnoten 1-6
  | "percent"; // Prozent 0-100

/** ISO-8601 Zeitstempel als String. */
export type IsoTimestamp = string;

/**
 * Default-Verbotswoerter fuer schuelergerichteten Text (Hausregel 2).
 * Werden bei neuen Konfigurationen vorbelegt und koennen ergaenzt werden.
 */
export const DEFAULT_FORBIDDEN_WORDS: readonly string[] = [
  "wrong",
  "bad",
  "poor",
  "fail",
  "lack",
  "weak",
  "missing",
  "incorrect",
  "falsch",
  "schlecht",
  "mangelhaft",
  "fehlt",
];

/* ----------------------------------------------------------------------------
   Rubric / Bewertungsraster (Teil der Fach-Konfiguration)
---------------------------------------------------------------------------- */

/** Eine Stufenbeschreibung innerhalb eines Kriteriums (Deskriptor je Punktebereich). */
export interface CriterionLevel {
  /** Untergrenze der Punkte fuer diese Stufe. */
  minPoints: number;
  /** Obergrenze der Punkte fuer diese Stufe. */
  maxPoints: number;
  /** Kurzbezeichnung, z.B. "gut", "befriedigend". */
  label: string;
  /** Beschreibung, woran diese Stufe zu erkennen ist. */
  descriptor: string;
}

/** Ein Bewertungskriterium innerhalb eines Rasters. */
export interface Criterion {
  /** Stabile ID, z.B. "grammar" oder "argument-1". */
  id: string;
  /** Anzeigename, z.B. "Grammatik". */
  name: string;
  /** Was dieses Kriterium prueft. */
  description: string;
  /** Maximal erreichbare Punkte. */
  maxPoints: number;
  /** Optionale Stufen-Deskriptoren. */
  levels?: CriterionLevel[];
  /**
   * Alles-oder-Nichts-Sonderregel (z.B. Claim + Reason + Example).
   * Wenn gesetzt, gibt es entweder volle Punkte oder null.
   */
  allOrNothing?: {
    /** Kurzbeschreibung der Bedingung, z.B. "Alle drei Teile vorhanden". */
    rule: string;
    /** Teilbedingungen, die alle erfuellt sein muessen. */
    parts: string[];
  };
  /** Optionale Kategorie-Farbe fuer die Darstellung (Hausregel 7). */
  colorKey?: "grammar" | "sentence" | "vocabulary" | "connectives";
}

/** Eine bewertete Beispielarbeit zur Kalibrierung des Rasters. */
export interface CalibrationSample {
  id: string;
  /** Roher oder transkribierter Schuelertext des Beispiels. */
  text: string;
  /** Von der Lehrkraft vergebene Punkte je Kriterium (criterionId -> Punkte). */
  teacherScores: Record<string, number>;
  /** Optionale Notiz der Lehrkraft zum Beispiel. */
  note?: string;
}

/** Das komplette Bewertungsraster eines Fachs. */
export interface Rubric {
  /** Aufgabenstellung im Klartext. */
  taskPrompt: string;
  /** Erwartungshorizont als Liste erwarteter inhaltlicher Punkte. */
  expectedPoints: string[];
  /** Die Bewertungskriterien. */
  criteria: Criterion[];
  /** Bewertete Beispielarbeiten fuer die Kalibrierung. */
  calibrationSamples: CalibrationSample[];
}

/* ----------------------------------------------------------------------------
   Fach-Konfiguration (data/config/*.json)
---------------------------------------------------------------------------- */

/** Ton und Umfang des erzeugten Feedbacks. */
export interface FeedbackStyle {
  /** Ton, z.B. "warm und klar". */
  tone: string;
  /** Ungefaehre Laenge: kurz, mittel, ausfuehrlich. */
  length: "short" | "medium" | "long";
  /** Ob ein konkreter Uebungsvorschlag angehaengt wird. */
  includePractice: boolean;
}

/** Eine vollstaendige Fach-Konfiguration. Eine Datei je Fach in data/config/. */
export interface SubjectConfig {
  /** Stabile ID (Dateiname ohne Endung). */
  id: string;
  /** Anzeigename, z.B. "Englisch Comment". */
  name: string;
  /** Fach, z.B. "Englisch". */
  subject: string;
  /** Sprache der Schuelertexte. */
  textLanguage: LanguageCode;
  /** Sprache des erzeugten Feedbacks. */
  feedbackLanguage: LanguageCode;
  /** Klassenstufe, frei, z.B. "Klasse 11a". */
  classLevel: string;
  /** Niveau, z.B. "B1-B2". */
  level: string;
  /** Gewaehltes Notensystem. */
  gradingSystem: GradingSystem;
  /** Feedback-Stil. */
  feedbackStyle: FeedbackStyle;
  /**
   * Woerter, die im schuelergerichteten Text nicht vorkommen duerfen.
   * Default sind die Verbotswoerter aus Hausregel 2.
   */
  forbiddenWords: string[];
  /** Das Bewertungsraster. */
  rubric: Rubric;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/* ----------------------------------------------------------------------------
   Submission / Transkript / Bewertung (data/submissions/*)
---------------------------------------------------------------------------- */

/** Status einer einzelnen Arbeit im Ablauf. */
export type SubmissionStatus =
  | "ingested" // hochgeladen und erkannt, noch nicht geprueft
  | "transcribed" // Text erkannt, wartet auf Pruefung
  | "checked" // Transkript geprueft und bestaetigt
  | "assessed" // Bewertung liegt vor, wartet auf Freigabe
  | "released"; // freigegeben, bereit fuer den Export

/** Eine einzelne erkannte Seite einer Arbeit. */
export interface SubmissionPage {
  /** Seitenindex innerhalb der Arbeit, ab 0. */
  index: number;
  /** Relativer Pfad zum entzerrten Seitenbild. */
  imagePath: string;
  /** Relativer Pfad zum ausgeschnittenen Kopfzeilen-Bild (fuer AP3-Auslesung). */
  headerImagePath?: string;
  /** Ob die Scan-Vorlage anhand der Eckmarker erkannt wurde. */
  templateDetected: boolean;
}

/**
 * Vorschlag aus der Kopfzeilen-Erkennung (siehe lib/transcription/header.ts).
 * Ausschliesslich ein Vorschlag: wird nie automatisch uebernommen, die
 * Lehrkraft entscheidet aktiv (z.B. in der Pruefen-Seite, AP6).
 */
export interface HeaderSuggestion {
  taskCode: string | null;
  studentAlias: string | null;
  sheetNumber: string | null;
}

/** Eine hochgeladene Schuelerarbeit (kann mehrseitig sein). */
export interface Submission {
  /** Stabile ID der Arbeit. */
  id: string;
  /** ID der Bewertungsrunde (Ordner in data/submissions/). */
  roundId: string;
  /** ID der zugehoerigen Fach-Konfiguration. */
  configId: string;
  /** Schueler-Kuerzel (Pseudonym, keine echten Namen). */
  studentAlias: string;
  /** Aufgaben-Code aus der Kopfzeile, falls erkannt. */
  taskCode?: string;
  /** Die erkannten Seiten. */
  pages: SubmissionPage[];
  status: SubmissionStatus;
  /**
   * Vorschlag aus der Kopfzeilen-Erkennung der ersten Seite, falls die
   * Erkennung gelaufen ist (siehe AP3, app/api/recognize/run). Nur ein
   * Vorschlag; ueberschreibt nie studentAlias/taskCode automatisch.
   */
  headerSuggestion?: HeaderSuggestion;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** Eine einzelne erkannte Textzeile mit optionaler Position im Bild. */
export interface TranscriptLine {
  /** Fortlaufender Index. */
  index: number;
  /** Erkannter Text. Unsichere Woerter im Format [[wort?]]. */
  text: string;
  /**
   * Optionale Bildposition der Zeile (relativ 0..1) fuer die Pruefansicht.
   * pageIndex verweist auf SubmissionPage.index.
   */
  position?: { pageIndex: number; top: number; bottom: number };
}

/** Das erkannte Transkript einer Arbeit. */
export interface Transcript {
  submissionId: string;
  /** Zeilen des erkannten Textes. */
  lines: TranscriptLine[];
  /** Anzahl unsicherer Stellen ([[wort?]]). */
  unclearCount: number;
  /** Ob die Lehrkraft das Transkript bestaetigt hat. */
  confirmed: boolean;
  updatedAt: IsoTimestamp;
}

/** Bewertung eines einzelnen Kriteriums. */
export interface CriterionAssessment {
  criterionId: string;
  /** Vergebene Punkte. */
  points: number;
  /** Begruendung der Punkte. */
  reasoning: string;
  /** Woertliche Zitate aus dem Schuelertext als Beleg. */
  evidence: string[];
}

/** Die vollstaendige Bewertung einer Arbeit. */
export interface Assessment {
  submissionId: string;
  /** ID der genutzten Fach-Konfiguration (fuer Nachvollziehbarkeit). */
  configId: string;
  /** Bewertung je Kriterium. */
  criteria: CriterionAssessment[];
  /** Gesamtpunkte ueber alle Kriterien. */
  totalPoints: number;
  /** Maximal moegliche Punkte. */
  maxPoints: number;
  /** Note im konfigurierten Notensystem, als Anzeigewert. */
  gradeDisplay: string;
  /** Ob die Bewertung freigegeben ist. */
  released: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

/** Ein schuelergerichteter Feedback-Entwurf. */
export interface FeedbackDraft {
  submissionId: string;
  /** Eine Staerke zuerst. */
  strength: string;
  /** Konkrete Beobachtungen, jeweils mit Zitat. */
  observations: Array<{
    criterionId?: string;
    text: string;
    quote?: string;
  }>;
  /** Ein konkreter naechster Schritt. */
  nextStep: string;
  /** Optionaler Uebungsvorschlag. */
  practice?: string;
  updatedAt: IsoTimestamp;
}

/* ----------------------------------------------------------------------------
   App-Konfiguration (data/config/app.json)
   Modellnamen und Verbindungsdaten fuer die Auswertung (Ollama), nicht
   fachspezifisch. Getrennt von SubjectConfig, damit ein Modellwechsel nicht
   jede Fach-Konfiguration anfasst.
---------------------------------------------------------------------------- */

/** App-weite Einstellungen fuer die Anbindung an die Auswertung (Ollama). */
export interface AppConfig {
  /** Basis-Adresse der Auswertung. Default http://localhost:11434. */
  ollamaBaseUrl: string;
  /** Modellname fuer die Transkription (muss Bilder verarbeiten koennen). */
  visionModel: string;
  /** Modellname fuer Bewertung und Feedback (reiner Text). */
  gradingModel: string;
  updatedAt: IsoTimestamp;
}

/* ----------------------------------------------------------------------------
   DPO-Korrektur-Paare (data/dpo/*.jsonl)
---------------------------------------------------------------------------- */

/**
 * Ein Korrektur-Paar aus der Review-Arbeit der Lehrkraft.
 * "rejected" ist der urspruenglich erzeugte Text, "chosen" die Korrektur.
 * Wird als JSONL gespeichert und spaeter fuer das Training exportiert.
 */
export interface DpoPair {
  id: string;
  submissionId: string;
  configId: string;
  /** Welche Art von Text korrigiert wurde. */
  kind: "score" | "reasoning" | "feedback";
  /** Optionaler Bezug zum Kriterium. */
  criterionId?: string;
  /** Kontext, der beiden Antworten zugrunde lag (z.B. der Anweisungstext). */
  context: string;
  /** Urspruenglich erzeugter Text oder Wert. */
  rejected: string;
  /** Von der Lehrkraft gewaehlte Fassung. */
  chosen: string;
  createdAt: IsoTimestamp;
}

/* ----------------------------------------------------------------------------
   Bewertungskette und Kalibrierung (lib/rubric, lib/prompts)
---------------------------------------------------------------------------- */

/**
 * Flache Metadaten-Sicht auf eine Fach-Konfiguration.
 * Wird aus SubjectConfig abgeleitet (nicht doppelt gespeichert) und in die
 * Prompt-Vorlagen eingesetzt. So bleibt SubjectConfig die einzige Quelle.
 */
export interface RubricMetadata {
  subject: string;
  textLanguage: LanguageCode;
  feedbackLanguage: LanguageCode;
  level: string;
  gradingSystem: GradingSystem;
  /** Ton des Feedbacks, aus feedbackStyle.tone. */
  tone: string;
  /** Verbotene Woerter im schuelergerichteten Text (Hausregel 2). */
  forbiddenWords: string[];
}

/**
 * Ergebnis des Inhaltsabgleichs gegen den Erwartungshorizont.
 * Strenges JSON, damit die App es parsen kann.
 */
export interface ContentMatchResult {
  /** Ein Eintrag je erwartetem Punkt aus rubric.expectedPoints. */
  points: Array<{
    /** Index in rubric.expectedPoints. */
    expectedIndex: number;
    /** Wurde der Punkt getroffen, teilweise oder nicht behandelt. */
    coverage: "covered" | "partial" | "absent";
    /** Woertliches Zitat aus dem Schuelertext, falls getroffen. */
    quote?: string;
  }>;
}

/**
 * Ergebnis der Kriterien-Bewertung (ein Aufruf bewertet alle Kriterien).
 * Strenges JSON. evidence enthaelt woertliche Zitate aus dem Schuelertext.
 */
export interface CriteriaScoringResult {
  criteria: CriterionAssessment[];
}

/**
 * Ergebnis der Feedback-Generierung.
 * Strenges JSON, entspricht der Struktur von FeedbackDraft ohne Metadaten.
 */
export interface FeedbackResult {
  /** Eine Staerke zuerst. */
  strength: string;
  /** 2-3 konkrete Beobachtungen mit Zitat. */
  observations: Array<{
    criterionId?: string;
    text: string;
    quote?: string;
  }>;
  /** Ein konkreter naechster Schritt. */
  nextStep: string;
  /** Optionaler Uebungsvorschlag. */
  practice?: string;
}

/**
 * Ergebnis eines Raster-Vorschlags aus Aufgabenstellung und Erwartungshorizont.
 * Strenges JSON. Die Lehrkraft bearbeitet den Vorschlag danach vollstaendig
 * in Formularen (kein sichtbares JSON in der UI, siehe AP5).
 */
export interface RubricSuggestionResult {
  /** Vorgeschlagene Kriterien, in Anzeigereihenfolge. */
  criteria: Array<{
    /** Stabile ID in Kleinschreibung mit Bindestrichen, z.B. "grammar". */
    id: string;
    name: string;
    description: string;
    maxPoints: number;
    /** Gesetzt, wenn eine Alles-oder-Nichts-Regel sinnvoll ist (z.B. Claim+Reason+Example). */
    allOrNothing?: {
      rule: string;
      parts: string[];
    };
  }>;
}

/** Abweichung eines einzelnen Kriteriums zwischen KI und Lehrkraft. */
export interface CriterionDeviation {
  criterionId: string;
  criterionName: string;
  /** Von der Lehrkraft vergebene Punkte. */
  teacherPoints: number;
  /** Von der Bewertungskette vergebene Punkte. */
  modelPoints: number;
  /** modelPoints minus teacherPoints (positiv = KI war grosszuegiger). */
  delta: number;
  /** Betrag der Abweichung. */
  absDelta: number;
  /** Maximalpunkte des Kriteriums (fuer die Einordnung des Deltas). */
  maxPoints: number;
}

/** Ergebnis eines Kalibrierungslaufs fuer eine einzelne Beispielarbeit. */
export interface CalibrationSampleResult {
  sampleId: string;
  deviations: CriterionDeviation[];
  /** Summe der Betraege ueber alle Kriterien. */
  totalAbsDelta: number;
}

/** Gesamtergebnis eines Kalibrierungslaufs ueber alle Beispielarbeiten. */
export interface CalibrationReport {
  configId: string;
  samples: CalibrationSampleResult[];
  /** Mittlere absolute Abweichung je Kriterium ueber alle Beispiele. */
  perCriterion: Array<{
    criterionId: string;
    criterionName: string;
    meanAbsDelta: number;
    maxPoints: number;
  }>;
  /** Mittlere absolute Abweichung ueber alle Kriterien und Beispiele. */
  meanAbsDelta: number;
}
