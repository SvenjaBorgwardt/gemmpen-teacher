/*
  Rasterbild-Typen und pixelnahe Helfer fuer das Ingest.
  Bewusst frei von Browser- und Node-Abhaengigkeiten, damit die
  Marker-Erkennung und Entzerrung in jedem Umfeld testbar ist.

  Ein RasterImage ist ein RGBA-Puffer (vier Byte je Pixel), so wie ihn
  sowohl ein Canvas (getImageData) als auch sharp/PIL liefern koennen.
*/

import type { Point } from "./geometry";
import { applyHomography } from "./geometry";

export interface RasterImage {
  width: number;
  height: number;
  /** RGBA, Laenge = width * height * 4. */
  data: Uint8ClampedArray;
}

/** Graustufen-Puffer (ein Byte je Pixel, 0 = schwarz, 255 = weiss). */
export interface GrayImage {
  width: number;
  height: number;
  data: Uint8Array;
}

/** Wandelt ein RGBA-Bild in Graustufen (Luminanz). */
export function toGray(img: RasterImage): GrayImage {
  const { width, height, data } = img;
  const out = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    // Rec. 601 Luminanz
    out[i] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
  }
  return { width, height, data: out };
}

/**
 * Otsu-Schwellwert: findet einen globalen Grenzwert, der dunkle von hellen
 * Pixeln trennt. Robust gegen unterschiedliche Belichtung.
 */
export function otsuThreshold(gray: GrayImage): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of gray.data) hist[v]++;
  const total = gray.data.length;

  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0;
  let wB = 0;
  let maxVar = -1;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

/**
 * Erzeugt ein neues, entzerrtes RGBA-Bild in der Zielgroesse.
 * Fuer jeden Ziel-Pixel wird per invers-Homographie der Quellort bestimmt
 * und bilinear abgetastet. h bildet Quelle -> Ziel ab; hier wird die
 * Ruecktransformation Ziel -> Quelle gebraucht, sie wird uebergeben.
 */
export function warpPerspective(
  src: RasterImage,
  dstToSrc: number[],
  outWidth: number,
  outHeight: number,
): RasterImage {
  const out = new Uint8ClampedArray(outWidth * outHeight * 4);
  const { width: sw, height: sh, data: sd } = src;

  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      const s = applyHomography(dstToSrc, { x, y });
      const oi = (y * outWidth + x) * 4;
      if (s.x < 0 || s.y < 0 || s.x > sw - 1 || s.y > sh - 1) {
        // Ausserhalb des Quellbilds: Papierweiss
        out[oi] = 250;
        out[oi + 1] = 246;
        out[oi + 2] = 239;
        out[oi + 3] = 255;
        continue;
      }
      const x0 = Math.floor(s.x);
      const y0 = Math.floor(s.y);
      const x1 = Math.min(x0 + 1, sw - 1);
      const y1 = Math.min(y0 + 1, sh - 1);
      const fx = s.x - x0;
      const fy = s.y - y0;
      for (let c = 0; c < 4; c++) {
        const p00 = sd[(y0 * sw + x0) * 4 + c];
        const p10 = sd[(y0 * sw + x1) * 4 + c];
        const p01 = sd[(y1 * sw + x0) * 4 + c];
        const p11 = sd[(y1 * sw + x1) * 4 + c];
        const top = p00 * (1 - fx) + p10 * fx;
        const bot = p01 * (1 - fx) + p11 * fx;
        out[oi + c] = top * (1 - fy) + bot * fy;
      }
    }
  }
  return { width: outWidth, height: outHeight, data: out };
}

/** Schneidet ein rechteckiges Fenster aus einem RGBA-Bild aus (Pixelkoordinaten). */
export function cropRect(
  img: RasterImage,
  left: number,
  top: number,
  cropWidth: number,
  cropHeight: number,
): RasterImage {
  const l = Math.max(0, Math.round(left));
  const t = Math.max(0, Math.round(top));
  const w = Math.min(img.width - l, Math.round(cropWidth));
  const h = Math.min(img.height - t, Math.round(cropHeight));
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcStart = ((t + y) * img.width + l) * 4;
    const dstStart = y * w * 4;
    out.set(img.data.subarray(srcStart, srcStart + w * 4), dstStart);
  }
  return { width: w, height: h, data: out };
}

/** Kleiner Helfer: mittlere Helligkeit eines rechteckigen Fensters in einem Graustufenbild. */
export function meanGray(
  gray: GrayImage,
  cx: number,
  cy: number,
  halfSize: number,
): number {
  let sum = 0;
  let count = 0;
  const x0 = Math.max(0, Math.floor(cx - halfSize));
  const x1 = Math.min(gray.width - 1, Math.ceil(cx + halfSize));
  const y0 = Math.max(0, Math.floor(cy - halfSize));
  const y1 = Math.min(gray.height - 1, Math.ceil(cy + halfSize));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      sum += gray.data[y * gray.width + x];
      count++;
    }
  }
  return count === 0 ? 255 : sum / count;
}

export type { Point };
