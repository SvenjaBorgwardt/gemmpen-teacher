/*
  Warm-Paper PDF-Layout-Bausteine (pdf-lib).

  Ein kleiner Fluss-Layout-Helfer: schreibt Ueberschriften und Fliesstext
  nacheinander auf eine Seite und legt automatisch eine neue Seite an, wenn
  der verbleibende Platz nicht mehr reicht (Seitenumbruch-Logik). Design
  gemaess Hausregel 7 (Warm Paper): Creme-Hintergrund, Amber/Gold-Akzente,
  Times (eingebauter Serif-Font von pdf-lib) fuer Titel, Helvetica fuer
  Fliesstext.
*/

import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";
import type { RGB } from "pdf-lib";
import { sanitizeForWinAnsi } from "./text-sanitize";
import { wrapText } from "./wrap";

/* ----------------------------------------------------------------------------
   Warm Paper Farben (aus app/globals.css, Hausregel 7)
---------------------------------------------------------------------------- */

export const COLORS = {
  paper: rgb(0xfa / 255, 0xf6 / 255, 0xef / 255),
  paperRaised: rgb(0xff / 255, 0xfd / 255, 0xf8 / 255),
  ink: rgb(0x2b / 255, 0x26 / 255, 0x20 / 255),
  inkSoft: rgb(0x5c / 255, 0x54 / 255, 0x49 / 255),
  line: rgb(0xe7 / 255, 0xdd / 255, 0xcc / 255),
  amberStrong: rgb(0x9a / 255, 0x6f / 255, 0x08 / 255),
  amberSoft: rgb(0xf3 / 255, 0xe8 / 255, 0xcf / 255),
  categories: {
    grammar: rgb(0xb8 / 255, 0x5c / 255, 0x3a / 255),
    sentence: rgb(0x7a / 255, 0x8b / 255, 0x5a / 255),
    vocabulary: rgb(0xb8 / 255, 0x86 / 255, 0x0b / 255),
    connectives: rgb(0x7a / 255, 0x6b / 255, 0x8a / 255),
  } as Record<string, RGB>,
};

export const PAGE_WIDTH = 595.28; // A4 in pt
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 56;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export interface Fonts {
  title: PDFFont; // Times-Bold, fuer Ueberschriften
  titleItalic: PDFFont;
  body: PDFFont; // Helvetica, fuer Fliesstext
  bodyBold: PDFFont;
  bodyItalic: PDFFont;
}

export async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    title: await doc.embedFont(StandardFonts.TimesRomanBold),
    titleItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    body: await doc.embedFont(StandardFonts.Helvetica),
    bodyBold: await doc.embedFont(StandardFonts.HelveticaBold),
    bodyItalic: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
}

/**
 * Fluss-Layout ueber eine oder mehrere Seiten eines Dokuments. Merkt sich die
 * aktuelle Schreibposition, legt bei Bedarf automatisch eine neue Seite an
 * (Warm-Paper-Hintergrund) und bietet Bausteine fuer Titel, Fliesstext,
 * Zitat-Chips und Fusszeile.
 */
export class FlowingPage {
  doc: PDFDocument;
  fonts: Fonts;
  page: PDFPage;
  y: number;
  pageIndex = 0;
  /**
   * Fusszeilen-Text als Funktion von (aktuelle Seite, Gesamtseiten). Da die
   * Gesamtseitenzahl erst feststeht, wenn das ganze Dokument fertig ist
   * (ein Abschnitt kann auf mehrere physische Seiten umbrechen, siehe
   * Seitenumbruch-Logik), werden alle Fusszeilen erst in finish() in einem
   * letzten Durchgang ueber alle bereits erzeugten Seiten geschrieben.
   */
  private footerText: (pageNumber: number, totalPages: number) => string;
  /** Seiten, die zu diesem FlowingPage gehoeren (fuer die Fusszeile am Ende). */
  private ownedPages: PDFPage[] = [];

  constructor(
    doc: PDFDocument,
    fonts: Fonts,
    footerText: (pageNumber: number, totalPages: number) => string,
  ) {
    this.doc = doc;
    this.fonts = fonts;
    this.footerText = footerText;
    this.page = this.newPage();
    this.y = PAGE_HEIGHT - MARGIN;
  }

