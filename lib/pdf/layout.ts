/*
  Warm-Paper PDF-Layout-Bausteine (pdf-lib).

  Ein kleiner Fluss-Layout-Helfer: schreibt Ueberschriften und Fliesstext
  nacheinander auf eine Seite und legt automatisch eine neue Seite an, wenn
  der verbleibende Platz nicht mehr reicht (Seitenumbruch-Logik). Design
  gemaess Hausregel 7 (Warm Paper): Creme-Hintergrund, Amber/Gold-Akzente,
  Cormorant Garamond fuer Titel, DM Sans fuer Fliesstext - dieselben
  Marken-Schriften wie in der App, damit Blatt und Bildschirm ein Stueck sind.
  Die Schriften liegen als eingebundene TrueType-Dateien im Repo (lib/pdf/fonts,
  offline-first), werden per fontkit eingebettet und beim Einbetten auf die
  tatsaechlich genutzten Glyphen reduziert (subset).
*/

import { promises as fs } from "fs";
import path from "path";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
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

/** Mischt zwei Farben: `ratio` Anteil von a, Rest b. Fuer dezente Track-Farben. */
function mixColor(a: RGB, b: RGB, ratio: number): RGB {
  const c = Math.min(1, Math.max(0, ratio));
  return rgb(
    a.red * c + b.red * (1 - c),
    a.green * c + b.green * (1 - c),
    a.blue * c + b.blue * (1 - c),
  );
}

export const PAGE_WIDTH = 595.28; // A4 in pt
export const PAGE_HEIGHT = 841.89;
export const MARGIN = 56;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export interface Fonts {
  title: PDFFont; // Cormorant Garamond SemiBold, fuer Ueberschriften
  titleItalic: PDFFont; // Cormorant Garamond SemiBold Italic
  body: PDFFont; // DM Sans Regular, fuer Fliesstext
  bodyBold: PDFFont; // DM Sans SemiBold
  bodyItalic: PDFFont; // DM Sans Italic
}

/** Dateinamen der eingebundenen Marken-Schriften (siehe lib/pdf/fonts/README.md). */
const FONT_FILES = {
  title: "CormorantGaramond-SemiBold.ttf",
  titleItalic: "CormorantGaramond-SemiBoldItalic.ttf",
  body: "DMSans-Regular.ttf",
  bodyBold: "DMSans-SemiBold.ttf",
  bodyItalic: "DMSans-Italic.ttf",
} as const;

/** Verzeichnis der eingebundenen TrueType-Dateien (relativ zum Projektstamm). */
function fontsDir(): string {
  return path.join(process.cwd(), "lib", "pdf", "fonts");
}

/**
 * Rohbytes der Schriftdateien, einmal von der Platte gelesen und dann
 * gehalten. So liest der Export nicht bei jedem PDF erneut fuenf Dateien.
 */
const fontBytesCache = new Map<string, Uint8Array>();

async function readFontBytes(file: string): Promise<Uint8Array> {
  const cached = fontBytesCache.get(file);
  if (cached) return cached;
  const buf = await fs.readFile(path.join(fontsDir(), file));
  const bytes = new Uint8Array(buf);
  fontBytesCache.set(file, bytes);
  return bytes;
}

/**
 * Bettet die Marken-Schriften (Cormorant Garamond + DM Sans) in das Dokument
 * ein. fontkit erlaubt eigene TrueType-Fonts.
 *
 * Bewusst OHNE pdf-libs Subsetting eingebettet (subset: false): dessen
 * Subsetter verwirft bei Cormorant Garamond zusammengesetzte Glyphen, sodass
 * im Titel und in der Note Buchstaben fehlen wuerden. Die Dateien sind bereits
 * beim Bundlen auf den WinAnsi-Zeichenraum reduziert (siehe fonts/README.md,
 * ~136 KB fuer alle fuenf Schnitte), also bleibt das eingebettete PDF klein.
 */
