/*
  Node-seitige Bild-Ein- und Ausgabe fuer das Ingest.
  Nur serverseitig verwenden (nutzt sharp). Nicht in Client-Komponenten importieren.

  sharp ist ohnehin als Next.js-Abhaengigkeit vorhanden und dekodiert
  jpg, png und (mit libheif) heic. Das haelt das Ingest ohne zusaetzliche
  native Abhaengigkeiten.
*/

import sharp from "sharp";
import type { RasterImage } from "./raster";

/** Dekodiert einen Bildpuffer (jpg/png/heic) in ein RGBA-RasterImage. */
export async function decodeImage(buffer: Buffer): Promise<RasterImage> {
  const { data, info } = await sharp(buffer)
    .rotate() // EXIF-Orientierung anwenden
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}

/** Kodiert ein RasterImage als PNG-Puffer. */
export async function encodePng(img: RasterImage): Promise<Buffer> {
  return sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.byteLength), {
    raw: { width: img.width, height: img.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

/**
 * Verkleinert ein RasterImage vor der Marker-Erkennung, falls es sehr gross
 * ist. Marker-Erkennung braucht keine volle Aufloesung; kleiner ist schneller.
 * Gibt Bild und Skalierungsfaktor (rel. zum Original) zurueck.
 */
export async function downscaleForDetection(
  buffer: Buffer,
  maxSide = 1600,
): Promise<{ image: RasterImage; scale: number; originalWidth: number; originalHeight: number }> {
  const meta = await sharp(buffer).metadata();
  const ow = meta.width ?? 0;
  const oh = meta.height ?? 0;
  const longest = Math.max(ow, oh);
  const scale = longest > maxSide ? maxSide / longest : 1;

  let pipeline = sharp(buffer).rotate().ensureAlpha();
  if (scale < 1) {
    pipeline = pipeline.resize({ width: Math.round(ow * scale) });
  }
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  return {
    image: {
      width: info.width,
      height: info.height,
      data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    },
    scale,
    originalWidth: ow,
    originalHeight: oh,
  };
}
