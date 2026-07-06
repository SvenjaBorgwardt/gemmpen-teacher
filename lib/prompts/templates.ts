/*
  Prompt-Vorlagen mit Platzhaltern. Platzhalter im Format {{name}} werden von
  render.ts aus der Fach-Konfiguration und dem Schuelertext befuellt.

  Drei Bausteine der Bewertungskette:
    1. contentMatch  - Inhaltsabgleich gegen den Erwartungshorizont
    2. criteriaScore - Kriterien-Bewertung mit woertlichen Zitaten
    3. feedback      - schuelergerichtetes Feedback (Staerke, Beobachtungen, naechster Schritt)

  Jeder Baustein besteht aus einem System-Teil (Rolle und Regeln) und einem
  User-Teil (Aufgabe und Daten). Die Ausgabe ist immer striktes JSON, damit die
  App sie parsen kann. Die JSON-Form steht wortwoertlich in der Vorlage.

  Wichtige Regeln, die in jede Vorlage eingebaut sind:
    - Antworte ausschliesslich in {{feedbackLanguage}}.
    - Belege jede Aussage mit einem woertlichen Zitat aus dem Schuelertext.
    - Verrate nie die Loesung.
    - Nutze nie die verbotenen Woerter ({{forbiddenWords}}).
    - Benenne nie das Unerwuenschte, auch nicht verneint (kein "nicht falsch",
      kein "ohne Fehler"): sprich nur ueber das, was schon da ist, und ueber den
      naechsten konkreten Schritt.
*/

export interface PromptTemplate {
  system: string;
  user: string;
}

/* ----------------------------------------------------------------------------
   Gemeinsame Regel-Bloecke (werden in mehrere Vorlagen eingesetzt)
---------------------------------------------------------------------------- */

/** Sprach- und Belegregeln, in jeder Vorlage identisch. */
export const RULE_BLOCK = `Regeln:
- Schreibe ausschliesslich in dieser Sprache: {{feedbackLanguage}}.
- Belege jede Beobachtung mit einem woertlichen Zitat aus dem Text der lernenden Person. Zitiere genau, nichts erfinden.
- Nenne nie die Loesung und keine Musterformulierung. Zeige den naechsten Schritt, ohne ihn vorzuschreiben.
- Verwende keines dieser Woerter: {{forbiddenWords}}.
- Benenne nie das Unerwuenschte, auch nicht verneint. Sprich nur ueber das, was schon da ist, und ueber den naechsten Schritt.
- Antworte mit striktem JSON in genau der vorgegebenen Form, ohne weiteren Text davor oder danach.`;

/* ----------------------------------------------------------------------------
   1. Inhaltsabgleich gegen den Erwartungshorizont
---------------------------------------------------------------------------- */

export const CONTENT_MATCH: PromptTemplate = {
  system: `Du pruefst, welche erwarteten inhaltlichen Punkte der Text einer lernenden Person schon behandelt.
Fach: {{subject}}. Niveau: {{level}}. Sprache des Textes: {{textLanguage}}.

${RULE_BLOCK}`,
  user: `Aufgabenstellung:
{{taskPrompt}}

Erwartete inhaltliche Punkte (Reihenfolge ist die Nummerierung, beginnend bei 0):
{{expectedPointsNumbered}}

Text der lernenden Person:
"""
{{studentText}}
"""

Ordne jedem erwarteten Punkt zu, ob er im Text vorkommt. Gib fuer jeden erwarteten Punkt einen Eintrag zurueck.
Antworte als JSON in genau dieser Form:
{
  "points": [
    { "expectedIndex": 0, "coverage": "covered" | "partial" | "absent", "quote": "woertliches Zitat aus dem Text, nur wenn covered oder partial" }
  ]
}`,
};

/* ----------------------------------------------------------------------------
   1b. Raster-Vorschlag aus Aufgabenstellung und Erwartungshorizont
---------------------------------------------------------------------------- */

