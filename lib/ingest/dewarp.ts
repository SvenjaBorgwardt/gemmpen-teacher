/*
  Entzerrung (Dewarp) und Zuschnitt auf die Schreibzone.

  Ablauf:
  1. Marker erkennen (markers.ts).
  2. Die vier Marker-Mittelpunkte werden auf ihre bekannten Sollpositionen
     im entzerrten Zielbild abgebildet (Homographie).
  3. Das ganze Blatt wird in eine feste mm-Rasterung entzerrt.
  4. Aus dem entzerrten Blatt werden Schreibzone und Kopfzeile in mm
     ausgeschnitten (deterministisch, da nun mm bekannt).

  Ergebnis ist rein datenbasiert (RasterImage), das Speichern als Datei
  passiert in node-image.ts / der API-Route.
*/

import { computeHomography, type Point, type Quad } from "./geometry";
import { warpPerspective, cropRect, type RasterImage } from "./raster";
import { detectMarkers } from "./markers";
import {
  PAGE_W_MM,
  PAGE_H_MM,
  MARKER_CENTERS_MM,
  OUTPUT_PX_PER_MM,
  HEADER_TOP_MM,
  HEADER_BOTTOM_MM,
  WRITE_ZONE_TOP_MM,
  WRITE_ZONE_BOTTOM_MM,
  WRITE_ZONE_LEFT_MM,
  WRITE_ZONE_RIGHT_MM,
} from "./marker-geometry";

export interface DewarpResult {
  /** Wurde die Vorlage (vier Marker) erkannt? */
  templateDetected: boolean;
  /** Orientierung ueber das Asymmetrie-Quadrat sicher bestimmt? */
  orientationConfident: boolean;
  /** Entzerrtes und auf die Schreibzone zugeschnittenes Blattbild. */
  page: RasterImage;
  /** Ausschnitt der Kopfzeile (Aufgaben-Code, Kuerzel, Blattnummer). */
  header: RasterImage;
  /** Die erkannten Ecken im Originalbild (falls vorhanden), fuer Diagnose. */
  detectedCorners?: Quad;
}

const mm = (v: number) => Math.round(v * OUTPUT_PX_PER_MM);

/**
 * Entzerrt ein Foto der Vorlage anhand der Eckmarker und schneidet auf die
 * Schreibzone zu. Findet die Erkennung keine Marker, wird das Bild
 * unveraendert (nur auf die Kopfzeile per Anteil geschaetzt) uebernommen
 * und templateDetected = false gesetzt.
 */
export function dewarpPhoto(img: RasterImage): DewarpResult {
  const detection = detectMarkers(img);

  if (!detection) {
    return fallbackNoMarkers(img);
  }

  // Ziel: ganzes Blatt in mm-Raster. Marker-Sollpositionen in Pixeln.
  const fullW = mm(PAGE_W_MM);
  const fullH = mm(PAGE_H_MM);

  const src: Point[] = [
    detection.corners.topLeft,
    detection.corners.topRight,
    detection.corners.bottomRight,
    detection.corners.bottomLeft,
  ];
  const dst: Point[] = [
    { x: mm(MARKER_CENTERS_MM.topLeft.x), y: mm(MARKER_CENTERS_MM.topLeft.y) },
    { x: mm(MARKER_CENTERS_MM.topRight.x), y: mm(MARKER_CENTERS_MM.topRight.y) },
    { x: mm(MARKER_CENTERS_MM.bottomRight.x), y: mm(MARKER_CENTERS_MM.bottomRight.y) },
    { x: mm(MARKER_CENTERS_MM.bottomLeft.x), y: mm(MARKER_CENTERS_MM.bottomLeft.y) },
  ];

  // Fuer warpPerspective brauchen wir Ziel -> Quelle. Also Homographie
  // von dst (Ziel) nach src (Quelle) berechnen.
  const dstToSrc = computeHomography(dst, src);
  const fullPage = warpPerspective(img, dstToSrc, fullW, fullH);

  // Aus dem entzerrten Blatt Schreibzone und Kopfzeile in mm ausschneiden.
  const page = cropRect(
    fullPage,
    mm(WRITE_ZONE_LEFT_MM),
    mm(WRITE_ZONE_TOP_MM),
    mm(WRITE_ZONE_RIGHT_MM - WRITE_ZONE_LEFT_MM),
    mm(WRITE_ZONE_BOTTOM_MM - WRITE_ZONE_TOP_MM),
  );
  const header = cropRect(
    fullPage,
    mm(WRITE_ZONE_LEFT_MM),
    mm(HEADER_TOP_MM),
    mm(WRITE_ZONE_RIGHT_MM - WRITE_ZONE_LEFT_MM),
    mm(HEADER_BOTTOM_MM - HEADER_TOP_MM),
  );

  return {
    templateDetected: true,
    orientationConfident: detection.orientationConfident,
    page,
    header,
    detectedCorners: detection.corners,
  };
}

/**
 * Scanner-Seiten sind bereits gerade. Wir versuchen trotzdem, die Marker
 * zu finden und dann sauber zuzuschneiden. Gelingt das nicht, nehmen wir
 * die Seite unveraendert und schaetzen die Kopfzeile proportional.
 */
export function dewarpScannerPage(img: RasterImage): DewarpResult {
  const detection = detectMarkers(img);
  if (detection) {
    // Gleiche Entzerrung wie beim Foto (schadet nicht, korrigiert leichten Schieflauf).
    return dewarpPhoto(img);
  }
  return fallbackNoMarkers(img);
}

/**
 * Fallback ohne Marker: Bild bleibt inhaltlich unveraendert. Die Kopfzeile
 * wird proportional aus dem oberen Bildbereich geschaetzt (Anteil wie im
 * Vorlagenlayout), damit AP3 trotzdem einen Kopfzeilen-Ausschnitt hat.
 */
function fallbackNoMarkers(img: RasterImage): DewarpResult {
  const headerTopFrac = HEADER_TOP_MM / PAGE_H_MM;
  const headerBottomFrac = HEADER_BOTTOM_MM / PAGE_H_MM;
  const header = cropRect(
    img,
    0,
    Math.round(img.height * headerTopFrac),
    img.width,
    Math.round(img.height * (headerBottomFrac - headerTopFrac)),
  );
  return {
    templateDetected: false,
    orientationConfident: false,
    page: img,
    header,
  };
}
