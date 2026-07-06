#!/usr/bin/env python3
"""
handschrift_test.py -- Machbarkeitstest Handschrifterkennung fuer gemmpen-teacher (AP12)

Was das Skript macht:
  1. Zerlegt die gescannten Klausur-PDFs (Exam4/iaf31_Exam4.pdf, Exam4/iaf32_exam4.pdf)
     in Einzelseiten-Bilder (300 dpi).
  2. Ordnet Seiten den Schuelern zu (ueber die gedruckte Kopfzeile bzw. Seitenanzahl
     aus der Ground-Truth) und schreibt eine Zuordnungs-Tabelle, die Svenja von Hand
     pruefen und korrigieren kann, BEVOR teure Ollama-Aufrufe gemacht werden.
  3. Schickt jede Seite an Ollama (localhost:11434, Vision-Modell) mit drei
     Prompt-Varianten: roh, mit Aufgabenkontext, zeilenweise.
  4. Vergleicht die Erkennung gegen die Ground-Truth-Transkripte
     (Exam4/transkripte/iaf31_transkripte.jsonl, iaf32_transkripte.jsonl) und
     berechnet Wort- und Zeichenfehlerrate (WER/CER) pro Schueler, pro
     Prompt-Variante und gesamt (jiwer).
  5. Schreibt eval/ERGEBNIS.md mit Interpretation nach festen Schwellen:
       < 5 %  WER  -> pilotfaehig
       5-15 % WER  -> nur mit Schueler-Selbstpruefung des Transkripts
       > 15 % WER  -> Pivot auf getippte Texte

Die drei Befehle fuer Svenja (siehe auch eval/README.md):

  1) Abhaengigkeiten installieren (einmalig):
     pip3 install --break-system-packages -r requirements.txt
     brew install poppler   # falls pdftoppm/pdfinfo fehlen

  2) Zuordnung pruefen (erzeugt/aktualisiert eval/out/page_mapping.csv, KEIN Ollama-Aufruf):
     python3 handschrift_test.py --check-mapping

  3) Test starten (echter Lauf mit Ollama):
     python3 handschrift_test.py --model gemma3:27b

  Mock-Lauf ohne Ollama, zum Pruefen der Auswertungslogik (kein Vision-Modell noetig):
     python3 handschrift_test.py --mock

Wichtig: Exam4/ ist Primaerdatenordner und wird von diesem Skript NUR gelesen, niemals
geschrieben oder veraendert. Alle Ausgaben landen unter eval/out/.
"""

from __future__ import annotations

import argparse
import base64
import csv
import json
import random
import re
import sys
import time
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Pfade
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent  # eval/ -> gemmpen-teacher/ -> Produkt/ -> Projektordner
EXAM4_DIR = PROJECT_ROOT / "Exam4"
OUT_DIR = SCRIPT_DIR / "out"
PAGES_DIR = OUT_DIR / "pages"
RAW_DIR = OUT_DIR / "raw_responses"
MAPPING_CSV = OUT_DIR / "page_mapping.csv"
RESULTS_JSON = OUT_DIR / "results.json"
ERGEBNIS_MD = SCRIPT_DIR / "ERGEBNIS.md"

# Erwartete PDF- und Transkript-Dateinamen laut Projektstruktur (CLAUDE.md).
# Falls Svenja abweichende Dateinamen hat, per --pdf iaf31=... angeben
# (siehe --help). Die tatsaechlich verwendeten Pfade werden in main() gebaut,
# je nach --exam4-dir.
DPI = 300

# Schwellen laut Projektvorgabe
THRESHOLD_PILOT = 0.05      # unter 5% WER: pilotfaehig
THRESHOLD_SELFCHECK = 0.15  # 5-15%: nur mit Schueler-Selbstpruefung
# ueber 15%: Pivot auf getippte Texte

PROMPT_VARIANTS = ["roh", "kontext", "zeilenweise"]

PROMPTS = {
    "roh": "Transcribe this handwritten text.",
    "kontext": (
        "This is a handwritten answer written by a student (B1-B2 English level) "
        "in a school exam about a reading comprehension text on cyberattacks "
        "(Marks & Spencer, Co-op) and a workplace AI comment/opinion essay. "
        "Transcribe exactly what the student wrote, including spelling and "
        "grammar mistakes. Do not correct or improve the language. Preserve "
        "struck-through and inserted words if visible."
    ),
    "zeilenweise": (
        "Transcribe this handwritten text line by line. Output one line of "
        "transcription per handwritten line you see on the page, in reading "
        "order, numbered starting at 1. Do not merge or split lines."
    ),
}


