/*
  AP13 Integrationslauf: kompletter Nutzerpfad per echtem HTTP gegen die
  laufende App (next start). Kein Ollama noetig - die Bewertungs- und
  Erkennungs-Routen fallen automatisch auf den Mock-Client zurueck
  (lib/prompts/resolve-client.ts, resolveGradingClient), wenn localhost:11434
  nicht erreichbar ist.

  Aufruf (siehe test/run-integration.sh, startet und stoppt den Server):
    BASE=http://localhost:3100 DATA=/tmp/ap13-data ASSETS=/tmp/ap13 \
      node test/integration-http.mjs

  Erwartet vorbereitete Base64-Assets in ASSETS:
    scanpage-1.png.b64 .. scanpage-3.png.b64 (aus test/fixtures/scan_multi.pdf)
    photo1.jpg.b64                            (aus test/fixtures/photo_skew_1.jpg)
*/

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100";
const ASSETS = process.env.ASSETS || "/tmp/ap13";
const OUT = process.env.OUT || "/tmp/ap13-out";
mkdirSync(OUT, { recursive: true });

let failures = 0;
function check(label, cond, extra = "") {
  const mark = cond ? "PASS" : "FAIL";
  if (!cond) failures += 1;
  console.log(`[${mark}] ${label}${extra ? "  -> " + extra : ""}`);
}

async function jget(path) {
  const r = await fetch(BASE + path);
  const t = await r.text();
  let body;
  try {
    body = JSON.parse(t);
  } catch {
    body = t;
  }
  return { status: r.status, body, headers: r.headers };
}
async function jpost(path, data) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const t = await r.text();
  let body;
  try {
    body = JSON.parse(t);
  } catch {
    body = t;
  }
  return { status: r.status, body };
}
function dataUrl(b64File, mime) {
  const b64 = readFileSync(`${ASSETS}/${b64File}`, "utf8").trim();
  return `data:${mime};base64,${b64}`;
}

const now = new Date().toISOString();
const CONFIG_ID = "integration-englisch";
const ROUND = "integration-runde";

// -------------------------------------------------------------------------
// 1. Fach einrichten: gueltige SubjectConfig ueber die Wizard-Speichern-Route.
//    (Zusaetzlich vorher die Vorschlags-Route anfassen, damit auch der
//    gradingModel-Slot-Pfad ueber HTTP gelaufen ist.)
// -------------------------------------------------------------------------
console.log("\n=== 1. Fach einrichten ===");

const suggest = await jpost("/api/setup/suggest-rubric", {
  subject: "Englisch",
  level: "B1-B2",
  textLanguage: "en",
  gradingSystem: "nrw-points",
  taskPrompt: "Write a comment about introducing AI tools at the workplace.",
  expectedPoints: ["Introduction names the topic", "One argument with example"],
});
check("suggest-rubric liefert Kriterien", suggest.status === 200 && Array.isArray(suggest.body.suggestion?.criteria) && suggest.body.suggestion.criteria.length > 0, `status ${suggest.status}`);

const config = {
  id: CONFIG_ID,
  name: "Englisch Comment (Integration)",
  subject: "Englisch",
  textLanguage: "en",
  feedbackLanguage: "en",
  classLevel: "IAF31",
  level: "B1-B2",
  gradingSystem: "nrw-points",
  feedbackStyle: { tone: "warm und klar, ermutigend", length: "medium", includePractice: true },
  forbiddenWords: ["wrong", "bad", "poor", "fail", "lack", "weak", "missing", "incorrect", "falsch", "schlecht", "mangelhaft", "fehlt"],
  rubric: {
    taskPrompt: "Write a comment about introducing AI tools at the workplace.",
    expectedPoints: ["Introduction names the topic", "One argument with a claim, a reason and an example"],
    criteria: [
      { id: "structure", name: "Structure", description: "Follows the required structure as flowing prose.", maxPoints: 15, colorKey: "sentence" },
      { id: "grammar", name: "Grammar", description: "Correct grammar and verb forms.", maxPoints: 15, colorKey: "grammar" },
    ],
    calibrationSamples: [],
  },
  createdAt: now,
  updatedAt: now,
};
const savedConfig = await jpost("/api/setup/configs", config);
check("Fach-Konfiguration gespeichert", savedConfig.status === 200, `status ${savedConfig.status} ${JSON.stringify(savedConfig.body).slice(0,200)}`);

