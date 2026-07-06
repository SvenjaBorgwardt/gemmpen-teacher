/*
  Node-Test der Ingest-Kernfunktionen (Marker-Erkennung, Entzerrung, Zuschnitt)
  und des Ablegens in data/submissions/.

  Ausfuehren (siehe test/README.md):
    python3 test/make_test_data.py            # Testdaten erzeugen
    npm run test:ingest                       # diesen Test starten

  Deckt beide Wege ab:
  - Fotos (perspektivisch verzerrt): Marker erkennen, entzerren, zuschneiden.
  - Scanner-PDF-Seiten (gerade, hier als Bilder aus dem PDF): dito.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import sharp from "sharp";
import { detectMarkers, quadSize } from "../lib/ingest/markers";
import { dewarpPhoto, dewarpScannerPage } from "../lib/ingest/dewarp";
import { encodePng } from "../lib/ingest/node-image";
import type { RasterImage } from "../lib/ingest/raster";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, "fixtures");

async function loadRaster(file: string): Promise<RasterImage> {
  const { data, info } = await sharp(file)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
}

async function pdfPagesToRasters(pdfFile: string): Promise<RasterImage[]> {
  // pdftoppm rendert die Seiten; wir lesen sie einzeln mit sharp.
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "gp-pdf-"));
  const prefix = path.join(tmp, "page");
  await run("pdftoppm", ["-png", "-r", "200", pdfFile, prefix]);
  const files = (await fs.readdir(tmp)).filter((f) => f.endsWith(".png")).sort();
  const rasters: RasterImage[] = [];
  for (const f of files) rasters.push(await loadRaster(path.join(tmp, f)));
  await fs.rm(tmp, { recursive: true, force: true });
  return rasters;
}

const PHOTOS = ["photo_skew_1.jpg", "photo_skew_2.jpg", "photo_skew_3.jpg"];

test("Marker werden auf allen drei schraegen Fotos erkannt", async () => {
  let detected = 0;
  for (const name of PHOTOS) {
    const img = await loadRaster(path.join(FIX, name));
    const det = detectMarkers(img);
    if (det) {
      detected++;
      // Vier plausible Ecken, grosses Viereck.
      assert.ok(quadSize(det.corners) > img.width * 0.3, `${name}: Viereck zu klein`);
    }
  }
  console.log(`  Marker-Erkennungsrate Fotos: ${detected}/${PHOTOS.length}`);
  assert.equal(detected, PHOTOS.length, "Nicht alle Fotos erkannt");
});

test("Foto wird entzerrt und auf die Schreibzone zugeschnitten", async () => {
  const img = await loadRaster(path.join(FIX, "photo_skew_1.jpg"));
  const res = dewarpPhoto(img);
  assert.equal(res.templateDetected, true, "Vorlage sollte erkannt sein");
  // Entzerrtes Blatt hat A4-Seitenverhaeltnis (Schreibzone etwas schmaler/hoeher).
  const ratio = res.page.height / res.page.width;
  assert.ok(ratio > 1.1 && ratio < 1.7, `Seitenverhaeltnis unerwartet: ${ratio.toFixed(2)}`);
  // Kopfzeilen-Ausschnitt ist breiter als hoch.
  assert.ok(res.header.width > res.header.height, "Kopfzeile sollte quer sein");
});

test("Orientierung wird ueber das Asymmetrie-Quadrat sicher bestimmt", async () => {
  let confident = 0;
  for (const name of PHOTOS) {
    const img = await loadRaster(path.join(FIX, name));
    const res = dewarpPhoto(img);
    if (res.orientationConfident) confident++;
  }
  console.log(`  Orientierung sicher: ${confident}/${PHOTOS.length}`);
  assert.ok(confident >= 2, "Orientierung sollte auf der Mehrheit sicher sein");
});

test("Scanner-PDF-Seiten laufen durch (Marker erkannt, entzerrt)", async () => {
  const rasters = await pdfPagesToRasters(path.join(FIX, "scan_multi.pdf"));
  assert.equal(rasters.length, 3, "Scanner-PDF sollte 3 Seiten haben");
  let detected = 0;
  for (const raster of rasters) {
    const res = dewarpScannerPage(raster);
    if (res.templateDetected) detected++;
    assert.ok(res.page.width > 0 && res.page.height > 0, "Leeres Seitenbild");
    assert.ok(res.header.width > 0 && res.header.height > 0, "Leere Kopfzeile");
  }
  console.log(`  Marker-Erkennungsrate Scanner-Seiten: ${detected}/${rasters.length}`);
  assert.equal(detected, rasters.length, "Nicht alle Scanner-Seiten erkannt");
});

test("Ohne Vorlage: Bild wird unveraendert uebernommen und gekennzeichnet", async () => {
  // Ein Bild ohne Marker (gleichmaessiges Rauschen) darf nicht faelschlich
  // als Vorlage erkannt werden; das Seitenbild bleibt unveraendert.
  const w = 600;
  const h = 800;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    const v = 180 + Math.floor(Math.random() * 40);
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  const img: RasterImage = { width: w, height: h, data };
  const res = dewarpPhoto(img);
  assert.equal(res.templateDetected, false, "Rauschbild darf nicht als Vorlage gelten");
  // Fallback: Seitenbild = Originalgroesse, Kopfzeile aus oberem Bereich.
  assert.equal(res.page.width, w);
  assert.equal(res.page.height, h);
  assert.ok(res.header.width > 0 && res.header.height > 0, "Kopfzeile trotzdem vorhanden");
});

test("Ergebnis wird strukturiert in data/submissions/ abgelegt", async () => {
  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "gp-data-"));
  const roundId = "test-runde";
  const roundDir = path.join(tmpRoot, "submissions", roundId, "pages");
  await fs.mkdir(roundDir, { recursive: true });

  // Ein Foto und eine Scanner-Seite verarbeiten und ablegen.
  const photo = await loadRaster(path.join(FIX, "photo_skew_2.jpg"));
  const res = dewarpPhoto(photo);
  const pagePng = await encodePng(res.page);
  const headerPng = await encodePng(res.header);
  await fs.writeFile(path.join(roundDir, "p1.png"), pagePng);
  await fs.writeFile(path.join(roundDir, "p1.header.png"), headerPng);

  const index = [
    {
      pageId: "p1",
      templateDetected: res.templateDetected,
      orientationConfident: res.orientationConfident,
      sourceName: "photo_skew_2.jpg",
      sourcePageIndex: 0,
      createdAt: new Date().toISOString(),
    },
  ];
  await fs.writeFile(
    path.join(tmpRoot, "submissions", roundId, "pages.json"),
    JSON.stringify(index, null, 2),
  );

  // Nachweis: Dateien existieren und sind gueltige PNGs.
  const pageMeta = await sharp(path.join(roundDir, "p1.png")).metadata();
  const headerMeta = await sharp(path.join(roundDir, "p1.header.png")).metadata();
  assert.equal(pageMeta.format, "png");
  assert.equal(headerMeta.format, "png");
  assert.ok((pageMeta.width ?? 0) > 100, "Seitenbild zu klein");

  const written = JSON.parse(
    await fs.readFile(path.join(tmpRoot, "submissions", roundId, "pages.json"), "utf8"),
  );
  assert.equal(written.length, 1);
  assert.equal(written[0].templateDetected, true);

  console.log(`  Abgelegt in: ${path.join(tmpRoot, "submissions", roundId)}`);
  await fs.rm(tmpRoot, { recursive: true, force: true });
});
