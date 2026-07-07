#!/usr/bin/env python3
"""
templates_build.py

Erzeugt drei druckfertige PDFs fuer GemmPen-Teacher:
1. vorlage-linien.pdf     - Schreibvorlage mit Linien (12 mm Abstand)
2. vorlage-kaestchen.pdf  - Schreibvorlage mit Kaestchen (5 mm)
3. scan-anleitung.pdf     - Einseitige Anleitung fuer Handyfoto und Scanner

Ausfuehren:
    pip install reportlab --break-system-packages
    python3 templates_build.py

Ergebnis liegt im selben Ordner wie dieses Skript.

WICHTIG fuer spaetere Arbeitspakete (Marker-Erkennung, siehe AP2):
Die genaue Geometrie der Eckmarker steht unten im Abschnitt
"MARKER-GEOMETRIE" als Konstanten UND in der README.md dieses Ordners.
Wer die Erkennung baut, soll die Konstanten hier als Quelle nehmen,
nicht die README abtippen (Gefahr von Zahlendrehern).
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white, black

# ---------------------------------------------------------------------------
# GRUNDMASSE DIN A4
# ---------------------------------------------------------------------------
PAGE_W, PAGE_H = A4  # 210 mm x 297 mm, in Points (1 mm = 2.834645669 pt)

# ---------------------------------------------------------------------------
# MARKER-GEOMETRIE (verbindlich, siehe auch README.md)
# ---------------------------------------------------------------------------
# Jeder Eckmarker ist ein gefuellter Kreis mit einem hellen Innenpunkt.
# Der Mittelpunkt jedes Kreises liegt MARKER_INSET mm von den beiden
# angrenzenden Blattkanten entfernt (nicht vom Papierrand aus gemessen
# in Diagonale, sondern getrennt in X und Y).
MARKER_INSET = 15.0          # mm, Abstand Mittelpunkt zu den zwei naechsten Kanten
MARKER_DIAMETER = 8.0        # mm, Aussendurchmesser des gefuellten Kreises
MARKER_RADIUS = MARKER_DIAMETER / 2.0
MARKER_INNER_DOT_DIAMETER = 2.0   # mm, heller Innenpunkt in der Mitte
MARKER_INNER_DOT_RADIUS = MARKER_INNER_DOT_DIAMETER / 2.0

# Asymmetrie-Merkmal oben links: ein kleines gefuelltes Quadrat direkt
# rechts neben dem Kreis, vertikal zentriert auf gleicher Hoehe wie der
# Kreis-Mittelpunkt. Dient dazu, die Bildorientierung (welche Ecke ist
# oben links) eindeutig zu erkennen, auch wenn das Foto gedreht ist.
ASYM_SQUARE_SIZE = 4.0       # mm, Kantenlaenge
ASYM_SQUARE_GAP = 3.0        # mm, Abstand von der Kreis-Aussenkante zum Quadrat

MARKER_COLOR = black

# ---------------------------------------------------------------------------
# LAYOUT-KONSTANTEN
# ---------------------------------------------------------------------------
MARGIN_SIDE = 20.0           # mm, linker/rechter Rand der Schreibzone
HEADER_TOP = 15.0            # mm, Abstand Kopfzeile zur oberen Kante
HEADER_HEIGHT = 25.0         # mm
FOOTER_HEIGHT = 12.0         # mm, Abstand Fusszeile zur unteren Kante
RULES_HEIGHT = 22.0          # mm, Platz fuer Schreibregeln am unteren Rand

LINE_SPACING = 12.0          # mm, Linienabstand fuer vorlage-linien.pdf
BOX_SIZE = 5.0                # mm, Kaestchengroesse fuer vorlage-kaestchen.pdf

INK_DARK = HexColor("#2B2420")      # kraeftiges warmes Dunkelbraun-Schwarz fuer Text/Marker
LINE_GREY = HexColor("#B8ACA0")     # dezente warme Graufarbe fuer Schreiblinien/Kaestchen
BOX_HEADER_BG = HexColor("#F5EDE0") # warmes Creme fuer Kopfzeilen-Kaestchen
ACCENT_GOLD = HexColor("#B8860B")   # Gold-Akzent (Hausregel 7)

FONT_LABEL = "Helvetica"
FONT_LABEL_BOLD = "Helvetica-Bold"


def mmv(v):
    """mm -> points"""
    return v * mm


def set_pdf_metadata(c, title):
    """
    Setzt sprechende Dokument-Metadaten. Ohne diese Angaben schreibt reportlab
    die Defaults 'untitled' / 'anonymous' in die PDF, die viele Viewer und der
    Browser-Download dann als Dateiname bzw. Dokumenttitel anzeigen.
    """
    c.setTitle(title)
    c.setAuthor("GemmPen Teacher")
    c.setCreator("GemmPen Teacher")
    c.setSubject("Druckvorlage fuer handschriftliche Klassenarbeiten")


# ---------------------------------------------------------------------------
# MARKER ZEICHNEN
# ---------------------------------------------------------------------------
def draw_corner_marker(c, cx_mm, cy_mm, is_top_left=False):
    """
    Zeichnet einen Eckmarker: gefuellter Kreis mit hellem Innenpunkt.
    cx_mm, cy_mm: Mittelpunkt des Kreises in mm, gemessen von der
    UNTEREN LINKEN Ecke des Blatts (reportlab-Koordinatensystem).
    """
    cx = mmv(cx_mm)
    cy = mmv(cy_mm)

    # Aussenkreis, gefuellt, dunkel
    c.setFillColor(MARKER_COLOR)
    c.circle(cx, cy, mmv(MARKER_RADIUS), stroke=0, fill=1)

    # Innenpunkt, hell (Papierweiss), damit der Mittelpunkt praezise
    # per Bildverarbeitung (z.B. Blob-Zentroid im hellen Loch) bestimmt
    # werden kann
    c.setFillColor(white)
    c.circle(cx, cy, mmv(MARKER_INNER_DOT_RADIUS), stroke=0, fill=1)

    if is_top_left:
        # Asymmetrie-Quadrat rechts neben dem Kreis, vertikal zentriert
        sq_x0 = cx + mmv(MARKER_RADIUS) + mmv(ASYM_SQUARE_GAP)
        sq_y0 = cy - mmv(ASYM_SQUARE_SIZE / 2.0)
        c.setFillColor(MARKER_COLOR)
        c.rect(sq_x0, sq_y0, mmv(ASYM_SQUARE_SIZE), mmv(ASYM_SQUARE_SIZE),
               stroke=0, fill=1)


def draw_all_markers(c):
    """
    Platziert alle vier Eckmarker. Koordinatensystem reportlab:
    Ursprung unten links, Y waechst nach oben.
    Page-Masse in mm: PAGE_W_MM x PAGE_H_MM.
    """
    page_w_mm = PAGE_W / mm
    page_h_mm = PAGE_H / mm

    # Oben links (in Papier-Leserichtung), im reportlab-Koordinatensystem
    # ist das: X = MARKER_INSET von links, Y = PAGE_H - MARKER_INSET von unten
    top_left = (MARKER_INSET, page_h_mm - MARKER_INSET)
    top_right = (page_w_mm - MARKER_INSET, page_h_mm - MARKER_INSET)
    bottom_left = (MARKER_INSET, MARKER_INSET)
    bottom_right = (page_w_mm - MARKER_INSET, MARKER_INSET)

    draw_corner_marker(c, top_left[0], top_left[1], is_top_left=True)
    draw_corner_marker(c, top_right[0], top_right[1])
    draw_corner_marker(c, bottom_left[0], bottom_left[1])
    draw_corner_marker(c, bottom_right[0], bottom_right[1])


# ---------------------------------------------------------------------------
# KOPFZEILE: AUFGABEN-CODE UND SCHUELER-KUERZEL
# ---------------------------------------------------------------------------
def draw_header(c):
    """
    Kopfzeile mit Kaestchen fuer Aufgaben-Code (8 Zeichen) und
    Schueler-Kuerzel (4 Zeichen), Blockschrift-Hinweis.
    Liegt unterhalb der oberen Eckmarker, oberhalb der Schreibzone.
    """
    page_w_mm = PAGE_W / mm
    page_h_mm = PAGE_H / mm

    header_y_top = page_h_mm - HEADER_TOP
    box_size = 8.0  # mm pro Zeichen-Kaestchen
    box_gap = 1.5   # mm zwischen den Kaestchen

    label_size = 7.5

    # Freiraum, den die Eckmarker oben links/rechts beanspruchen (Mittelpunkt
    # bei MARKER_INSET, Radius plus - nur links - Asymmetrie-Quadrat und Gap).
    # Kopfzeile faengt erst danach an, damit nichts mit dem Marker kollidiert.
    left_safe_x = MARKER_INSET + MARKER_RADIUS + ASYM_SQUARE_GAP + ASYM_SQUARE_SIZE + 4.0
    right_safe_x = page_w_mm - (MARKER_INSET + MARKER_RADIUS + 4.0)

    def draw_char_boxes(label, n_boxes, x_start_mm, y_top_mm, label_align="left"):
        c.setFont(FONT_LABEL_BOLD, label_size)
        c.setFillColor(INK_DARK)
        boxes_total_w = n_boxes * box_size + (n_boxes - 1) * box_gap
        if label_align == "left":
            c.drawString(mmv(x_start_mm), mmv(y_top_mm) + mmv(1.5), label)
        else:
            c.drawRightString(mmv(x_start_mm + boxes_total_w), mmv(y_top_mm) + mmv(1.5), label)
        boxes_y = y_top_mm - box_size - 2.0
        c.setFillColor(BOX_HEADER_BG)
        c.setStrokeColor(INK_DARK)
        c.setLineWidth(0.9)
        for i in range(n_boxes):
            bx = x_start_mm + i * (box_size + box_gap)
            c.rect(mmv(bx), mmv(boxes_y), mmv(box_size), mmv(box_size),
                   stroke=1, fill=1)
        return boxes_y

    # Aufgaben-Code: 8 Zeichen, linksbuendig, beginnt erst rechts vom
    # oberen linken Eckmarker samt Asymmetrie-Quadrat
    code_x_start = left_safe_x
    code_boxes_y = draw_char_boxes(
        "AUFGABEN-CODE (8 ZEICHEN, BLOCKSCHRIFT)",
        8, code_x_start, header_y_top, label_align="left"
    )

    # Schueler-Kuerzel: 4 Zeichen, rechtsbuendig, endet vor dem oberen
    # rechten Eckmarker
    kuerzel_boxes_total_w = 4 * box_size + 3 * box_gap
    kuerzel_x_start = right_safe_x - kuerzel_boxes_total_w
    kuerzel_boxes_y = draw_char_boxes(
        "SCHUELER-KUERZEL (4 ZEICHEN)",
        4, kuerzel_x_start, header_y_top, label_align="right"
    )

    return min(code_boxes_y, kuerzel_boxes_y)


# ---------------------------------------------------------------------------
# FUSSZEILE
# ---------------------------------------------------------------------------
def draw_footer(c):
    page_w_mm = PAGE_W / mm

    c.setFont(FONT_LABEL, 9)
    c.setFillColor(INK_DARK)
    text = "Blatt ____  von  ____"
    c.drawCentredString(mmv(page_w_mm / 2.0), mmv(FOOTER_HEIGHT), text)


# ---------------------------------------------------------------------------
# SCHREIBREGELN (unten aufgedruckt)
# ---------------------------------------------------------------------------
def draw_write_rules(c, y_top_mm):
    """
    Kurzer Regelblock ueber der Fusszeile: dunkler Stift, kein Bleistift,
    Streichungen mit einem sauberen Strich.
    """
    page_w_mm = PAGE_W / mm

    c.setFont(FONT_LABEL_BOLD, 8)
    c.setFillColor(ACCENT_GOLD)
    c.drawString(mmv(MARGIN_SIDE), mmv(y_top_mm), "Schreibregeln")

    rules = [
        "Bitte mit dunklem Stift schreiben (Kugelschreiber oder Fineliner), nicht mit Bleistift.",
        "Falsches bitte nur mit einem sauberen Strich durchstreichen, nicht schwaerzen oder radieren.",
        "Bitte in den Linien bzw. Kaestchen bleiben und die vier Eckpunkte nicht ueberschreiben.",
    ]
    c.setFont(FONT_LABEL, 7.5)
    c.setFillColor(INK_DARK)
    line_h = 3.8
    for i, rule in enumerate(rules):
        ty = y_top_mm - 4.5 - i * line_h
        c.drawString(mmv(MARGIN_SIDE), mmv(ty), "- " + rule)


# ---------------------------------------------------------------------------
# SCHREIBZONE: LINIEN
# ---------------------------------------------------------------------------
def draw_writing_zone_lines(c, zone_top_mm, zone_bottom_mm):
    page_w_mm = PAGE_W / mm
    x0 = MARGIN_SIDE
    x1 = page_w_mm - MARGIN_SIDE

    c.setStrokeColor(LINE_GREY)
    c.setLineWidth(0.6)

    y = zone_top_mm
    while y > zone_bottom_mm:
        c.line(mmv(x0), mmv(y), mmv(x1), mmv(y))
        y -= LINE_SPACING


# ---------------------------------------------------------------------------
# SCHREIBZONE: KAESTCHEN
# ---------------------------------------------------------------------------
def draw_writing_zone_boxes(c, zone_top_mm, zone_bottom_mm):
    page_w_mm = PAGE_W / mm
    x0 = MARGIN_SIDE
    x1 = page_w_mm - MARGIN_SIDE
    width_mm = x1 - x0
    height_mm = zone_top_mm - zone_bottom_mm

    n_cols = int(width_mm // BOX_SIZE)
    n_rows = int(height_mm // BOX_SIZE)

    c.setStrokeColor(LINE_GREY)
    c.setLineWidth(0.5)

    # Vertikale Linien
    for col in range(n_cols + 1):
        x = x0 + col * BOX_SIZE
        c.line(mmv(x), mmv(zone_top_mm), mmv(x), mmv(zone_top_mm - n_rows * BOX_SIZE))

    # Horizontale Linien
    for row in range(n_rows + 1):
        y = zone_top_mm - row * BOX_SIZE
        c.line(mmv(x0), mmv(y), mmv(x0 + n_cols * BOX_SIZE), mmv(y))


# ---------------------------------------------------------------------------
# EINE VOLLSTAENDIGE VORLAGENSEITE (Linien oder Kaestchen)
# ---------------------------------------------------------------------------
def build_vorlage(filename, mode):
    """
    mode: 'linien' oder 'kaestchen'
    """
    c = canvas.Canvas(filename, pagesize=A4)
    page_h_mm = PAGE_H / mm

    if mode == "linien":
        set_pdf_metadata(c, "GemmPen Schreibvorlage mit Linien")
    elif mode == "kaestchen":
        set_pdf_metadata(c, "GemmPen Schreibvorlage mit Kaestchen")

    draw_all_markers(c)
    header_bottom_mm = draw_header(c)

    rules_top_mm = FOOTER_HEIGHT + RULES_HEIGHT
    zone_top_mm = header_bottom_mm - 6.0
    zone_bottom_mm = rules_top_mm + 4.0

    if mode == "linien":
        draw_writing_zone_lines(c, zone_top_mm, zone_bottom_mm)
    elif mode == "kaestchen":
        draw_writing_zone_boxes(c, zone_top_mm, zone_bottom_mm)
    else:
        raise ValueError("mode muss 'linien' oder 'kaestchen' sein")

    draw_write_rules(c, rules_top_mm)
    draw_footer(c)

    c.showPage()
    c.save()
    print(f"Erstellt: {filename}")


# ---------------------------------------------------------------------------
# SCAN-ANLEITUNG
# ---------------------------------------------------------------------------
def build_scan_anleitung(filename):
    c = canvas.Canvas(filename, pagesize=A4)
    set_pdf_metadata(c, "GemmPen Scan-Anleitung")
    page_w_mm = PAGE_W / mm
    page_h_mm = PAGE_H / mm

    x0 = MARGIN_SIDE
    x1 = page_w_mm - MARGIN_SIDE
    content_w = x1 - x0

    y = page_h_mm - 20.0

    # Titel
    c.setFont("Helvetica-Bold", 20)
    c.setFillColor(INK_DARK)
    c.drawString(mmv(x0), mmv(y), "So scannst du die Blaetter ein")
    y -= 8.0

    c.setStrokeColor(ACCENT_GOLD)
    c.setLineWidth(1.2)
    c.line(mmv(x0), mmv(y), mmv(x1), mmv(y))
    y -= 10.0

    c.setFont("Helvetica", 10.5)
    c.setFillColor(INK_DARK)
    intro = "Es gibt zwei Wege. Waehle den Weg, der fuer dich einfacher ist."
    c.drawString(mmv(x0), mmv(y), intro)
    y -= 12.0

    def wrap_text(text, font, size, max_width_mm):
        """Einfacher Zeilenumbruch anhand der Textbreite."""
        words = text.split()
        lines = []
        current = ""
        for word in words:
            trial = (current + " " + word).strip()
            if canvas_string_width(trial, font, size) <= mmv(max_width_mm):
                current = trial
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return lines

    def canvas_string_width(text, font, size):
        return c.stringWidth(text, font, size)

    def draw_paragraph(items, y_pos, indent=0.0, bullet=False,
                        font="Helvetica", size=10, line_h=5.2, gap_after=3.0):
        for item in items:
            lines = wrap_text(item, font, size, content_w - indent)
            for i, line in enumerate(lines):
                prefix = ""
                if bullet and i == 0:
                    prefix = "- "
                c.setFont(font, size)
                c.setFillColor(INK_DARK)
                c.drawString(mmv(x0 + indent), mmv(y_pos), prefix + line)
                y_pos -= line_h
            y_pos -= gap_after
        return y_pos

    # --- Weg 1: Handyfoto ---
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(ACCENT_GOLD)
    c.drawString(mmv(x0), mmv(y), "Weg 1: Foto mit dem Handy")
    y -= 7.5

    handy_punkte = [
        "Halte das Handy genau parallel ueber das Blatt. Nicht schraeg fotografieren.",
        "Sorge fuer gutes Licht. Am besten Tageslicht oder eine helle Lampe, ohne Schatten auf dem Blatt.",
        "Das ganze Blatt muss im Bild sein. Alle vier runden Punkte in den Ecken muessen gut sichtbar sein.",
        "Mache ein Foto pro Blatt. Nicht mehrere Blaetter zusammen fotografieren.",
    ]
    y = draw_paragraph(handy_punkte, y, indent=3.0, bullet=True)
    y -= 4.0

    # --- Weg 2: Scanner ---
    c.setFont("Helvetica-Bold", 13)
    c.setFillColor(ACCENT_GOLD)
    c.drawString(mmv(x0), mmv(y), "Weg 2: Scanner am Drucker")
    y -= 7.5

    scanner_punkte = [
        "Nutze die Scan-Funktion an deinem Drucker.",
        "Stelle die Aufloesung auf 300 dpi ein, falls du das einstellen kannst.",
        "Speichere das Ergebnis als PDF-Datei, zum Beispiel auf einem USB-Stick.",
        "Du darfst mehrere Blaetter zusammen in den Stapeleinzug legen, wenn dein Drucker das kann.",
    ]
    y = draw_paragraph(scanner_punkte, y, indent=3.0, bullet=True)
    y -= 6.0

    # --- Trennlinie ---
    c.setStrokeColor(LINE_GREY)
    c.setLineWidth(0.6)
    c.line(mmv(x0), mmv(y), mmv(x1), mmv(y))
    y -= 8.0

    # --- Hinweis-Box ---
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(INK_DARK)
    c.drawString(mmv(x0), mmv(y), "Gut zu wissen")
    y -= 7.0

    hinweise = [
        "Beide Wege funktionieren gut. Wichtig ist nur, dass das ganze Blatt mit allen vier Eckpunkten zu sehen ist.",
        "Ein unscharfes oder schraeges Foto ist meistens trotzdem in Ordnung. Bei Problemen einfach ein neues Foto machen.",
    ]
    y = draw_paragraph(hinweise, y, indent=0.0, bullet=False, size=10)

    c.showPage()
    c.save()
    print(f"Erstellt: {filename}")


if __name__ == "__main__":
    import os
    out_dir = os.path.dirname(os.path.abspath(__file__))

    build_vorlage(os.path.join(out_dir, "vorlage-linien.pdf"), mode="linien")
    build_vorlage(os.path.join(out_dir, "vorlage-kaestchen.pdf"), mode="kaestchen")
    build_scan_anleitung(os.path.join(out_dir, "scan-anleitung.pdf"))

    print("Fertig. Alle drei PDFs liegen in:", out_dir)