  private newPage(): PDFPage {
    const page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: COLORS.paper,
    });
    this.pageIndex += 1;
    this.ownedPages.push(page);
    return page;
  }

  /** Erzwingt eine neue Seite (z.B. am Ende jeder logischen Seite 1/2/3). */
  startNewPage(): void {
    this.page = this.newPage();
    this.y = PAGE_HEIGHT - MARGIN;
  }

  /** Stellt sicher, dass mindestens `height` Platz bis zum unteren Rand bleibt. */
  private ensureSpace(height: number): void {
    if (this.y - height < MARGIN + 30) {
      this.startNewPage();
    }
  }

  /** Titelzeile (Serif, gross). */
  drawTitle(text: string, size = 22): void {
    this.ensureSpace(size + 12);
    const clean = sanitizeForWinAnsi(text);
    this.page.drawText(clean, {
      x: MARGIN,
      y: this.y - size,
      size,
      font: this.fonts.title,
      color: COLORS.amberStrong,
    });
    this.y -= size + 14;
  }

  /** Abschnitts-Ueberschrift (Serif, mittel). */
  drawHeading(text: string, size = 15): void {
    this.ensureSpace(size + 20);
    const clean = sanitizeForWinAnsi(text);
    this.page.drawText(clean, {
      x: MARGIN,
      y: this.y - size,
      size,
      font: this.fonts.title,
      color: COLORS.ink,
    });
    this.y -= size + 10;
  }

  /** Kleines Etikett (z.B. "Fach", "Aufgabe"), gedaempfte Farbe, klein. */
  drawLabel(text: string, size = 10): void {
    const clean = sanitizeForWinAnsi(text.toUpperCase());
    const lineHeight = size + 4;
    const lines = wrapText(clean, CONTENT_WIDTH, (t) =>
      this.fonts.bodyBold.widthOfTextAtSize(t, size),
    );
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.page.drawText(line, {
        x: MARGIN,
        y: this.y - size,
        size,
        font: this.fonts.bodyBold,
        color: COLORS.amberStrong,
      });
      this.y -= lineHeight;
    }
  }

  /**
   * Fliesstext mit automatischem Umbruch und Seitenumbruch. Gibt die Anzahl
   * gezeichneter Zeilen zurueck (fuer Tests/Diagnose).
   */
  drawParagraph(
    text: string,
    options: { size?: number; lineHeight?: number; color?: RGB; italic?: boolean } = {},
  ): number {
    const size = options.size ?? 11;
    const lineHeight = options.lineHeight ?? size * 1.45;
    const color = options.color ?? COLORS.ink;
    const font = options.italic ? this.fonts.bodyItalic : this.fonts.body;
    const clean = sanitizeForWinAnsi(text);
    const lines = wrapText(clean, CONTENT_WIDTH, (t) => font.widthOfTextAtSize(t, size));

    for (const line of lines) {
      this.ensureSpace(lineHeight);
      if (line !== "") {
        this.page.drawText(line, {
          x: MARGIN,
          y: this.y - size,
          size,
          font,
          color,
        });
      }
      this.y -= lineHeight;
    }
    return lines.length;
  }

  /** Ein Zitat als abgesetzter, kursiver Block mit dezentem Hintergrund. */
  drawQuoteBlock(quote: string): void {
    const size = 10.5;
    const lineHeight = size * 1.4;
    const padTop = 10;
    const padBottom = 8;
    const clean = sanitizeForWinAnsi(`„${quote}“`);
    // Anfuehrungszeichen selbst schon WinAnsi-sicher waehlen (u201E/u201C
    // sind ausserhalb WinAnsi -> sanitizeForWinAnsi ersetzt sie durch ").
    const lines = wrapText(
      clean,
      CONTENT_WIDTH - 20,
      (t) => this.fonts.bodyItalic.widthOfTextAtSize(t, size),
    );
    const textHeight = lines.length * lineHeight;
    const blockHeight = textHeight + padTop + padBottom;
    this.ensureSpace(blockHeight);

    // this.y ist die obere Kante des Blocks; das Rechteck wird nach unten
    // gezeichnet (pdf-lib y-Koordinaten wachsen nach oben, drawRectangle
    // erwartet die untere linke Ecke plus Hoehe).
    const blockTop = this.y;
    this.page.drawRectangle({
      x: MARGIN,
      y: blockTop - blockHeight,
      width: CONTENT_WIDTH,
      height: blockHeight,
      color: COLORS.amberSoft,
    });

    let cursor = blockTop - padTop - size;
    for (const line of lines) {
      this.page.drawText(line, {
        x: MARGIN + 10,
        y: cursor,
        size,
        font: this.fonts.bodyItalic,
        color: COLORS.inkSoft,
      });
      cursor -= lineHeight;
    }
    this.y = blockTop - blockHeight - 8;
  }

  /** Horizontale Trennlinie. */
  drawDivider(): void {
    this.ensureSpace(16);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 1,
      color: COLORS.line,
    });
    this.y -= 16;
  }

  addSpace(height: number): void {
    this.ensureSpace(height);
    this.y -= height;
  }

  /**
   * Schreibt die Fusszeile auf jede Seite dieses Abschnitts, jetzt mit der
   * tatsaechlichen Gesamtseitenzahl (erst am Ende bekannt, weil ein
   * Abschnitt auf mehrere physische Seiten umbrechen kann). Am Ende des
   * Dokuments aufrufen.
   */
  finish(): void {
    const total = this.ownedPages.length;
    this.ownedPages.forEach((page, i) => {
      const text = sanitizeForWinAnsi(this.footerText(i + 1, total));
      if (!text) return;
      page.drawText(text, {
        x: MARGIN,
        y: MARGIN - 22,
        size: 9,
        font: this.fonts.body,
        color: COLORS.inkSoft,
      });
    });
  }
}
