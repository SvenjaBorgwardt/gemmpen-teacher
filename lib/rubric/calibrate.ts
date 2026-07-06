/*
  Kalibrierungslauf.

  Schickt die bewerteten Beispielarbeiten einer Fach-Konfiguration durch die
  Kriterien-Bewertung und vergleicht die erhaltenen Punkte mit den Punkten der
  Lehrkraft. Ergebnis: Abweichung pro Kriterium und im Mittel. So sieht die
  Lehrkraft, wo die Auswertung strenger oder grosszuegiger urteilt als sie selbst.

  Die Auswertung laeuft ueber einen ChatClient (Interface). AP3 liefert den
  echten Ollama-Client; fuer Tests gibt es den Mock in calibrate.mock.ts.
*/

import type {
  SubjectConfig,
  CriteriaScoringResult,
  CalibrationReport,
  CalibrationSampleResult,
  CriterionDeviation,
} from "../types";
import { renderCriteriaScore } from "../prompts/render";
import { parseJsonResponse, type ChatClient } from "../prompts/chat";

/**
 * Fuehrt die Kalibrierung fuer alle Beispielarbeiten der Konfiguration aus.
 * Wirft, wenn es keine Beispielarbeiten gibt.
 */
export async function runCalibration(
  config: SubjectConfig,
  client: ChatClient,
): Promise<CalibrationReport> {
  const samples = config.rubric.calibrationSamples;
  if (samples.length === 0) {
    throw new Error("Fuer die Kalibrierung sind keine Beispielarbeiten hinterlegt.");
  }

  const criterionById = new Map(config.rubric.criteria.map((c) => [c.id, c]));

  const sampleResults: CalibrationSampleResult[] = [];

  for (const sample of samples) {
    const prompt = renderCriteriaScore(config, sample.text);
    const raw = await client.complete(prompt);
    const parsed = parseJsonResponse<CriteriaScoringResult>(raw);

    const modelPointsById = new Map(
      parsed.criteria.map((c) => [c.criterionId, c.points]),
    );

    const deviations: CriterionDeviation[] = [];
    for (const criterion of config.rubric.criteria) {
      const teacherPoints = sample.teacherScores[criterion.id];
      const modelPoints = modelPointsById.get(criterion.id);
      // Kriterien ohne Lehrer-Punkte oder ohne Modell-Punkte werden uebersprungen.
      if (typeof teacherPoints !== "number" || typeof modelPoints !== "number") {
        continue;
      }
      const delta = modelPoints - teacherPoints;
      deviations.push({
        criterionId: criterion.id,
        criterionName: criterion.name,
        teacherPoints,
        modelPoints,
        delta,
        absDelta: Math.abs(delta),
        maxPoints: criterion.maxPoints,
      });
    }

    const totalAbsDelta = deviations.reduce((sum, d) => sum + d.absDelta, 0);
    sampleResults.push({ sampleId: sample.id, deviations, totalAbsDelta });
  }

  // Mittelwerte je Kriterium ueber alle Beispiele.
  const perCriterion = config.rubric.criteria.map((criterion) => {
    const deltas: number[] = [];
    for (const sr of sampleResults) {
      const dv = sr.deviations.find((d) => d.criterionId === criterion.id);
      if (dv) deltas.push(dv.absDelta);
    }
    const meanAbsDelta = deltas.length > 0 ? mean(deltas) : 0;
    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      meanAbsDelta,
      maxPoints: criterionById.get(criterion.id)?.maxPoints ?? criterion.maxPoints,
    };
  });

  const allDeltas = sampleResults.flatMap((sr) => sr.deviations.map((d) => d.absDelta));
  const meanAbsDelta = allDeltas.length > 0 ? mean(allDeltas) : 0;

  return {
    configId: config.id,
    samples: sampleResults,
    perCriterion,
    meanAbsDelta,
  };
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
