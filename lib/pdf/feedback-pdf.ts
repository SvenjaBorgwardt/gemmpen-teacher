/*
  Feedback-PDF fuer eine einzelne freigegebene Arbeit (AP8).

  Drei Seiten, Design Warm Paper (Hausregel 7):
    Seite 1 - Gesamtbild und Staerken: Kuerzel, Fach, Aufgabe, Note im
              konfigurierten Notensystem, was gut gelungen ist.
    Seite 2 - Beobachtungen je Kriterium mit woertlichen Zitaten und Punkten.
    Seite 3 - Naechste Schritte und optionaler Uebungsvorschlag.

  Schueler-Kuerzel statt Namen (Submission.studentAlias ist bereits ein
  Pseudonym, siehe lib/types.ts). Ton warm, keine Verbotswoerter (Hausregel 2):
  die Texte kommen bereits durch guardText() aus der Bewertungskette (AP7),
  hier zusaetzlich eine zweite, defensive Pruefung direkt vor dem Schreiben.
*/

import { PDFDocument } from "pdf-lib";
import type { Assessment, Criterion, FeedbackDraft, SubjectConfig, Submission } from "../types";
import type { GradeResult } from "../grading/grade";
import { guardText } from "../prompts/postprocess";
import { COLORS, FlowingPage, loadFonts } from "./layout";
import { sanitizeForWinAnsi } from "./text-sanitize";

/** Sprachabhaengige Beschriftungen fuer das Feedback-PDF (nicht die App-UI). */
interface PdfLabels {
  documentTitle: string;
  subject: string;
  task: string;
  grade: string;
  page1Heading: string;
  strengthHeading: string;
  page2Heading: string;
  /** Ueberschrift einer einzelnen Beobachtung ohne zugeordnetes Kriterium. */
  observationHeading: string;
  points: string;
  page3Heading: string;
  nextStepHeading: string;
  practiceHeading: string;
  footer: (dateStr: string, subject: string) => string;
}

const LABELS_DE: PdfLabels = {
  documentTitle: "Feedback",
  subject: "Fach",
  task: "Aufgabe",
  grade: "Note",
  page1Heading: "Gesamtbild",
  strengthHeading: "Das ist gut gelungen",
  page2Heading: "Beobachtungen je Bereich",
  observationHeading: "Ein Blick auf deinen Text",
  points: "Punkte",
  page3Heading: "Naechste Schritte",
  nextStepHeading: "Das nimmst du dir als Naechstes vor",
  practiceHeading: "Uebungsvorschlag",
  footer: (dateStr, subject) => `${subject} - ${dateStr}`,
};

const LABELS_EN: PdfLabels = {
  documentTitle: "Feedback",
  subject: "Subject",
  task: "Task",
  grade: "Grade",
  page1Heading: "Overall picture",
  strengthHeading: "What went well",
  page2Heading: "Observations by area",
  observationHeading: "A closer look at your text",
  points: "points",
  page3Heading: "Next steps",
  nextStepHeading: "What to focus on next",
  practiceHeading: "Practice suggestion",
  footer: (dateStr, subject) => `${subject} - ${dateStr}`,
};

function labelsFor(feedbackLanguage: string): PdfLabels {
  const lang = feedbackLanguage.trim().toLowerCase();
  if (lang.startsWith("en")) return LABELS_EN;
  return LABELS_DE;
}

/** Verteidigt gegen Verbotswoerter (Hausregel 2) direkt vor dem Schreiben ins PDF. */
function guarded(text: string, forbiddenWords: readonly string[]): string {
  return guardText(text, forbiddenWords).text;
}

export interface FeedbackPdfInput {
  submission: Submission;
  config: SubjectConfig;
  assessment: Assessment;
  feedback: FeedbackDraft;
  grade: GradeResult;
  /** Datum als fertiger, bereits formatierter String (z.B. "03.07.2026"). */
  dateDisplay: string;
}

function criterionById(config: SubjectConfig, id: string): Criterion | undefined {
  return config.rubric.criteria.find((c) => c.id === id);
}

/**
 * Baut das dreiseitige Feedback-PDF fuer eine Arbeit und gibt die PDF-Bytes
 * zurueck. Wirft nie wegen nicht darstellbarer Zeichen: alle Texte laufen
 * durch sanitizeForWinAnsi() (siehe lib/pdf/layout.ts: FlowingPage).
 */