# ---------------------------------------------------------------------------
# Hilfsfunktionen: Ground Truth laden (schema-tolerant)
# ---------------------------------------------------------------------------

@dataclass
class StudentGT:
    student_id: str
    klasse: str
    text: str
    pages_transcribed: Optional[int] = None
    raw: dict = field(default_factory=dict)


def _extract_text_from_record(rec: dict) -> str:
    """Ground-Truth-Datensaetze koennen unterschiedlich aufgebaut sein
    (rohes transkripte/*.jsonl vs. konsolidiertes students_complete.jsonl-Format).
    Wir versuchen mehrere bekannte Feldnamen, bevor wir aufgeben."""
    # Direktes Textfeld
    for key in ("text", "transcript", "full_text", "content", "transcription"):
        val = rec.get(key)
        if isinstance(val, str) and val.strip():
            return val

    # Verschachteltes "transcript"-Objekt (Format wie data/students_complete.jsonl)
    t = rec.get("transcript")
    if isinstance(t, dict):
        parts = []
        for key in ("a1_reading_comprehension", "a2_comment"):
            val = t.get(key)
            if isinstance(val, str) and val.strip():
                parts.append(val)
        if parts:
            return "\n\n".join(parts)

    # Fallback: alle String-Werte des Records zusammenfuegen (letzter Ausweg)
    parts = [v for v in rec.values() if isinstance(v, str) and len(v) > 20]
    if parts:
        return "\n\n".join(parts)

    return ""


def _extract_student_id(rec: dict, fallback_index: int, klasse: str) -> str:
    for key in ("student_id", "id", "student", "kuerzel"):
        val = rec.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return f"{klasse}-EK4-{fallback_index:03d}"


def _extract_pages_transcribed(rec: dict) -> Optional[int]:
    val = rec.get("pages_transcribed")
    if isinstance(val, int):
        return val
    t = rec.get("transcript")
    if isinstance(t, dict):
        val = t.get("pages_transcribed")
        if isinstance(val, int):
            return val
    return None


