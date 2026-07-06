#!/usr/bin/env python3
"""
make_test_data.py

Erzeugt Testdaten fuer das Ingest (AP2) aus der Scan-Vorlage:

1. Rendert public/templates/vorlage-linien.pdf zu einem Seitenbild und
   malt einen Handschrift-Platzhalter (grobe Wellenlinien) in die Schreibzone
   sowie Beispieltext (Aufgaben-Code, Kuerzel) in die Kopfzeile.
2. Baut daraus drei perspektivisch verzerrte "Handyfotos" (unterschiedliche
   Neigung und leichte Drehung), damit die Entzerrung geprueft werden kann.
3. Baut ein mehrseitiges "Scanner-PDF" (mehrere Blaetter, gerade), das einen
   Stapel mehrerer Schueler simuliert.

Ausfuehren:
    pip install pdf2image pillow numpy --break-system-packages
    sudo apt-get install poppler-utils   # fuer pdf2image (pdftoppm)
    python3 test/make_test_data.py

Ergebnis liegt in test/fixtures/.
"""

import os
import numpy as np
from PIL import Image, ImageDraw
from pdf2image import convert_from_path

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TEMPLATE_PDF = os.path.join(ROOT, "public", "templates", "vorlage-linien.pdf")
OUT_DIR = os.path.join(HERE, "fixtures")

# A4 Seitenverhaeltnis (210 x 297 mm)
PAGE_W_MM = 210
PAGE_H_MM = 297


def render_template_page(dpi=200):
    """Rendert die erste Seite der Vorlage als RGB-Bild."""
    images = convert_from_path(TEMPLATE_PDF, dpi=dpi)
    return images[0].convert("RGB")


def add_placeholder_writing(img, code="AIWORK01", kuerzel="AB12"):
    """
    Malt Handschrift-Platzhalter (Wellenlinien) in die Schreibzone und
    Beispieltext in die Kopfzeile. Bleibt bewusst innerhalb der Marker.
    """
    draw = ImageDraw.Draw(img)
    w, h = img.size
    pxmm_x = w / PAGE_W_MM
    pxmm_y = h / PAGE_H_MM

    # Kopfzeile: Aufgaben-Code und Kuerzel als "handschriftliche" Buchstaben.
    header_y = int(20 * pxmm_y)
    draw.text((int(35 * pxmm_x), header_y), code, fill=(20, 30, 90))
    draw.text((int(150 * pxmm_x), header_y), kuerzel, fill=(20, 30, 90))

    # Schreibzone: ein paar Wellenlinien als Handschrift-Ersatz.
    top = int(55 * pxmm_y)
    bottom = int(270 * pxmm_y)
    left = int(25 * pxmm_x)
    right = int(185 * pxmm_x)
    line_gap = int(12 * pxmm_y)
    rng = np.random.default_rng(7)
    y = top
    while y < bottom:
        xs = np.linspace(left, right - rng.integers(0, int(40 * pxmm_x)), 200)
        ys = y + 3 * pxmm_y * np.sin(xs / (8 * pxmm_x)) + rng.normal(0, 0.6, xs.shape)
        pts = list(zip(xs.tolist(), ys.tolist()))
        draw.line(pts, fill=(25, 35, 80), width=max(1, int(0.5 * pxmm_x)))
        y += line_gap
    return img


def warp_photo(img, corners_dst, out_size, bg=(60, 55, 48)):
    """
    Perspektivische Verzerrung: bildet die vier Bildecken auf corners_dst
    (in Pixeln des Ausgabebildes) ab. Simuliert ein schraeges Handyfoto.
    corners_dst: [(x,y) TL, TR, BR, BL]
    """
    W, H = img.size
    src = [(0, 0), (W, 0), (W, H), (0, H)]

    # PIL braucht die Koeffizienten der inversen Abbildung (Ziel -> Quelle).
    coeffs = _perspective_coeffs(corners_dst, src)
    out = img.transform(
        out_size, Image.PERSPECTIVE, coeffs, resample=Image.BICUBIC, fillcolor=bg
    )
    return out


def _perspective_coeffs(dst, src):
    """
    Loest die 8 Perspektiv-Koeffizienten fuer PIL.
    dst: Zielpunkte (im Ausgabebild), src: entsprechende Quellpunkte.
    """
    matrix = []
    for (xd, yd), (xs, ys) in zip(dst, src):
        matrix.append([xd, yd, 1, 0, 0, 0, -xs * xd, -xs * yd])
        matrix.append([0, 0, 0, xd, yd, 1, -ys * xd, -ys * yd])
    A = np.array(matrix, dtype=np.float64)
    B = np.array(src, dtype=np.float64).reshape(8)
    res = np.linalg.solve(A, B)
    return res.tolist()


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print("Rendere Vorlage ...")
    base = render_template_page(dpi=200)

    # Grundblatt mit Platzhalter-Handschrift.
    page = add_placeholder_writing(base.copy(), code="AIWORK01", kuerzel="AB12")
    page.save(os.path.join(OUT_DIR, "sheet_flat.png"))

    W, H = page.size

    # --- Drei schraege Fotos ---
    out_w, out_h = int(W * 1.15), int(H * 1.15)
    margin_x = int(W * 0.07)
    margin_y = int(H * 0.07)

    variants = {
        # leichte Drehung + Neigung nach rechts
        "photo_skew_1": [
            (margin_x + 40, margin_y + 10),
            (out_w - margin_x - 5, margin_y + 60),
            (out_w - margin_x - 40, out_h - margin_y - 20),
            (margin_x + 10, out_h - margin_y - 55),
        ],
        # Neigung nach links
        "photo_skew_2": [
            (margin_x + 5, margin_y + 55),
            (out_w - margin_x - 45, margin_y + 5),
            (out_w - margin_x - 10, out_h - margin_y - 50),
            (margin_x + 45, out_h - margin_y - 5),
        ],
        # staerkere Trapezverzerrung (von schraeg oben)
        "photo_skew_3": [
            (margin_x + 70, margin_y + 20),
            (out_w - margin_x - 70, margin_y + 20),
            (out_w - margin_x - 10, out_h - margin_y - 15),
            (margin_x + 10, out_h - margin_y - 15),
        ],
    }

    for name, dst in variants.items():
        photo = warp_photo(page, dst, (out_w, out_h))
        photo.save(os.path.join(OUT_DIR, name + ".jpg"), quality=88)
        print("Foto geschrieben:", name)

    # --- Mehrseitiges Scanner-PDF (Stapel mehrerer Schueler) ---
    scan_pages = []
    for code, kuerzel in [("AIWORK01", "AB12"), ("AIWORK01", "CD34"), ("AIWORK01", "EF56")]:
        p = add_placeholder_writing(base.copy(), code=code, kuerzel=kuerzel)
        # Scanner-Seiten sind gerade; leichtes Rauschen simulieren.
        arr = np.array(p).astype(np.int16)
        arr += np.random.default_rng(1).integers(-6, 6, arr.shape, dtype=np.int16)
        arr = np.clip(arr, 0, 255).astype(np.uint8)
        scan_pages.append(Image.fromarray(arr))

    pdf_path = os.path.join(OUT_DIR, "scan_multi.pdf")
    scan_pages[0].save(
        pdf_path, save_all=True, append_images=scan_pages[1:], resolution=200
    )
    print("Scanner-PDF geschrieben:", pdf_path, f"({len(scan_pages)} Seiten)")

    print("\nFertig. Fixtures in:", OUT_DIR)


if __name__ == "__main__":
    main()
