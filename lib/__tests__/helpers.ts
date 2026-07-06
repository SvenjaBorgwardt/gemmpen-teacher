/*
  Test-Helfer: laedt die Beispiel-Konfigurationen ohne JSON-Import
  (damit Node im Strip-Types-Modus die .ts-Tests direkt ausfuehren kann).
*/

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SubjectConfig } from "../types";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Ordner mit den Beispiel-Konfigurationen. */
export const examplesDir = path.resolve(here, "../../data/config/beispiele");

/** Laedt eine Beispiel-Konfiguration nach id (Dateiname ohne Endung). */
export function loadExample(id: string): SubjectConfig {
  const raw = readFileSync(path.join(examplesDir, `${id}.json`), "utf8");
  return JSON.parse(raw) as SubjectConfig;
}

/** Namen aller Beispiel-Konfigurationen (ohne .json). */
export function exampleIds(): string[] {
  return readdirSync(examplesDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}