export async function buildFeedbackPdf(input: FeedbackPdfInput): Promise<Uint8Array> {
  const { submission, config, assessment, feedback, grade, dateDisplay } = input;
  const labels = labelsFor(config.feedbackLanguage);
  const forbidden = config.forbiddenWords;

  // Kategorie-Farbe eines Kriteriums (grammar/sentence/...); Inhalts-Kriterien
  // ohne colorKey erhalten den Gold-Akzent - so ziehen sich die vier Farben als
  // roter Faden durch Balken, Ueberschriften und Zitat.
  const catColor = (colorKey?: string) =>
    (colorKey && COLORS.categories[colorKey]) || COLORS.amberStrong;

  // Score-Objekt-Segmente: ein Segment je Kriterium in Rasterreihenfolge.
  const segments = config.rubric.criteria.map((cr) => {
    const ca = assessment.criteria.find((c) => c.criterionId === cr.id);
    return { points: ca?.points ?? 0, maxPoints: cr.maxPoints, color: catColor(cr.colorKey) };
  });

  // Kernzitat: die eigenen Worte der Schuelerin (erste belegte Beobachtung).
  const heroObs = feedback.observations.find((o) => o.quote && o.quote.trim() !== "");
  const heroCriterion = heroObs?.criterionId
    ? criterionById(config, heroObs.criterionId)
    : undefined;

  const doc = await PDFDocument.create();
  doc.setTitle(sanitizeForWinAnsi(`${labels.documentTitle} - ${submission.studentAlias}`));
  doc.setAuthor("GemmPen");
  doc.setSubject(sanitizeForWinAnsi(config.subject));

  const fonts = await loadFonts(doc);
  // Gesamtseitenzahl kommt aus totalPages (siehe FlowingPage.finish()): steht
  // erst fest, wenn alle Abschnitte geschrieben sind, weil eine logische
  // Seite (z.B. viele Beobachtungen) auf mehrere physische Seiten umbrechen
  // kann. So zeigt die Fusszeile immer die korrekte Zahl statt "X / 3".
  const footerText = (pageNumber: number, totalPages: number) =>
    `${labels.footer(dateDisplay, config.subject)} - ${pageNumber} / ${totalPages}`;
  const flow = new FlowingPage(doc, fonts, footerText);

  /* ---------------------------- Seite 1 ---------------------------- */
  flow.drawTitle(`${labels.documentTitle} - ${submission.studentAlias}`);
  flow.drawLabel(`${labels.subject}: ${config.subject}`);
  if (config.rubric.taskPrompt) {
    flow.drawLabel(`${labels.task}: ${firstLine(config.rubric.taskPrompt)}`);
  }
  flow.addSpace(16);

  // Kernstueck: die eigenen Worte der Schuelerin, gross und zuerst. Das Blatt
  // sagt "das hast du geschrieben", bevor es die Note nennt.
  if (heroObs?.quote) {
    flow.drawPullQuote(heroObs.quote, catColor(heroCriterion?.colorKey));
    flow.addSpace(14);
  }

  // Note als Score-Objekt (identisch zur App): Zahl + kategorie-segmentierter Balken.
  flow.drawScoreObject(grade.display, capitalize(grade.label), segments);
  flow.drawParagraph(
    guarded(`${assessment.totalPoints} / ${assessment.maxPoints} ${labels.points}`, forbidden),
    { size: 11, color: COLORS.inkSoft },
  );
  flow.addSpace(10);
  flow.drawDivider();

  flow.drawHeading(labels.strengthHeading, 14);
  flow.drawParagraph(guarded(feedback.strength, forbidden), { size: 12 });

  /* ---------------------------- Seite 2 ---------------------------- */
  flow.startNewPage();
  flow.drawTitle(labels.page2Heading, 18);
  flow.addSpace(4);

  if (feedback.observations.length === 0) {
    flow.drawParagraph(guarded(labels.page1Heading, forbidden), { size: 11, italic: true });
  }

  for (const observation of feedback.observations) {
    const criterion = observation.criterionId
      ? criterionById(config, observation.criterionId)
      : undefined;
    const criterionAssessment = observation.criterionId
      ? assessment.criteria.find((c) => c.criterionId === observation.criterionId)
      : undefined;

    if (criterion) {
      const pointsText = criterionAssessment
        ? ` (${criterionAssessment.points} / ${criterion.maxPoints} ${labels.points})`
        : "";
      flow.drawAreaHeading(`${criterion.name}${pointsText}`, catColor(criterion.colorKey));
    } else {
      flow.drawAreaHeading(labels.observationHeading, COLORS.amberStrong);
    }

    flow.drawParagraph(guarded(observation.text, forbidden), { size: 11.5 });
    if (observation.quote && observation.quote.trim() !== "") {
      flow.drawQuoteBlock(observation.quote);
    }
    flow.addSpace(8);
  }

  /* ---------------------------- Seite 3 ---------------------------- */
  flow.startNewPage();
  flow.drawTitle(labels.page3Heading, 18);
  flow.addSpace(4);

  flow.drawHeading(labels.nextStepHeading, 13);
  flow.drawParagraph(guarded(feedback.nextStep, forbidden), { size: 12 });

  if (feedback.practice && feedback.practice.trim() !== "") {
    flow.addSpace(10);
    flow.drawDivider();
    flow.drawHeading(labels.practiceHeading, 13);
    flow.drawParagraph(guarded(feedback.practice, forbidden), { size: 12 });
  }

  flow.finish();

  return doc.save();
}

function firstLine(text: string): string {
  const line = text.split("\n").find((l) => l.trim() !== "") ?? "";
  return line.length > 90 ? `${line.slice(0, 87)}...` : line;
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