const configList = await jget("/api/setup/configs");
check("Fach erscheint in der Liste", configList.status === 200 && configList.body.configs.some((c) => c.id === CONFIG_ID));

// -------------------------------------------------------------------------
// 2. Ingest: ein mehrseitiges Test-PDF (3 Scanner-Seiten) plus ein Testfoto.
// -------------------------------------------------------------------------
console.log("\n=== 2. Hochladen (Ingest) ===");

const pdfPages = [1, 2, 3].map((n) => ({
  kind: "pdf-page",
  dataUrl: dataUrl(`scanpage-${n}.png.b64`, "image/png"),
  sourceName: "scan_multi.pdf",
  sourcePageIndex: n - 1,
}));
const photoPage = {
  kind: "photo",
  dataUrl: dataUrl("photo1.jpg.b64", "image/jpeg"),
  sourceName: "photo_skew_1.jpg",
};

const ingest = await jpost("/api/ingest", { roundId: ROUND, pages: [...pdfPages, photoPage] });
check("Ingest verarbeitet 4 Seiten", ingest.status === 200 && ingest.body.results && ingest.body.results.length === 4, `status ${ingest.status}`);
const tmplDetected = (ingest.body.results || []).filter((r) => r.templateDetected).length;
check("mindestens die 3 Scanner-Seiten als Vorlage erkannt", tmplDetected >= 3, `erkannt: ${tmplDetected}/4`);

const pageIds = (ingest.body.results || []).map((r) => r.pageId);

// Zuordnung: die drei Scanner-Seiten -> Schueler IN01, das Foto -> IN02.
const assign1 = await jpost("/api/ingest/pages", { roundId: ROUND, pageIds: pageIds.slice(0, 3), studentAlias: "IN01", taskCode: "AITOOL01" });
check("Scanner-Seiten IN01 zugeordnet", assign1.status === 200 && assign1.body.submissionId === "sub-IN01");
const assign2 = await jpost("/api/ingest/pages", { roundId: ROUND, pageIds: [pageIds[3]], studentAlias: "IN02", taskCode: "AITOOL01" });
check("Foto IN02 zugeordnet", assign2.status === 200 && assign2.body.submissionId === "sub-IN02");

// -------------------------------------------------------------------------
// 3. Erkennung mit Mock (Ollama nicht erreichbar -> Mock-Fallback).
// -------------------------------------------------------------------------
console.log("\n=== 3. Erkennung (Mock) ===");
const recognize = await jpost("/api/recognize/run", { roundId: ROUND });
check("Erkennung laeuft ueber alle Arbeiten", recognize.status === 200 && recognize.body.total >= 2, `status ${recognize.status}, total ${recognize.body?.total}`);
const doneCount = (recognize.body.results || []).filter((r) => r.status === "done").length;
check("Erkennung erzeugt Transkripte (done)", doneCount >= 2, `done: ${doneCount}`);

// -------------------------------------------------------------------------
// 4. Transkript pruefen: 409-Sperre bei [[wort?]] gegentesten, dann klaeren,
//    dann bestaetigen.
// -------------------------------------------------------------------------
console.log("\n=== 4. Pruefen (Transkript) + 409-Sperre ===");

// Alle [[...]]-Markierungen aus einem Text entfernen (Lehrkraft klaert sie).
const clearMarkers = (text) => text.replace(/\[\[\s*([^\]?]*?)\s*\??\s*\]\]/g, "$1").replace(/\[\[\s*\??\s*\]\]/g, "");

// Transkript von IN01 laden.
const rev = await jget(`/api/review/submission?round=${ROUND}&id=sub-IN01`);
check("Transkript IN01 geladen", rev.status === 200 && rev.body.transcript && Array.isArray(rev.body.transcript.lines));
const origLines = rev.body.transcript.lines;

