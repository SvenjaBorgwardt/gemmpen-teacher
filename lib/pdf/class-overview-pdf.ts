/*
  Klassenuebersicht als PDF (AP8).

  Tabelle: Kuerzel, Punkte je Kriterium, Gesamtnote. Fusszeile mit Datum und
  Fach. Nur freigegebene Arbeiten (Aufrufer filtert vorher, siehe
  app/api/export/class-pdf/route.ts).
*/

import { PDFDocument } from "pdf-lib";
import type { Assessment, SubjectConfig, Submission } from "../types";
import { COLORS, FlowingPage, loadFonts, MARGIN, PAGE_WIDTH } from "./layout";
import { sanitizeForWinAnsi } from "./text-sanitize";

export interface ClassOverviewRow {
  submission: Submission;
  assessment: Assessment;
}

export interface ClassOverviewPdfInput {
  config: SubjectConfig;
  roundId: string;
  rows: ClassOverviewRow[];
  dateDisplay: string;
}

interface Labels {
  title: string;
  alias: string;
  grade: string;
  total: string;
  empty: string;
}

const LABELS_DE: Labels = {
  title: "Klassenuebersicht",
  alias: "Kuerzel",
  grade: "Note",
  total: "Gesamt",
  empty: "Keine freigegebene Arbeit in dieser Runde.",
};

const LABELS_EN: Labels = {
  title: "Class overview",
  alias: "Alias",
  grade: "Grade",
  total: "Total",
  empty: "No released paper in this batch.",
};

function labelsFor(feedbackLanguage: string): Labels {
  return feedbackLanguage.trim().toLowerCase().startsWith("en") ? LABELS_EN : LABELS_DE;
}

const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 26;

/**
 * Baut die Klassenuebersicht als PDF (eine oder mehrere Seiten je nach
 * Anzahl Arbeiten). Spalten: Kuerzel, ein Punktespalte je Kriterium,
 * Gesamtpunkte, Note.
 */
export async function buildClassOverviewPdf(input: ClassOverviewPdfInput): Promise<Uint8Array> {
  const { config, roundId, rows, dateDisplay } = input;
  const labels = labelsFor(config.feedbackLanguage);
  const criteria = config.rubric.criteria;

  const doc = await PDFDocument.create();
  doc.setTitle(sanitizeForWinAnsi(`${labels.title} - ${config.subject}`));
  doc.setAuthor("GemmPen");

  const fonts = await loadFonts(doc);
  const footerText = (pageNumber: number, totalPages: number) =>
    `${config.subject} - ${dateDisplay} - ${roundId} - ${pageNumber} / ${totalPages}`;
  const flow = new FlowingPage(doc, fonts, footerText);

  flow.drawTitle(labels.title, 20);
  flow.drawLabel(`${config.subject} - ${roundId}`);
  flow.addSpace(10);

  if (rows.length === 0) {
    flow.drawParagraph(labels.empty, { size: 12, italic: true });
    flow.finish();
    return doc.save();
  }

  // Spaltenbreiten: Kuerzel, je Kriterium eine schmale Spalte, Gesamt, Note.
  const aliasWidth = 70;
  const gradeWidth = 70;
  const totalWidth = 60;
  const remaining = PAGE_WIDTH - MARGIN * 2 - aliasWidth - gradeWidth - totalWidth;
  const criterionWidth = criteria.length > 0 ? remaining / criteria.length : remaining;

  const columns: Array<{ label: string; width: number }> = [
    { label: labels.alias, width: aliasWidth },
    ...criteria.map((c) => ({ label: shortLabel(c.name), width: criterionWidth })),
    { label: labels.total, width: totalWidth },
    { label: labels.grade, width: gradeWidth },
  ];

  drawTableHeader(flow, columns);

  for (const row of rows) {
    ensureRowSpace(flow, columns);
    const cells = [
      row.submission.studentAlias,
      ...criteria.map((c) => {
        const ca = row.assessment.criteria.find((x) => x.criterionId === c.id);
        return ca ? `${ca.points}/${c.maxPoints}` : "-";
      }),
      `${row.assessment.totalPoints}/${row.assessment.maxPoints}`,
      row.assessment.gradeDisplay,
    ];
    drawTableRow(flow, columns, cells);
  }

  flow.finish();
  return doc.save();
}

function shortLabel(name: string): string {
  return name.length > 14 ? `${name.slice(0, 12)}...` : name;
}

function ensureRowSpace(flow: FlowingPage, columns: Array<{ label: string; width: number }>): void {
  // Wenn nicht genug Platz fuer eine weitere Zeile bleibt: neue Seite plus
  // Tabellenkopf erneut zeichnen, damit jede Seite eigenstaendig lesbar ist.
  if (flow.y - ROW_HEIGHT < MARGIN + 30) {
    flow.startNewPage();
    drawTableHeader(flow, columns);
  }
}

function drawTableHeader(flow: FlowingPage, columns: Array<{ label: string; width: number }>): void {
  const top = flow.y;
  flow.page.drawRectangle({
    x: MARGIN,
    y: top - HEADER_HEIGHT,
    width: columns.reduce((sum, c) => sum + c.width, 0),
    height: HEADER_HEIGHT,
    color: COLORS.amberSoft,
  });
  let x = MARGIN;
  for (const col of columns) {
    flow.page.drawText(sanitizeForWinAnsi(col.label), {
      x: x + 6,
      y: top - HEADER_HEIGHT + 8,
      size: 9.5,
      font: flow.fonts.bodyBold,
      color: COLORS.ink,
    });
    x += col.width;
  }
  flow.y -= HEADER_HEIGHT;
}

function drawTableRow(
  flow: FlowingPage,
  columns: Array<{ label: string; width: number }>,
  cells: string[],
): void {
  const top = flow.y;
  flow.page.drawLine({
    start: { x: MARGIN, y: top },
    end: { x: MARGIN + columns.reduce((sum, c) => sum + c.width, 0), y: top },
    thickness: 0.5,
    color: COLORS.line,
  });
  let x = MARGIN;
  for (let i = 0; i < columns.length; i++) {
    const text = truncateToWidth(
      sanitizeForWinAnsi(cells[i] ?? ""),
      columns[i].width - 12,
      flow.fonts.body,
    );
    flow.page.drawText(text, {
      x: x + 6,
      y: top - ROW_HEIGHT + 7,
      size: 10,
      font: flow.fonts.body,
      color: COLORS.ink,
    });
    x += columns[i].width;
  }
  flow.y -= ROW_HEIGHT;
}

function truncateToWidth(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  size = 10,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}...`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}...`;
}