def strip_transcription_markers(text: str) -> str:
    """Entfernt die Transkriptions-Markierungen aus data/SCHEMA.md
    ([struck: ...], [inserted: ...], [unclear: ...], [illegible]), damit der
    Vergleich gegen die rohe Vision-Modell-Ausgabe fair bleibt. Das Modell
    sieht diese Marker nicht auf dem Papier, sie sind Transkriptions-Metadaten."""
    text = re.sub(r"\[struck:\s*[^\]]*\]", "", text)
    text = re.sub(r"\[inserted:\s*([^\]]*)\]", r"\1", text)
    text = re.sub(r"\[unclear:\s*([^\]]*)\]", r"\1", text)
    text = re.sub(r"\[illegible\]", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def load_ground_truth(transcript_path: Path, klasse: str) -> list[StudentGT]:
    if not transcript_path.exists():
        return []
    students = []
    with open(transcript_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError as e:
                print(f"  WARNUNG: Zeile {i} in {transcript_path.name} ist kein gueltiges JSON ({e}), uebersprungen.")
                continue
            sid = _extract_student_id(rec, i, klasse)
            raw_text = _extract_text_from_record(rec)
            text = strip_transcription_markers(raw_text)
            pages = _extract_pages_transcribed(rec)
            students.append(StudentGT(student_id=sid, klasse=klasse, text=text, pages_transcribed=pages, raw=rec))
    return students


# ---------------------------------------------------------------------------
# Schritt 1: PDF in Seiten zerlegen
# ---------------------------------------------------------------------------

def render_pdf_to_pages(pdf_path: Path, out_dir: Path, klasse: str, dpi: int = DPI) -> list[Path]:
    """Rendert jede Seite eines PDFs als PNG. Nutzt pdf2image (poppler)."""
    try:
        from pdf2image import convert_from_path
    except ImportError:
        print("FEHLER: Das Python-Paket 'pdf2image' fehlt.")
        print("Installieren mit: pip3 install --break-system-packages pdf2image")
        print("Ausserdem wird poppler benoetigt: brew install poppler")
        sys.exit(1)

    out_dir.mkdir(parents=True, exist_ok=True)
    existing = sorted(out_dir.glob(f"{klasse}_p*.png"))
    # einfacher Cache: wenn schon gerendert, nicht nochmal (Rendering ist der
    # langsamste Schritt bei 300 dpi und > 100 Seiten)
    if existing:
        print(f"  {klasse}: {len(existing)} Seiten bereits gerendert in {out_dir}, ueberspringe Rendering.")
        return existing

    print(f"  {klasse}: rendere {pdf_path.name} bei {dpi} dpi (kann einige Minuten dauern)...")
    images = convert_from_path(str(pdf_path), dpi=dpi)
    paths = []
    for idx, img in enumerate(images, start=1):
        p = out_dir / f"{klasse}_p{idx:04d}.png"
        img.save(p, "PNG")
        paths.append(p)
    print(f"  {klasse}: {len(paths)} Seiten gerendert.")
    return paths


# ---------------------------------------------------------------------------
# Schritt 2: Seite-zu-Schueler-Zuordnung
# ---------------------------------------------------------------------------

@dataclass
class MappingRow:
    klasse: str
    student_id: str
    page_start: int
    page_end: int
    n_pages: int
    source: str  # "pages_transcribed" oder "gleichverteilt (PRUEFEN)"


def build_mapping(klasse: str, page_paths: list[Path], gt_students: list[StudentGT]) -> list[MappingRow]:
    """Ordnet PDF-Seiten den Schuelern zu, in Reihenfolge des Ground-Truth-JSONL.

    Wichtige Annahme (siehe eval/README.md): Die Reihenfolge der Schueler im
    Ground-Truth-JSONL entspricht der Reihenfolge der Klausuren im gescannten
    PDF-Stapel. Das ist eine Annahme, keine verifizierte Tatsache -- deshalb
    MUSS Svenja die Datei eval/out/page_mapping.csv pruefen, bevor der teure
    Ollama-Lauf gestartet wird (--check-mapping tut genau das und stoppt davor).

    Wenn ein Ground-Truth-Record ein Feld 'pages_transcribed' enthaelt, wird
    das als Seitenzahl fuer diesen Schueler verwendet. Sonst wird die
    Gesamtseitenzahl gleichmaessig auf alle Schueler verteilt und die Zeile
    klar als "PRUEFEN" markiert.
    """
    total_pages = len(page_paths)
    n_students = len(gt_students)
    if n_students == 0:
        return []

    rows: list[MappingRow] = []
    declared_pages = [s.pages_transcribed for s in gt_students]
    if all(p is not None and p > 0 for p in declared_pages) and sum(declared_pages) <= total_pages:
        # Ground Truth nennt Seitenzahlen: praezise Zuordnung moeglich
        cursor = 1
        for s, n_pages in zip(gt_students, declared_pages):
            start = cursor
            end = cursor + n_pages - 1
            rows.append(MappingRow(klasse, s.student_id, start, end, n_pages, "pages_transcribed"))
            cursor = end + 1
        # Restseiten (z.B. Deckblatt am Stapelanfang/-ende) bleiben unzugeordnet,
        # das ist beabsichtigt und wird im README erwaehnt.
    else:
        # Fallback: Gleichverteilung, klar als PRUEFEN markiert
        base = total_pages // n_students
        rem = total_pages % n_students
        cursor = 1
        for i, s in enumerate(gt_students):
            n_pages = base + (1 if i < rem else 0)
            n_pages = max(n_pages, 1)
            start = cursor
            end = min(cursor + n_pages - 1, total_pages)
            rows.append(MappingRow(klasse, s.student_id, start, end, end - start + 1, "gleichverteilt (PRUEFEN)"))
            cursor = end + 1

    return rows


def write_mapping_csv(rows: list[MappingRow], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    file_exists = path.exists()
    mode = "a" if file_exists else "w"
    with open(path, mode, newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["klasse", "student_id", "page_start", "page_end", "n_pages", "quelle", "korrigiert_von_svenja"])
        for r in rows:
            writer.writerow([r.klasse, r.student_id, r.page_start, r.page_end, r.n_pages, r.source, ""])


def read_mapping_csv(path: Path) -> list[MappingRow]:
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(MappingRow(
                klasse=row["klasse"],
                student_id=row["student_id"],
                page_start=int(row["page_start"]),
                page_end=int(row["page_end"]),
                n_pages=int(row["n_pages"]),
                source=row.get("quelle", ""),
            ))
    return rows


# ---------------------------------------------------------------------------
# Schritt 3: Ollama-Aufruf
# ---------------------------------------------------------------------------

def image_to_b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def call_ollama_vision(model: str, prompt: str, image_path: Path, host: str = "http://localhost:11434",
                        timeout: int = 120, retries: int = 2) -> str:
    """Ruft Ollamas /api/generate mit Bild-Anhang auf. Gibt den erkannten Text zurueck."""
    import requests

    payload = {
        "model": model,
        "prompt": prompt,
        "images": [image_to_b64(image_path)],
        "stream": False,
    }
    url = f"{host.rstrip('/')}/api/generate"
    last_error = None
    for attempt in range(1, retries + 2):
        try:
            resp = requests.post(url, json=payload, timeout=timeout)
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "")
        except requests.exceptions.ConnectionError as e:
            last_error = e
            print("  FEHLER: Die Auswertung ist nicht erreichbar. Ist das Programm Ollama gestartet?")
            break  # kein Sinn in Retry, wenn der Dienst gar nicht laeuft
        except Exception as e:
            last_error = e
            print(f"  Versuch {attempt} fehlgeschlagen ({e}), erneuter Versuch...")
            time.sleep(2)
    raise RuntimeError(f"Ollama-Aufruf fehlgeschlagen fuer {image_path.name}: {last_error}")


# ---------------------------------------------------------------------------
# Mock-Modus: simulierte Ollama-Antworten mit kuenstlichen Fehlern
# ---------------------------------------------------------------------------

def inject_errors(text: str, char_error_rate: float, rng: random.Random) -> str:
    """Streut kuenstliche Fehler in einen Text, um eine plausible
    Vision-Modell-Ausgabe zu simulieren: Zeichenvertauschungen, geloeschte
    Zeichen, eingefuegte Zeichen, gelegentlich verschluckte Woerter."""
    if not text:
        return text

    chars = list(text)
    n_errors = int(len(chars) * char_error_rate)
    alphabet = "abcdefghijklmnopqrstuvwxyz"

    for _ in range(n_errors):
        if not chars:
            break
        op = rng.choice(["sub", "del", "ins", "swap"])
        idx = rng.randrange(len(chars))
        if op == "sub" and chars[idx].isalpha():
            chars[idx] = rng.choice(alphabet)
        elif op == "del" and len(chars) > 1:
            del chars[idx]
        elif op == "ins":
            chars.insert(idx, rng.choice(alphabet))
        elif op == "swap" and idx < len(chars) - 1:
            chars[idx], chars[idx + 1] = chars[idx + 1], chars[idx]

    result = "".join(chars)

    # gelegentlich ein ganzes Wort verschlucken (typisch fuer schlecht lesbare
    # Handschrift, die das Modell einfach ausl?sst)
    words = result.split(" ")
    n_word_drops = max(0, int(len(words) * char_error_rate * 0.3))
    for _ in range(n_word_drops):
        if len(words) > 3:
            del words[rng.randrange(len(words))]
    result = " ".join(words)

    return result


# Simulierte Basis-Fehlerraten pro Prompt-Variante: der Aufgabenkontext hilft
# dem Modell (weniger Fehler), zeilenweise liegt dazwischen, roh ist am
# fehleranfaelligsten. Werte sind fuer den Mock-Modus gewaehlt, um die
# Auswertungslogik mit unterschiedlichen, plausiblen Ergebnissen zu pruefen.
MOCK_BASE_CER = {
    "roh": 0.09,
    "kontext": 0.05,
    "zeilenweise": 0.07,
}


def split_text_into_chunks(text: str, n_chunks: int) -> list[str]:
    """Teilt einen Text in n_chunks moeglichst gleich grosse, wortweise
    Abschnitte. Simuliert, dass eine echte Vision-Erkennung pro Seite nur
    den auf dieser Seite sichtbaren Textanteil liefert, nicht den gesamten
    Schuelertext erneut."""
    words = text.split()
    if n_chunks <= 1 or not words:
        return [text]
    n_chunks = min(n_chunks, len(words)) or 1
    base = len(words) // n_chunks
    rem = len(words) % n_chunks
    chunks = []
    cursor = 0
    for i in range(n_chunks):
        size = base + (1 if i < rem else 0)
        chunks.append(" ".join(words[cursor:cursor + size]))
        cursor += size
    return chunks


def mock_ollama_response(gt_text_chunk: str, variant: str, rng: random.Random) -> str:
    base_rate = MOCK_BASE_CER[variant]
    # etwas Streuung zwischen Schuelern/Seiten, damit es nicht zu glatt aussieht
    rate = max(0.0, rng.gauss(base_rate, base_rate * 0.35))
    return inject_errors(gt_text_chunk, rate, rng)


# ---------------------------------------------------------------------------
# Schritt 4: WER / CER
# ---------------------------------------------------------------------------

def normalize_for_scoring(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = text.lower()
    text = re.sub(r"\s+", " ", text).strip()
    return text


def compute_wer_cer(reference: str, hypothesis: str) -> tuple[float, float]:
    import jiwer

    ref = normalize_for_scoring(reference)
    hyp = normalize_for_scoring(hypothesis)
    if not ref:
        return (0.0, 0.0)
    if not hyp:
        return (1.0, 1.0)

    wer = jiwer.wer(ref, hyp)
    cer = jiwer.cer(ref, hyp)
    return (wer, cer)


# ---------------------------------------------------------------------------
# Hauptablauf
# ---------------------------------------------------------------------------

def check_mapping_mode(pdf_paths: dict[str, Path], transcript_paths: dict[str, Path]) -> None:
    print("=== Zuordnung pruefen (kein Ollama-Aufruf) ===\n")
    if MAPPING_CSV.exists():
        MAPPING_CSV.unlink()

    any_data = False
    for klasse in ("IAF31", "IAF32"):
        pdf_path = pdf_paths[klasse]
        transcript_path = transcript_paths[klasse]

        if not pdf_path.exists():
            print(f"  {klasse}: PDF nicht gefunden unter {pdf_path} -- uebersprungen.")
            continue
        if not transcript_path.exists():
            print(f"  {klasse}: Ground-Truth-Datei nicht gefunden unter {transcript_path} -- uebersprungen.")
            continue

        any_data = True
        gt_students = load_ground_truth(transcript_path, klasse)
        print(f"  {klasse}: {len(gt_students)} Schueler in Ground Truth gefunden.")

        pages_dir = PAGES_DIR
        page_paths = render_pdf_to_pages(pdf_path, pages_dir, klasse)
        print(f"  {klasse}: {len(page_paths)} Seiten im PDF.")

        rows = build_mapping(klasse, page_paths, gt_students)
        write_mapping_csv(rows, MAPPING_CSV)

    if not any_data:
        print("\nKeine PDFs oder Ground-Truth-Dateien gefunden. Bitte Pfade mit --exam4-dir pruefen.")
        return

    print(f"\nZuordnungstabelle geschrieben nach: {MAPPING_CSV}")
    print("BITTE PRUEFEN: Oeffne die Datei (z.B. in Excel/Numbers) und kontrolliere,")
    print("ob page_start/page_end wirklich zum jeweiligen student_id passen.")
    print("Zeilen mit Quelle 'gleichverteilt (PRUEFEN)' sind Schaetzungen und muessen")
    print("von Hand korrigiert werden, bevor der eigentliche Test sinnvolle Ergebnisse liefert.")


def run_test(pdf_paths: dict[str, Path], transcript_paths: dict[str, Path], model: str,
             mock: bool, host: str, limit_students: Optional[int], seed: int) -> None:
    rng = random.Random(seed)

    if not MAPPING_CSV.exists():
        print("Keine page_mapping.csv gefunden. Fuehre zuerst aus:")
        print("  python3 handschrift_test.py --check-mapping")
        sys.exit(1)

    mapping_rows = read_mapping_csv(MAPPING_CSV)
    print(f"Zuordnung geladen: {len(mapping_rows)} Schueler-Eintraege aus {MAPPING_CSV.name}")

    gt_by_class: dict[str, dict[str, StudentGT]] = {}
    for klasse, tpath in transcript_paths.items():
        students = load_ground_truth(tpath, klasse)
        gt_by_class[klasse] = {s.student_id: s for s in students}

    if limit_students:
        mapping_rows = mapping_rows[:limit_students]
        print(f"  (Testlauf begrenzt auf die ersten {limit_students} Schueler-Eintraege)")

    if mock:
        print(f"MOCK-MODUS aktiv: Ollama wird NICHT aufgerufen, Antworten werden simuliert.\n")
    else:
        print(f"ECHTER LAUF: Modell '{model}' auf {host}\n")

    RAW_DIR.mkdir(parents=True, exist_ok=True)

    # Ergebnisstruktur: pro Schueler, pro Variante: wer, cer, n_pages_used
    results: list[dict[str, Any]] = []

    for row in mapping_rows:
        gt_map = gt_by_class.get(row.klasse, {})
        gt = gt_map.get(row.student_id)
        if gt is None:
            print(f"  UEBERSPRUNGEN: {row.student_id} ({row.klasse}) hat keine Ground Truth.")
            continue
        if not gt.text.strip():
            print(f"  UEBERSPRUNGEN: {row.student_id} hat leeren Ground-Truth-Text.")
            continue

        page_indices = list(range(row.page_start, row.page_end + 1))
        student_result: dict[str, Any] = {
            "student_id": row.student_id,
            "klasse": row.klasse,
            "n_pages": len(page_indices),
            "variants": {},
        }

        # Fuer den Mock-Modus: Ground Truth einmal pro Schueler in
        # Seiten-Abschnitte aufteilen (nicht pro Variante neu, damit alle
        # drei Varianten auf denselben Textabschnitten arbeiten).
        gt_chunks_per_page = split_text_into_chunks(gt.text, len(page_indices)) if mock else []

        for variant in PROMPT_VARIANTS:
            hyp_parts = []
            for page_pos, page_no in enumerate(page_indices):
                page_path = PAGES_DIR / f"{row.klasse}_p{page_no:04d}.png"
                if not page_path.exists():
                    print(f"    WARNUNG: Seite {page_path.name} nicht gerendert, uebersprungen.")
                    continue

                if mock:
                    chunk = gt_chunks_per_page[page_pos] if page_pos < len(gt_chunks_per_page) else ""
                    hyp_text = mock_ollama_response(chunk, variant, rng)
                else:
                    prompt = PROMPTS[variant]
                    try:
                        hyp_text = call_ollama_vision(model, prompt, page_path, host=host)
                    except RuntimeError as e:
                        print(f"    ABBRUCH: {e}")
                        sys.exit(1)
                    raw_path = RAW_DIR / f"{row.student_id}_{variant}_p{page_no:04d}.txt"
                    raw_path.write_text(hyp_text, encoding="utf-8")
                hyp_parts.append(hyp_text)

            hypothesis = "\n".join(hyp_parts)
            wer, cer = compute_wer_cer(gt.text, hypothesis)
            student_result["variants"][variant] = {"wer": wer, "cer": cer}
            print(f"  {row.student_id} [{variant:12s}] WER={wer:.3f}  CER={cer:.3f}")

        results.append(student_result)

    RESULTS_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(RESULTS_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nErgebnisse gespeichert: {RESULTS_JSON}")

    write_ergebnis_md(results, model=model, mock=mock)
    print(f"Ergebnisbericht geschrieben: {ERGEBNIS_MD}")


def aggregate(results: list[dict[str, Any]]) -> dict[str, Any]:
    per_variant: dict[str, dict[str, list[float]]] = {v: {"wer": [], "cer": []} for v in PROMPT_VARIANTS}
    per_student_overall: dict[str, dict[str, float]] = {}

    for r in results:
        student_wers = []
        student_cers = []
        for variant in PROMPT_VARIANTS:
            v = r["variants"].get(variant)
            if not v:
                continue
            per_variant[variant]["wer"].append(v["wer"])
            per_variant[variant]["cer"].append(v["cer"])
            student_wers.append(v["wer"])
            student_cers.append(v["cer"])
        if student_wers:
            per_student_overall[r["student_id"]] = {
                "wer": sum(student_wers) / len(student_wers),
                "cer": sum(student_cers) / len(student_cers),
            }

    def avg(lst: list[float]) -> float:
        return sum(lst) / len(lst) if lst else 0.0

    variant_summary = {
        v: {"wer": avg(d["wer"]), "cer": avg(d["cer"]), "n": len(d["wer"])}
        for v, d in per_variant.items()
    }

    all_wers = [w for d in per_variant.values() for w in d["wer"]]
    all_cers = [c for d in per_variant.values() for c in d["cer"]]
    overall = {"wer": avg(all_wers), "cer": avg(all_cers)}

    best_variant = min(variant_summary.items(), key=lambda kv: kv[1]["wer"])[0] if variant_summary else None

    return {
        "per_variant": variant_summary,
        "per_student": per_student_overall,
        "overall": overall,
        "best_variant": best_variant,
    }


def interpret(wer: float) -> str:
    if wer < THRESHOLD_PILOT:
        return "pilotfaehig"
    elif wer < THRESHOLD_SELFCHECK:
        return "nur mit Schueler-Selbstpruefung des Transkripts"
    else:
        return "Pivot auf getippte Texte empfohlen"


def write_ergebnis_md(results: list[dict[str, Any]], model: str, mock: bool) -> None:
    agg = aggregate(results)
    overall_wer = agg["overall"]["wer"]
    overall_cer = agg["overall"]["cer"]

    lines = []
    lines.append("# Ergebnis: Machbarkeitstest Handschrifterkennung (AP12)")
    lines.append("")
    modus = "MOCK-Lauf (simulierte Antworten, keine echte Ollama-Erkennung)" if mock else f"Echter Lauf mit Modell '{model}'"
    lines.append(f"Modus: {modus}")
    lines.append(f"Anzahl ausgewerteter Schueler: {len(results)}")
    lines.append("")

    lines.append("## Gesamtergebnis")
    lines.append("")
    lines.append(f"- Wortfehlerrate (WER) gesamt: **{overall_wer*100:.1f}%**")
    lines.append(f"- Zeichenfehlerrate (CER) gesamt: **{overall_cer*100:.1f}%**")
    lines.append(f"- Einschaetzung: **{interpret(overall_wer)}**")
    lines.append("")

    lines.append("## Ergebnis pro Prompt-Variante")
    lines.append("")
    lines.append("| Variante | WER | CER | Anzahl Messungen | Einschaetzung |")
    lines.append("|---|---|---|---|---|")
    for variant in PROMPT_VARIANTS:
        v = agg["per_variant"].get(variant, {"wer": 0, "cer": 0, "n": 0})
        lines.append(f"| {variant} | {v['wer']*100:.1f}% | {v['cer']*100:.1f}% | {v['n']} | {interpret(v['wer'])} |")
    lines.append("")
    if agg["best_variant"]:
        lines.append(f"Beste Variante (niedrigste WER): **{agg['best_variant']}**")
    lines.append("")

    lines.append("## Ergebnis pro Schueler")
    lines.append("")
    lines.append("| Schueler | WER (Durchschnitt ueber Varianten) | CER (Durchschnitt) | Einschaetzung |")
    lines.append("|---|---|---|---|")
    for sid, vals in sorted(agg["per_student"].items()):
        lines.append(f"| {sid} | {vals['wer']*100:.1f}% | {vals['cer']*100:.1f}% | {interpret(vals['wer'])} |")
    lines.append("")

    lines.append("## Interpretation nach Schwellen")
    lines.append("")
    lines.append("Festgelegte Schwellen fuer die Entscheidung (siehe BAUPLAN_gemmpen-teacher.md, Gate 1):")
    lines.append("")
    lines.append("- unter 5% WER: **pilotfaehig**, Handschrifterkennung kann direkt eingesetzt werden")
    lines.append("- 5-15% WER: **nur mit Schueler-Selbstpruefung des Transkripts** (Schueler bestaetigt/korrigiert das erkannte Transkript, bevor bewertet wird)")
    lines.append("- ueber 15% WER: **Pivot auf getippte Texte empfohlen** (Handschrifterkennung ist noch nicht zuverlaessig genug fuer den produktiven Einsatz)")
    lines.append("")

    band = interpret(overall_wer)
    if band == "pilotfaehig":
        empfehlung = (
            "Die gemessene Fehlerrate liegt unter 5%. Ein Pilotbetrieb mit echter Handschrift "
            "erscheint machbar. Empfehlung: mit der besten Prompt-Variante in AP3 weiterarbeiten, "
            "die Pruefansicht (AP6) bleibt trotzdem Pflicht, da Einzelseiten weiterhin abweichen koennen."
        )
    elif band == "nur mit Schueler-Selbstpruefung des Transkripts":
        empfehlung = (
            "Die gemessene Fehlerrate liegt zwischen 5% und 15%. Empfehlung: die Pruefansicht (AP6) "
            "ist nicht optional, sondern zentraler Pflichtschritt vor jeder Bewertung. Schueler oder "
            "Lehrkraft muessen das erkannte Transkript aktiv bestaetigen. Kein automatischer Uebergang "
            "von Erkennung zu Bewertung ohne diesen Schritt."
        )
    else:
        empfehlung = (
            "Die gemessene Fehlerrate liegt ueber 15%. Empfehlung: Handschrifterkennung in dieser Form "
            "nicht produktiv einsetzen. Pivot pruefen auf getippte Schuelertexte (z.B. Abschreiben lassen "
            "oder direkte Texteingabe) als Eingangsweg, bis bessere Vision-Modelle oder mehr Bildvorverarbeitung "
            "(Kontrastanpassung, Entzerrung) zur Verfuegung stehen."
        )
    lines.append(f"**Empfehlung fuer dieses Ergebnis:** {empfehlung}")
    lines.append("")

    if mock:
        lines.append("## Hinweis")
        lines.append("")
        lines.append(
            "Dies ist ein MOCK-Lauf zur Pruefung der Auswertungslogik (kuenstlich verfaelschte "
            "Ground-Truth-Texte als simulierte Modellantworten). Die Zahlen oben sind NICHT das "
            "echte Testergebnis. Fuer das echte Ergebnis: "
            "`python3 handschrift_test.py --model <vision-modell>` mit laufendem Ollama ausfuehren."
        )
        lines.append("")

    ERGEBNIS_MD.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_pdf_override(values: list[str]) -> dict[str, Path]:
    overrides = {}
    for v in values:
        if "=" not in v:
            print(f"FEHLER: --pdf erwartet Format iaf31=/pfad/zur/datei.pdf, bekam: {v}")
            sys.exit(1)
        key, path = v.split("=", 1)
        overrides[key.strip().upper()] = Path(path.strip())
    return overrides


def main():
    parser = argparse.ArgumentParser(
        description="Machbarkeitstest Handschrifterkennung fuer gemmpen-teacher (AP12).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--exam4-dir", type=Path, default=EXAM4_DIR,
                         help=f"Pfad zum Exam4-Ordner (Default: {EXAM4_DIR})")
    parser.add_argument("--pdf", action="append", default=[],
                         help="PDF-Pfad ueberschreiben, Format iaf31=/pfad/zur/datei.pdf (kann mehrfach angegeben werden)")
    parser.add_argument("--model", default="gemma3:27b",
                         help="Ollama-Modellname fuer die Vision-Erkennung (Default: gemma3:27b, ZU BESTAETIGEN)")
    parser.add_argument("--host", default="http://localhost:11434",
                         help="Ollama-Host (Default: http://localhost:11434)")
    parser.add_argument("--check-mapping", action="store_true",
                         help="Nur Seite-zu-Schueler-Zuordnung erzeugen/aktualisieren und stoppen (kein Ollama-Aufruf)")
    parser.add_argument("--mock", action="store_true",
                         help="Mock-Modus: simuliert Ollama-Antworten (Ground Truth mit kuenstlichen Fehlern), kein echter Ollama-Aufruf noetig")
    parser.add_argument("--limit-students", type=int, default=None,
                         help="Nur die ersten N Schueler auswerten (fuer schnelle Testlaeufe)")
    parser.add_argument("--seed", type=int, default=42,
                         help="Zufalls-Seed fuer den Mock-Modus (Reproduzierbarkeit)")
    args = parser.parse_args()

    exam4_dir = args.exam4_dir
    pdf_paths = {
        "IAF31": exam4_dir / "iaf31_Exam4.pdf",
        "IAF32": exam4_dir / "iaf32_exam4.pdf",
    }
    transcript_paths = {
        "IAF31": exam4_dir / "transkripte" / "iaf31_transkripte.jsonl",
        "IAF32": exam4_dir / "transkripte" / "iaf32_transkripte.jsonl",
    }
    overrides = parse_pdf_override(args.pdf)
    for klasse, path in overrides.items():
        if klasse in pdf_paths:
            pdf_paths[klasse] = path

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if args.check_mapping:
        check_mapping_mode(pdf_paths, transcript_paths)
        return

    if not args.mock:
        # Vorab pruefen, ob Ollama ueberhaupt erreichbar ist, mit klarer Fehlermeldung
        import requests
        try:
            requests.get(f"{args.host.rstrip('/')}/api/tags", timeout=5)
        except requests.exceptions.ConnectionError:
            print("FEHLER: Die Auswertung ist nicht erreichbar. Ist das Programm Ollama gestartet?")
            print(f"Erwarteter Host: {args.host}")
            sys.exit(1)

    run_test(pdf_paths, transcript_paths, model=args.model, mock=args.mock,
              host=args.host, limit_students=args.limit_students, seed=args.seed)


if __name__ == "__main__":
    main()