export const RUBRIC_SUGGEST: PromptTemplate = {
  system: `Du hilfst einer Lehrkraft, ein Bewertungsraster zu entwerfen.
Fach: {{subject}}. Niveau: {{level}}. Sprache der Schuelertexte: {{textLanguage}}. Notensystem: {{gradingSystemLabel}}.
Schlage klare, unterscheidbare Bewertungskriterien vor, die zusammen die Aufgabenstellung und den Erwartungshorizont abdecken.
Wenn ein Kriterium nur sinnvoll ist, wenn mehrere Teile zusammen vorkommen (zum Beispiel Behauptung, Begruendung und Beispiel), schlage dafuer eine Alles-oder-Nichts-Regel vor.
Antworte mit striktem JSON in genau der vorgegebenen Form, ohne weiteren Text davor oder danach.`,
  user: `Aufgabenstellung:
{{taskPrompt}}

Erwartungshorizont (was eine gute Bearbeitung inhaltlich enthaelt):
{{expectedPointsNumbered}}

Schlage ein Bewertungsraster vor. Verteile die Punkte sinnvoll auf die Kriterien.
Antworte als JSON in genau dieser Form:
{
  "criteria": [
    {
      "id": "kurze-id-in-kleinschreibung",
      "name": "Anzeigename",
      "description": "Was dieses Kriterium prueft",
      "maxPoints": 15,
      "allOrNothing": { "rule": "Kurzbeschreibung, nur wenn sinnvoll", "parts": ["Teil 1", "Teil 2"] }
    }
  ]
}`,
};

/* ----------------------------------------------------------------------------
   2. Kriterien-Bewertung mit woertlichen Zitaten
---------------------------------------------------------------------------- */

export const CRITERIA_SCORE: PromptTemplate = {
  system: `Du bewertest den Text einer lernenden Person anhand eines Rasters.
Fach: {{subject}}. Niveau: {{level}}. Sprache des Textes: {{textLanguage}}. Notensystem: {{gradingSystemLabel}}.
Vergib fuer jedes Kriterium eine Punktzahl innerhalb der erlaubten Spanne und begruende sie mit woertlichen Zitaten.
Fuer Kriterien mit Alles-oder-Nichts-Regel gilt: nur wenn alle genannten Teile vorhanden sind, gibt es die volle Punktzahl, sonst null Punkte.

${RULE_BLOCK}`,
  user: `Aufgabenstellung:
{{taskPrompt}}

Bewertungskriterien:
{{criteriaBlock}}

Text der lernenden Person:
"""
{{studentText}}
"""

Bewerte jedes Kriterium. Nutze in "evidence" ausschliesslich woertliche Zitate aus dem Text.
Antworte als JSON in genau dieser Form:
{
  "criteria": [
    { "criterionId": "id-des-kriteriums", "points": 0, "reasoning": "kurze Begruendung der Punkte", "evidence": ["woertliches Zitat", "..."] }
  ]
}`,
};

/* ----------------------------------------------------------------------------
   3. Feedback-Generierung
---------------------------------------------------------------------------- */

export const FEEDBACK: PromptTemplate = {
  system: `Du schreibst kurzes, warmes und klares Feedback fuer eine lernende Person auf Niveau {{level}}.
Ton: {{tone}}. Sprache: {{feedbackLanguage}}.
Aufbau: zuerst eine echte Staerke, dann {{observationCount}} konkrete Beobachtungen mit je einem woertlichen Zitat, dann genau ein naechster Schritt.
Kurze Saetze. Kein allgemeines Lob, kein KI-Klang.{{practiceInstruction}}

${RULE_BLOCK}`,
  user: `Aufgabenstellung:
{{taskPrompt}}

Ergebnis der Kriterien-Bewertung (Punkte und Begruendungen als Grundlage, nicht woertlich wiederholen):
{{assessmentSummary}}

Text der lernenden Person:
"""
{{studentText}}
"""

Schreibe das Feedback direkt an die lernende Person (Anrede in {{feedbackLanguage}}).
Antworte als JSON in genau dieser Form:
{
  "strength": "eine echte Staerke, mit Bezug auf den Text",
  "observations": [
    { "criterionId": "optionale id", "text": "konkrete Beobachtung und naechster Gedanke", "quote": "woertliches Zitat aus dem Text" }
  ],
  "nextStep": "genau ein konkreter naechster Schritt",
  "practice": "optionaler Uebungsvorschlag, nur wenn angefordert"
}`,
};