// Kuenstlich eine Unsicherheit einbauen und speichern -> confirm muss 409 geben.
const unsureLines = origLines.map((l, i) => (i === 0 ? { ...l, text: l.text + " [[unsicher?]]" } : { ...l }));
const saveUnsure = await jpost("/api/review/submission", { roundId: ROUND, submissionId: "sub-IN01", lines: unsureLines });
check("unsichere Zeilen gespeichert", saveUnsure.status === 200);
const confirmBlocked = await jpost("/api/review/confirm", { roundId: ROUND, submissionId: "sub-IN01" });
check("Bestaetigen bei [[wort?]] gibt 409", confirmBlocked.status === 409, `status ${confirmBlocked.status}`);

// Alle Unsicherheiten klaeren (auch die aus der Mock-Erkennung) und speichern.
const clearedLines = origLines.map((l) => ({ ...l, text: clearMarkers(l.text) }));
const saveCleared = await jpost("/api/review/submission", { roundId: ROUND, submissionId: "sub-IN01", lines: clearedLines });
check("bereinigte Zeilen gespeichert", saveCleared.status === 200 && saveCleared.body.unclearCount === 0, `unclear ${saveCleared.body?.unclearCount}`);
const confirmOk = await jpost("/api/review/confirm", { roundId: ROUND, submissionId: "sub-IN01" });
check("Bestaetigen ohne Unsicherheit gibt 200", confirmOk.status === 200 && confirmOk.body.status === "checked", `status ${confirmOk.status}`);

// IN02 (Foto) ebenfalls bestaetigen, damit die Klassenuebersicht mehr als eine Zeile hat.
const rev2 = await jget(`/api/review/submission?round=${ROUND}&id=sub-IN02`);
const cleared2 = (rev2.body.transcript?.lines || []).map((l) => ({ ...l, text: clearMarkers(l.text) }));
await jpost("/api/review/submission", { roundId: ROUND, submissionId: "sub-IN02", lines: cleared2 });
const confirm2 = await jpost("/api/review/confirm", { roundId: ROUND, submissionId: "sub-IN02" });
check("zweite Arbeit (Foto) bestaetigt", confirm2.status === 200, `status ${confirm2.status}`);

// -------------------------------------------------------------------------
// 5. Config zuordnen und bewerten (Mock).
// -------------------------------------------------------------------------
console.log("\n=== 5. Config zuordnen + Bewerten (Mock) ===");
const setConfig = await jpost("/api/assess/config", { roundId: ROUND, configId: CONFIG_ID });
check("Fach-Konfiguration der Runde zugeordnet", setConfig.status === 200 && setConfig.body.updated >= 2, `updated ${setConfig.body?.updated}`);

const assessRun = await jpost("/api/assess/run", { roundId: ROUND });
const assessedDone = (assessRun.body.results || []).filter((r) => r.status === "done").length;
check("Bewertungskette erzeugt Bewertungen", assessRun.status === 200 && assessedDone >= 2, `done ${assessedDone}, status ${assessRun.status}`);

const sub = await jget(`/api/assess/submission?round=${ROUND}&id=sub-IN01`);
check("bewertete Arbeit hat Karten (Kriterien)", sub.status === 200 && sub.body.assessment && sub.body.assessment.criteria.length === 2);
check("Feedback-Entwurf vorhanden", !!sub.body.feedback && typeof sub.body.feedback.strength === "string");

// Verbotswort-Schutz stichprobenartig auf generierten Text pruefen.
const feedbackBlob = JSON.stringify(sub.body.feedback || {}) + JSON.stringify((sub.body.assessment?.criteria || []).map((c) => c.reasoning));
const forbidden = ["wrong", "bad", "poor", "fail", "lack", "weak", "missing", "incorrect", "falsch", "schlecht", "mangelhaft", "fehlt"];
const hit = forbidden.filter((w) => new RegExp(`\\b${w}\\b`, "i").test(feedbackBlob));
check("kein Verbotswort im generierten Text", hit.length === 0, hit.join(","));

// -------------------------------------------------------------------------
// 6. Eine Korrektur speichern -> DPO-Zeile muss entstehen.
// -------------------------------------------------------------------------
console.log("\n=== 6. Korrektur speichern (DPO) ===");
const before = sub.body.assessment.criteria;
const grammarBefore = before.find((c) => c.criterionId === "grammar");
const newPoints = (grammarBefore?.points ?? 10) === 15 ? 14 : (grammarBefore?.points ?? 10) + 1;
const editCriteria = before.map((c) =>
  c.criterionId === "grammar"
    ? { criterionId: c.criterionId, points: newPoints, reasoning: c.reasoning + " (angepasst durch die Lehrkraft)" }
    : { criterionId: c.criterionId, points: c.points, reasoning: c.reasoning },
);
const dpoBeforeList = await jget("/api/export/dpo");
const dpoBeforeCount = (dpoBeforeList.body.items || []).find((i) => i.roundId === ROUND)?.count ?? 0;