export async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  doc.registerFontkit(fontkit);
  const embed = async (file: string) =>
    doc.embedFont(await readFontBytes(file), { subset: false });
  const [title, titleItalic, body, bodyBold, bodyItalic] = await Promise.all([
    embed(FONT_FILES.title),
    embed(FONT_FILES.titleItalic),
    embed(FONT_FILES.body),
    embed(FONT_FILES.bodyBold),
    embed(FONT_FILES.bodyItalic),
  ]);
  return { title, titleItalic, body, bodyBold, bodyItalic };
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
   * Grosses Schueler-Zitat als Kernstueck der Seite (Serif-Italic), mit farbiger
   * Seiten-Linie in der Kategorie-Farbe. Bewusst prominent gesetzt: das Blatt
   * sagt zuerst "das hast du geschrieben", dann kommt die Note.
   */
  drawPullQuote(quote: string, accent: RGB): void {
    const size = 19;
    const lineHeight = size * 1.32;
    const railW = 3;
    const gap = 14;
    const textX = MARGIN + railW + gap;
    const textWidth = CONTENT_WIDTH - railW - gap;
    const clean = sanitizeForWinAnsi(`„${quote}“`);
    const lines = wrapText(clean, textWidth, (t) =>
      this.fonts.titleItalic.widthOfTextAtSize(t, size),
    );
    const textHeight = lines.length * lineHeight;
    this.ensureSpace(textHeight + 8);
    const top = this.y;
    this.page.drawRectangle({
      x: MARGIN,
      y: top - textHeight,
      width: railW,
      height: textHeight,
      color: accent,
    });
    let cursor = top - size;
    for (const line of lines) {
      this.page.drawText(line, {
        x: textX,
        y: cursor,
        size,
        font: this.fonts.titleItalic,
        color: COLORS.ink,
      });
      cursor -= lineHeight;
    }
    this.y = top - textHeight - 8;
  }

  /**
   * Score-Objekt: Note gross, daneben die Einordnung, darunter ein
   * kategorie-segmentierter Balken (ein Segment je Kriterium, Breite nach
   * maxPoints, Fuellung nach erreichten Punkten). Dasselbe Objekt wie in der
   * App (components/score-object.tsx), damit Blatt und App ein Stueck sind.
   */
  drawScoreObject(
    display: string,
    label: string,
    segments: { points: number; maxPoints: number; color: RGB }[],
  ): void {
    const numSize = 27;
    this.ensureSpace(numSize + 28);
    const top = this.y;
    const displayClean = sanitizeForWinAnsi(display);
    this.page.drawText(displayClean, {
      x: MARGIN,
      y: top - numSize,
      size: numSize,
      font: this.fonts.title,
      color: COLORS.ink,
    });
    if (label) {
      const numW = this.fonts.title.widthOfTextAtSize(displayClean, numSize);
      this.page.drawText(sanitizeForWinAnsi(label), {
        x: MARGIN + numW + 12,
        y: top - numSize + 5,
        size: 13,
        font: this.fonts.titleItalic,
        color: COLORS.inkSoft,
      });
    }
    const barTop = top - numSize - 12;
    const barHeight = 7;
    const gap = 3;
    const totalMax = segments.reduce((s, x) => s + Math.max(0, x.maxPoints), 0) || 1;
    const usableW = CONTENT_WIDTH - gap * Math.max(0, segments.length - 1);
    let x = MARGIN;
    for (const seg of segments) {
      const segW = usableW * (Math.max(0, seg.maxPoints) / totalMax);
      this.page.drawRectangle({
        x,
        y: barTop - barHeight,
        width: segW,
        height: barHeight,
        color: mixColor(seg.color, COLORS.paper, 0.16),
      });
      const fillW =
        seg.maxPoints > 0 ? segW * Math.min(1, Math.max(0, seg.points / seg.maxPoints)) : 0;
      if (fillW > 0) {
        this.page.drawRectangle({
          x,
          y: barTop - barHeight,
          width: fillW,
          height: barHeight,
          color: seg.color,
        });
      }
      x += segW + gap;
    }
    this.y = barTop - barHeight - 12;
  }

  /** Abschnitts-Ueberschrift mit farbigem Seiten-Tick in der Kategorie-Farbe. */
  drawAreaHeading(text: string, accent: RGB, size = 13): void {
    this.ensureSpace(size + 20);
    const clean = sanitizeForWinAnsi(text);
    this.page.drawRectangle({ x: MARGIN, y: this.y - size, width: 4, height: size, color: accent });
    this.page.drawText(clean, {
      x: MARGIN + 12,
      y: this.y - size,
      size,
      font: this.fonts.title,
      color: COLORS.ink,
    });
    this.y -= size + 10;
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
