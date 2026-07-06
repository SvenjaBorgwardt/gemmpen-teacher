/*
  Marker-Erkennung auf Rohpixeln (kein OpenCV, keine native Abhaengigkeit).

  Idee:
  1. Graustufen + Otsu-Schwelle -> dunkle Pixel.
  2. In jeder der vier Bildecken (Suchfenster) die dunklen zusammenhaengenden
     Flecken (Blobs) finden, per Groesse und Rundheit filtern.
  3. Je Ecke den besten kreisrunden Blob nehmen; sein Zentroid ist der
     Marker-Mittelpunkt. Der helle Innenpunkt verfeinert ihn zusaetzlich.
  4. Aus den vier Kandidaten die Orientierung ableiten: die Ecke, neben
     deren Kreis rechts ein kleines dunkles Quadrat sitzt, ist oben-links.
  5. Vier geordnete Ecken zurueckgeben (oben-links, oben-rechts,
     unten-rechts, unten-links) in Bildkoordinaten.

  Robust genug fuer Handyfotos (leichte Drehung, Perspektive, Schatten).
  Findet die App keine vier plausiblen Marker, meldet sie das an die UI,
  die dann das Bild unveraendert uebernimmt.
*/

import type { Point, Quad } from "./geometry";
import { distance, orderCorners } from "./geometry";
import { toGray, otsuThreshold, meanGray, type RasterImage, type GrayImage } from "./raster";
import {
  MARKER_DIAMETER_MM,
  ASYM_SQUARE_SIZE_MM,
  ASYM_SQUARE_GAP_MM,
  MARKER_RADIUS_MM,
  PAGE_W_MM,
} from "./marker-geometry";

interface Blob {
  centroid: Point;
  area: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MarkerDetection {
  /** Vier geordnete Eckpunkte in Bildkoordinaten. */
  corners: Quad;
  /** Wurde das Asymmetrie-Quadrat gefunden (Orientierung sicher)? */
  orientationConfident: boolean;
  /** Geschaetzte Marker-Groesse in Pixeln (Durchmesser), fuer Diagnose. */
  markerDiameterPx: number;
}

/**
 * Findet dunkle Blobs innerhalb eines Fensters [x0,x1) x [y0,y1) eines
 * bereits binarisierten Bildes (dark = true). Flood-Fill, 4er-Nachbarschaft.
 */
function findBlobs(
  dark: Uint8Array,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  minArea: number,
  maxArea: number,
): Blob[] {
  const visited = new Uint8Array((x1 - x0) * (y1 - y0));
  const localW = x1 - x0;
  const blobs: Blob[] = [];
  const stackX: number[] = [];
  const stackY: number[] = [];

  for (let sy = y0; sy < y1; sy++) {
    for (let sx = x0; sx < x1; sx++) {
      const li = (sy - y0) * localW + (sx - x0);
      if (visited[li]) continue;
      if (!dark[sy * width + sx]) {
        visited[li] = 1;
        continue;
      }
      // Neuer Blob, Flood-Fill
      let area = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = sx;
      let maxX = sx;
      let minY = sy;
      let maxY = sy;
      stackX.length = 0;
      stackY.length = 0;
      stackX.push(sx);
      stackY.push(sy);
      visited[li] = 1;
      while (stackX.length) {
        const cx = stackX.pop() as number;
        const cy = stackY.pop() as number;
        area++;
        sumX += cx;
        sumY += cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        const neigh: Array<[number, number]> = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of neigh) {
          if (nx < x0 || nx >= x1 || ny < y0 || ny >= y1) continue;
          const nli = (ny - y0) * localW + (nx - x0);
          if (visited[nli]) continue;
          visited[nli] = 1;
          if (dark[ny * width + nx]) {
            stackX.push(nx);
            stackY.push(ny);
          }
        }
      }
      if (area >= minArea && area <= maxArea) {
        blobs.push({
          centroid: { x: sumX / area, y: sumY / area },
          area,
          minX,
          maxX,
          minY,
          maxY,
        });
      }
    }
  }
  return blobs;
}

/** Rundheit 0..1: wie sehr fuellt der Blob seine Bounding-Box wie ein Kreis (pi/4 ~ 0.785). */
function roundness(blob: Blob): number {
  const w = blob.maxX - blob.minX + 1;
  const h = blob.maxY - blob.minY + 1;
  const boxArea = w * h;
  if (boxArea === 0) return 0;
  const fill = blob.area / boxArea; // Kreis ~ 0.785
  const aspect = Math.min(w, h) / Math.max(w, h); // Kreis ~ 1
  // Score belohnt fuellgrad nahe 0.785 und aspect nahe 1
  const fillScore = 1 - Math.min(1, Math.abs(fill - Math.PI / 4) / (Math.PI / 4));
  return fillScore * aspect;
}

/**
 * Sucht in einer Bildecke den besten kreisrunden dunklen Blob.
 * quadrant: welcher Bildbereich abgesucht wird.
 */
