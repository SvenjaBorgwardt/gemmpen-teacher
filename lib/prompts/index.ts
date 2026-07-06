/*
  Prompt-Bibliothek: oeffentliche Schnittstelle.

  Nutzung (AP3, AP7):
    import { renderCriteriaScore, parseJsonResponse } from "@/lib/prompts";
    const prompt = renderCriteriaScore(config, studentText);
    const raw = await client.complete(prompt);
    const result = parseJsonResponse<CriteriaScoringResult>(raw);
*/

export * from "./templates";
export * from "./render";
export * from "./chat";
export * from "./chat.mock";
export * from "./postprocess";