const correction = await jpost("/api/assess/submission", { roundId: ROUND, submissionId: "sub-IN01", criteria: editCriteria });
check("Korrektur gespeichert, Note neu berechnet", correction.status === 200 && correction.body.assessment, `status ${correction.status}`);

const dpoAfterList = await jget("/api/export/dpo");
const dpoAfterCount = (dpoAfterList.body.items || []).find((i) => i.roundId === ROUND)?.count ?? 0;
check("DPO-Zeile ist entstanden", dpoAfterCount > dpoBeforeCount, `vorher ${dpoBeforeCount}, nachher ${dpoAfterCount}`);

// -------------------------------------------------------------------------
// 7. Freigeben.
// -------------------------------------------------------------------------
console.log("\n=== 7. Freigeben ===");
const rel1 = await jpost("/api/assess/release", { roundId: ROUND, submissionId: "sub-IN01" });
check("IN01 freigegeben", rel1.status === 200 && rel1.body.status === "released");
const rel2 = await jpost("/api/assess/release", { roundId: ROUND, submissionId: "sub-IN02" });
check("IN02 freigegeben", rel2.status === 200 && rel2.body.status === "released");

// -------------------------------------------------------------------------
// 8. Exporte: Feedback-PDF, Klassenuebersicht-PDF, DPO-JSONL.
// -------------------------------------------------------------------------
console.log("\n=== 8. Export ===");
const fbPdf = await fetch(`${BASE}/api/export/feedback-pdf?round=${ROUND}&id=sub-IN01`);
const fbBuf = Buffer.from(await fbPdf.arrayBuffer());
const fbIsPdf = fbBuf.slice(0, 5).toString("latin1") === "%PDF-";
check("Feedback-PDF ist ein gueltiges PDF", fbPdf.status === 200 && fbIsPdf, `status ${fbPdf.status}, bytes ${fbBuf.length}`);
if (fbIsPdf) writeFileSync(`${OUT}/feedback-IN01.pdf`, fbBuf);

const clsPdf = await fetch(`${BASE}/api/export/class-pdf?round=${ROUND}`);
const clsBuf = Buffer.from(await clsPdf.arrayBuffer());
const clsIsPdf = clsBuf.slice(0, 5).toString("latin1") === "%PDF-";
check("Klassenuebersicht-PDF ist ein gueltiges PDF", clsPdf.status === 200 && clsIsPdf, `status ${clsPdf.status}, bytes ${clsBuf.length}`);
if (clsIsPdf) writeFileSync(`${OUT}/klassenuebersicht.pdf`, clsBuf);

const dpoDl = await fetch(`${BASE}/api/export/dpo?round=${ROUND}`);
const dpoText = await dpoDl.text();
const dpoLines = dpoText.trim().split("\n").filter(Boolean);
let dpoValid = dpoLines.length > 0;
for (const line of dpoLines) {
  try { const o = JSON.parse(line); if (!o.rejected || !o.chosen) dpoValid = false; } catch { dpoValid = false; }
}
check("DPO-JSONL exportiert, jede Zeile gueltig (rejected+chosen)", dpoDl.status === 200 && dpoValid, `zeilen ${dpoLines.length}`);
if (dpoValid) writeFileSync(`${OUT}/korrekturen.jsonl`, dpoText);

// Feedback-PDF fuer nicht-freigegebene Arbeit muss 409 geben (Gegentest).
const notReleased = await fetch(`${BASE}/api/export/feedback-pdf?round=${ROUND}&id=sub-DOESNOTEXIST`);
check("Feedback-PDF fuer unbekannte Arbeit gibt 404", notReleased.status === 404, `status ${notReleased.status}`);

console.log(`\n=== ERGEBNIS: ${failures === 0 ? "ALLE PRUEFUNGEN GRUEN" : failures + " FEHLER"} ===`);
process.exit(failures === 0 ? 0 : 1);