function detectMarkerInCorner(
  dark: Uint8Array,
  gray: GrayImage,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  expectedDiaPx: number,
): Blob | null {
  const minArea = Math.max(6, Math.pow(expectedDiaPx * 0.4, 2) * (Math.PI / 4));
  const maxArea = Math.pow(expectedDiaPx * 2.2, 2) * (Math.PI / 4);
  const blobs = findBlobs(dark, gray.width, x0, y0, x1, y1, minArea, maxArea);
  if (blobs.length === 0) return null;

  let best: Blob | null = null;
  let bestScore = -1;
  for (const blob of blobs) {
    const r = roundness(blob);
    if (r < 0.55) continue;
    // Der echte Marker hat einen hellen Innenpunkt: Mitte heller als Ring.
    const centerBright = meanGray(gray, blob.centroid.x, blob.centroid.y, 1);
    const ringDark = meanGray(gray, blob.centroid.x, blob.centroid.y, (blob.maxX - blob.minX) / 3);
    const innerBonus = centerBright > ringDark + 20 ? 0.25 : 0;
    // Groesse nahe erwartet ist gut
    const dia = (blob.maxX - blob.minX + blob.maxY - blob.minY) / 2;
    const sizeScore = 1 - Math.min(1, Math.abs(dia - expectedDiaPx) / expectedDiaPx);
    const score = r + innerBonus + sizeScore * 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = blob;
    }
  }
  return best;
}

/**
 * Prueft, ob rechts (oder in einer der vier Richtungen) neben einem
 * Marker-Kreis ein kleines dunkles Quadrat sitzt (Asymmetrie-Merkmal
 * oben links). Gibt die Richtung zurueck, in der es liegt, oder null.
 */
function findAsymSquareDirection(
  dark: Uint8Array,
  width: number,
  height: number,
  center: Point,
  markerRadiusPx: number,
): "right" | "left" | "up" | "down" | null {
  const pxPerMm = markerRadiusPx / MARKER_RADIUS_MM;
  const gap = ASYM_SQUARE_GAP_MM * pxPerMm;
  const sq = ASYM_SQUARE_SIZE_MM * pxPerMm;
  // Mittelpunkt des Quadrats liegt Kreisrand + gap + halbe Quadratseite entfernt
  const dist = markerRadiusPx + gap + sq / 2;

  const dirs: Array<{ name: "right" | "left" | "up" | "down"; dx: number; dy: number }> = [
    { name: "right", dx: 1, dy: 0 },
    { name: "left", dx: -1, dy: 0 },
    { name: "up", dx: 0, dy: -1 },
    { name: "down", dx: 0, dy: 1 },
  ];

  let bestDir: "right" | "left" | "up" | "down" | null = null;
  let bestFill = 0.35; // Mindestfuellung, damit Rauschen nicht triggert
  for (const d of dirs) {
    const qx = center.x + d.dx * dist;
    const qy = center.y + d.dy * dist;
    // Fuellgrad in einem Fenster in Quadratgroesse messen
    const half = sq / 2;
    let filled = 0;
    let total = 0;
    for (let y = Math.floor(qy - half); y <= Math.ceil(qy + half); y++) {
      for (let x = Math.floor(qx - half); x <= Math.ceil(qx + half); x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        total++;
        if (dark[y * width + x]) filled++;
      }
    }
    if (total === 0) continue;
    const fill = filled / total;
    if (fill > bestFill) {
      bestFill = fill;
      bestDir = d.name;
    }
  }
  return bestDir;
}

/**
 * Erkennt die vier Eckmarker in einem Foto und liefert geordnete Ecken.
 * Gibt null zurueck, wenn nicht vier plausible Marker gefunden werden.
 */
