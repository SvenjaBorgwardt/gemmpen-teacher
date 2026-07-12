/*
  Dateisystem-Speicher fuer gemmpen-teacher (Hausregel: keine Datenbank).

  Alle Daten liegen in einem Ordner data/ neben der App:
    data/config/       Fach-Konfigurationen als JSON (eine Datei je Fach)
    data/submissions/  je Runde ein Ordner mit submission/transcript/assessment/feedback
    data/dpo/          Korrektur-Paare als JSONL (eine Datei je Runde oder je Fach)

  Dieses Modul laeuft nur serverseitig (Node). In Client-Komponenten nicht importieren.
*/

import { promises as fs } from "fs";
import path from "path";
import type {
  AppConfig,
  Assessment,
  DpoPair,
  FeedbackDraft,
  Submission,
  SubjectConfig,
  Transcript,
} from "./types";

/* ----------------------------------------------------------------------------
   Basispfade
---------------------------------------------------------------------------- */

/** Wurzel des Datenordners. Ueberschreibbar via GEMMPEN_DATA_DIR. */
export function dataRoot(): string {
  return process.env.GEMMPEN_DATA_DIR ?? path.join(process.cwd(), "data");
}

function configDir(): string {
  return path.join(dataRoot(), "config");
}
function submissionsDir(): string {
  return path.join(dataRoot(), "submissions");
}
function dpoDir(): string {
  return path.join(dataRoot(), "dpo");
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** Legt die drei Basisordner an, falls sie fehlen. */
export async function ensureDataDirs(): Promise<void> {
  await Promise.all([
    ensureDir(configDir()),
    ensureDir(submissionsDir()),
    ensureDir(dpoDir()),
  ]);
}

/* ----------------------------------------------------------------------------
   Generische JSON-Helfer
---------------------------------------------------------------------------- */

async function readJson<T>(file: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

async function writeJson(file: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

/** Vermeidet Ausbruch aus den Datenordnern ueber praeparierte IDs. */
function safeId(id: string): string {
  const cleaned = path.basename(id);
  if (cleaned !== id || cleaned.includes("..") || cleaned.trim() === "") {
    throw new Error(`Ungueltige ID: ${id}`);
  }
  return cleaned;
}

/* ----------------------------------------------------------------------------
   data/config  -  Fach-Konfigurationen
---------------------------------------------------------------------------- */

export async function listConfigs(): Promise<SubjectConfig[]> {
  await ensureDir(configDir());
  const files = await fs.readdir(configDir());
  const configs: SubjectConfig[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const cfg = await readJson<SubjectConfig>(path.join(configDir(), f));
    if (cfg) configs.push(cfg);
  }
  return configs.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readConfig(id: string): Promise<SubjectConfig | null> {
  return readJson<SubjectConfig>(path.join(configDir(), `${safeId(id)}.json`));
}

/** Ordner mit mitgelieferten Beispiel-Konfigurationen (Startvorlagen, im Repo). */
function exampleConfigDir(): string {
  return path.join(configDir(), "beispiele");
}

/**
 * Liest die mitgelieferten Beispiel-Konfigurationen aus data/config/beispiele/.
 * Diese read-only Startvorlagen dienen als Ausgangspunkt beim Einrichten und
 * liegen getrennt von den gespeicherten Faechern der Lehrkraft (data/config).
 * Fehlt der Ordner, wird eine leere Liste zurueckgegeben (Beispiele sind optional).
 */
export async function listExampleConfigs(): Promise<SubjectConfig[]> {
  let files: string[];
  try {
    files = await fs.readdir(exampleConfigDir());
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const configs: SubjectConfig[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const cfg = await readJson<SubjectConfig>(path.join(exampleConfigDir(), f));
    if (cfg) configs.push(cfg);
  }
  return configs.sort((a, b) => a.name.localeCompare(b.name));
}

export async function writeConfig(config: SubjectConfig): Promise<void> {
  await writeJson(path.join(configDir(), `${safeId(config.id)}.json`), config);
}

export async function deleteConfig(id: string): Promise<void> {
  const file = path.join(configDir(), `${safeId(id)}.json`);
  await fs.rm(file, { force: true });
}

/* ----------------------------------------------------------------------------
   data/config/app.json  -  App-weite Einstellungen (Ollama-Anbindung)
---------------------------------------------------------------------------- */

/**
 * Default-Modellnamen fuer die Auswertung. ZU BESTAETIGEN durch Svenja
 * (siehe UEBERGABE.md): dies sind aktuell gaengige lokale Gemma-Varianten,
 * aber Modellverfuegbarkeit und Namen bei Ollama aendern sich. Vor dem
 * ersten echten Einsatz auf dem Mac in den Einstellungen pruefen und bei
 * Bedarf anpassen (kein Code-Aenderung noetig, nur das Eingabefeld).
 */
export const DEFAULT_APP_CONFIG: Omit<AppConfig, "updatedAt"> = {
  ollamaBaseUrl: "http://localhost:11434",
  visionModel: "gemma3:12b",
  gradingModel: "gemma3:12b",
};

function appConfigFile(): string {
  return path.join(configDir(), "app.json");
}

/** Liest die App-Einstellungen. Fehlt die Datei, werden die Defaults zurueckgegeben (nicht geschrieben). */
export async function readAppConfig(): Promise<AppConfig> {
  const stored = await readJson<AppConfig>(appConfigFile());
  if (stored) return stored;
  return { ...DEFAULT_APP_CONFIG, updatedAt: new Date().toISOString() };
}

export async function writeAppConfig(config: AppConfig): Promise<void> {
  await writeJson(appConfigFile(), config);
}

/* ----------------------------------------------------------------------------
   data/submissions  -  Arbeiten je Runde
   Layout: data/submissions/<roundId>/<submissionId>/{submission,transcript,assessment,feedback}.json
---------------------------------------------------------------------------- */

function roundDir(roundId: string): string {
  return path.join(submissionsDir(), safeId(roundId));
}
function submissionDir(roundId: string, submissionId: string): string {
  return path.join(roundDir(roundId), safeId(submissionId));
}

export async function listRounds(): Promise<string[]> {
  await ensureDir(submissionsDir());
  const entries = await fs.readdir(submissionsDir(), { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

/* ----------------------------------------------------------------------------
   data/submissions/<roundId>/round.json  -  Rundenname (Stapel-Bezeichnung)

   Die Lehrkraft vergibt beim Hochladen einen sprechenden Namen (z.B.
   "Class 11A - 2026-05-12"). Dieser wird getrennt von den einzelnen Arbeiten
   gespeichert, damit er unabhaengig von Submissions ueberlebt und in allen
   Rundenauswahllisten (Pruefen/Bewerten/Export) angezeigt werden kann. Ohne
   gespeicherten Namen bleibt die technische roundId (Zeitstempel-Code) der
   Fallback-Anzeigename.
---------------------------------------------------------------------------- */

interface RoundInfo {
  roundId: string;
  label: string;
  createdAt: string;
}

function roundInfoFile(roundId: string): string {
  return path.join(roundDir(roundId), "round.json");
}

/** Liest den gespeicherten Rundennamen. Liefert null, wenn keiner gesetzt wurde. */
export async function readRoundLabel(roundId: string): Promise<string | null> {
  const info = await readJson<RoundInfo>(roundInfoFile(safeId(roundId)));
  return info?.label?.trim() ? info.label : null;
}

/** Speichert (oder ueberschreibt) den Rundennamen. Leere Namen werden ignoriert. */
export async function writeRoundLabel(roundId: string, label: string): Promise<void> {
  const trimmed = label.trim();
  if (!trimmed) return;
  const id = safeId(roundId);
  const existing = await readJson<RoundInfo>(roundInfoFile(id));
  await writeJson(roundInfoFile(id), {
    roundId: id,
    label: trimmed,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  } satisfies RoundInfo);
}

/** Rundenname mit Fallback auf die roundId (Zeitstempel-Code), fuer Anzeigelisten. */
export interface RoundOption {
  id: string;
  label: string;
}

/** Liste aller Runden mit Anzeigename (gespeicherter Name, sonst die roundId). */
export async function listRoundsWithLabels(): Promise<RoundOption[]> {
  const ids = await listRounds();
  const out: RoundOption[] = [];
  for (const id of ids) {
    const label = await readRoundLabel(id);
    out.push({ id, label: label ?? id });
  }
  return out;
}

export async function listSubmissions(roundId: string): Promise<Submission[]> {
  const dir = roundDir(roundId);
  let entries: string[];
  try {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    entries = dirents.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const out: Submission[] = [];
  for (const sid of entries) {
    const s = await readJson<Submission>(
      path.join(submissionDir(roundId, sid), "submission.json"),
    );
    if (s) out.push(s);
  }
  return out.sort((a, b) => a.studentAlias.localeCompare(b.studentAlias));
}

export async function readSubmission(
  roundId: string,
  submissionId: string,
): Promise<Submission | null> {
  return readJson<Submission>(
    path.join(submissionDir(roundId, submissionId), "submission.json"),
  );
}

export async function writeSubmission(submission: Submission): Promise<void> {
  await writeJson(
    path.join(submissionDir(submission.roundId, submission.id), "submission.json"),
    submission,
  );
}

export async function readTranscript(
  roundId: string,
  submissionId: string,
): Promise<Transcript | null> {
  return readJson<Transcript>(
    path.join(submissionDir(roundId, submissionId), "transcript.json"),
  );
}

export async function writeTranscript(
  roundId: string,
  transcript: Transcript,
): Promise<void> {
  await writeJson(
    path.join(submissionDir(roundId, transcript.submissionId), "transcript.json"),
    transcript,
  );
}

export async function readAssessment(
  roundId: string,
  submissionId: string,
): Promise<Assessment | null> {
  return readJson<Assessment>(
    path.join(submissionDir(roundId, submissionId), "assessment.json"),
  );
}

export async function writeAssessment(
  roundId: string,
  assessment: Assessment,
): Promise<void> {
  await writeJson(
    path.join(submissionDir(roundId, assessment.submissionId), "assessment.json"),
    assessment,
  );
}

export async function readFeedback(
  roundId: string,
  submissionId: string,
): Promise<FeedbackDraft | null> {
  return readJson<FeedbackDraft>(
    path.join(submissionDir(roundId, submissionId), "feedback.json"),
  );
}

export async function writeFeedback(
  roundId: string,
  feedback: FeedbackDraft,
): Promise<void> {
  await writeJson(
    path.join(submissionDir(roundId, feedback.submissionId), "feedback.json"),
    feedback,
  );
}

/* ----------------------------------------------------------------------------
   data/dpo  -  Korrektur-Paare als JSONL
---------------------------------------------------------------------------- */

function dpoFile(fileId: string): string {
  return path.join(dpoDir(), `${safeId(fileId)}.jsonl`);
}

/** Haengt ein Korrektur-Paar an eine JSONL-Datei an (eine Zeile je Paar). */
export async function appendDpoPair(fileId: string, pair: DpoPair): Promise<void> {
  await ensureDir(dpoDir());
  await fs.appendFile(dpoFile(fileId), JSON.stringify(pair) + "\n", "utf8");
}

/** Liest alle Paare einer JSONL-Datei. Fehlende Datei ergibt eine leere Liste. */
export async function readDpoPairs(fileId: string): Promise<DpoPair[]> {
  try {
    const raw = await fs.readFile(dpoFile(fileId), "utf8");
    return raw
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as DpoPair);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

/** Listet die IDs aller vorhandenen JSONL-Dateien (ohne Endung). */
export async function listDpoFiles(): Promise<string[]> {
  await ensureDir(dpoDir());
  const files = await fs.readdir(dpoDir());
  return files
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => f.slice(0, -".jsonl".length))
    .sort();
}
