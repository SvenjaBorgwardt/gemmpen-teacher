/*
  Markergeometrie der Scan-Vorlage (AP1), in Millimetern.
  Quelle der Wahrheit: public/templates/templates_build.py und README.md.
  Diese Werte werden fuer die Erkennung (Suchfenster) und fuer den
  Zielausschnitt (Schreibzone, Kopfzeile) gebraucht.

  DIN A4, Hochformat, 210 x 297 mm.
*/

export const PAGE_W_MM = 210;
export const PAGE_H_MM = 297;

/** Abstand des Kreis-Mittelpunkts zu den zwei angrenzenden Blattkanten. */
export const MARKER_INSET_MM = 15;
/** Aussendurchmesser des gefuellten Kreises. */
export const MARKER_DIAMETER_MM = 8;
export const MARKER_RADIUS_MM = MARKER_DIAMETER_MM / 2;
/** Heller Innenpunkt in der Mitte. */
export const MARKER_INNER_DOT_DIAMETER_MM = 2;
/** Asymmetrie-Quadrat oben links (Kantenlaenge). */
export const ASYM_SQUARE_SIZE_MM = 4;
/** Abstand von der Kreis-Aussenkante zum Asymmetrie-Quadrat. */
export const ASYM_SQUARE_GAP_MM = 3;

/**
 * Marker-Mittelpunkte in mm (X von links, Y von oben), Reihenfolge
 * oben-links, oben-rechts, unten-rechts, unten-links.
 */
export const MARKER_CENTERS_MM = {
  topLeft: { x: MARKER_INSET_MM, y: MARKER_INSET_MM },
  topRight: { x: PAGE_W_MM - MARKER_INSET_MM, y: MARKER_INSET_MM },
  bottomRight: { x: PAGE_W_MM - MARKER_INSET_MM, y: PAGE_H_MM - MARKER_INSET_MM },
  bottomLeft: { x: MARKER_INSET_MM, y: PAGE_H_MM - MARKER_INSET_MM },
} as const;

/*
  Kopfzeile: liegt unterhalb der oberen Marker.
  In templates_build.py:
    HEADER_TOP = 15 mm (Oberkante der Kopfzeile ab oberer Blattkante)
    HEADER_HEIGHT = 25 mm
  Wir schneiden grosszuegig aus, damit die Texterkennung in AP3 sicher
  den Aufgaben-Code, das Schueler-Kuerzel und die Blattnummer erwischt.
*/
export const HEADER_TOP_MM = 12;
export const HEADER_BOTTOM_MM = 40;

/*
  Schreibzone: horizontal 20 mm Rand links/rechts (MARGIN_SIDE),
  vertikal grob von unterhalb der Kopfzeile bis oberhalb der Fusszeile.
  Wir wollen die vier Marker sicher aussen lassen und die Schreibzone
  samt Kopfzeile behalten (Kopfzeile bleibt fuer AP3 im Bild).
*/
export const WRITE_ZONE_TOP_MM = HEADER_TOP_MM;
export const WRITE_ZONE_BOTTOM_MM = PAGE_H_MM - 10;
export const WRITE_ZONE_LEFT_MM = MARKER_INSET_MM - MARKER_RADIUS_MM - 2;
export const WRITE_ZONE_RIGHT_MM = PAGE_W_MM - (MARKER_INSET_MM - MARKER_RADIUS_MM - 2);

/**
 * Zielaufloesung fuer das entzerrte Blatt.
 * Wir rechnen mit einer festen Pixeldichte, damit spaetere Ausschnitte
 * (Kopfzeile) in mm gerechnet werden koennen.
 */
export const OUTPUT_PX_PER_MM = 4; // ~100 dpi, ausreichend fuer Handschrift