export function detectMarkers(img: RasterImage): MarkerDetection | null {
  const gray = toGray(img);
  const threshold = otsuThreshold(gray);
  const dark = new Uint8Array(gray.width * gray.height);
  for (let i = 0; i < dark.length; i++) {
    dark[i] = gray.data[i] < threshold ? 1 : 0;
  }

  // Erwartete Markergroesse in Pixeln: aus Blattbreite geschaetzt.
  // Das Blatt fuellt grob das Bild; MARKER_DIAMETER_MM von PAGE_W_MM.
  const expectedDiaPx = (MARKER_DIAMETER_MM / PAGE_W_MM) * img.width;

  // Vier Suchfenster (je knapp ein Drittel der jeweiligen Achse), damit
  // auch bei leichter Drehung der Marker im Fenster liegt.
  const winW = Math.floor(img.width * 0.34);
  const winH = Math.floor(img.height * 0.34);

  const corners = [
    { name: "TL", x0: 0, y0: 0, x1: winW, y1: winH },
    { name: "TR", x0: img.width - winW, y0: 0, x1: img.width, y1: winH },
    { name: "BR", x0: img.width - winW, y0: img.height - winH, x1: img.width, y1: img.height },
    { name: "BL", x0: 0, y0: img.height - winH, x1: winW, y1: img.height },
  ];

  const found: Blob[] = [];
  for (const c of corners) {
    const blob = detectMarkerInCorner(dark, gray, c.x0, c.y0, c.x1, c.y1, expectedDiaPx);
    if (!blob) return null;
    found.push(blob);
  }

  const centers = found.map((b) => b.centroid);
  const dias = found.map((b) => (b.maxX - b.minX + b.maxY - b.minY) / 2);
  const meanDia = dias.reduce((a, b) => a + b, 0) / dias.length;
  const markerRadiusPx = meanDia / 2;

  // Plausibilitaet: die vier Punkte muessen ein grosses konvexes Viereck
  // bilden (nicht alle nah beieinander).
  const bbW = Math.max(...centers.map((p) => p.x)) - Math.min(...centers.map((p) => p.x));
  const bbH = Math.max(...centers.map((p) => p.y)) - Math.min(...centers.map((p) => p.y));
  if (bbW < img.width * 0.4 || bbH < img.height * 0.4) return null;

  // Asymmetrie-Merkmal suchen: an welchem Marker liegt das Quadrat, und
  // in welche Richtung? Damit rotieren wir die Zuordnung so, dass dieser
  // Marker "oben links" wird und das Quadrat "rechts" von ihm liegt.
  let orientationConfident = false;
  let asymIndex = -1;
  let asymDir: "right" | "left" | "up" | "down" | null = null;
  for (let i = 0; i < found.length; i++) {
    const dir = findAsymSquareDirection(
      dark,
      gray.width,
      gray.height,
      centers[i],
      markerRadiusPx,
    );
    if (dir) {
      asymIndex = i;
      asymDir = dir;
      orientationConfident = true;
      break;
    }
  }

  let quad: Quad;
  if (orientationConfident && asymIndex >= 0 && asymDir) {
    // Wir haben den Marker oben-links (asymIndex) und die Richtung zum
    // Quadrat (= die Richtung "nach oben-rechts entlang der oberen Kante").
    // Die drei anderen Marker relativ dazu einordnen.
    quad = orderByAsymmetry(centers, asymIndex, asymDir);
  } else {
    // Ohne Asymmetrie: geometrisch ordnen (Summe/Differenz der Koordinaten).
    quad = orderCorners(centers);
  }

  return { corners: quad, orientationConfident, markerDiameterPx: meanDia };
}

/**
 * Ordnet die vier Marker anhand des Asymmetrie-Markers.
 * asymIndex ist der Marker oben-links, asymDir zeigt entlang der oberen
 * Kante Richtung oben-rechts.
 */
function orderByAsymmetry(
  centers: Point[],
  asymIndex: number,
  asymDir: "right" | "left" | "up" | "down",
): Quad {
  const topLeft = centers[asymIndex];
  const others = centers.filter((_, i) => i !== asymIndex);

  // Einheitsvektor entlang der oberen Kante (Richtung oben-rechts)
  const along =
    asymDir === "right"
      ? { x: 1, y: 0 }
      : asymDir === "left"
        ? { x: -1, y: 0 }
        : asymDir === "up"
          ? { x: 0, y: -1 }
          : { x: 0, y: 1 };
  // Senkrechte dazu, Richtung unten-links (90 Grad im Uhrzeigersinn in
  // Bildkoordinaten, y nach unten): rotiere (x,y) -> (-y, x)
  const down = { x: -along.y, y: along.x };

  // Projiziere die drei anderen Punkte auf along und down (relativ topLeft).
  const scored = others.map((p) => {
    const rx = p.x - topLeft.x;
    const ry = p.y - topLeft.y;
    return {
      p,
      alongProj: rx * along.x + ry * along.y,
      downProj: rx * down.x + ry * down.y,
    };
  });

  // topRight: grosser alongProj, kleiner downProj
  // bottomLeft: kleiner alongProj, grosser downProj
  // bottomRight: gross in beidem
  const topRight = [...scored].sort(
    (a, b) => b.alongProj - a.alongProj + (a.downProj - b.downProj),
  )[0].p;
  const bottomLeft = [...scored].sort(
    (a, b) => b.downProj - a.downProj + (a.alongProj - b.alongProj),
  )[0].p;
  const bottomRight = scored.find((s) => s.p !== topRight && s.p !== bottomLeft)!.p;

  return { topLeft, topRight, bottomRight, bottomLeft };
}

/** Diagnose-Helfer: mittlere Kantenlaenge des erkannten Vierecks. */
export function quadSize(q: Quad): number {
  return (
    (distance(q.topLeft, q.topRight) +
      distance(q.topRight, q.bottomRight) +
      distance(q.bottomRight, q.bottomLeft) +
      distance(q.bottomLeft, q.topLeft)) /
    4
  );
}
