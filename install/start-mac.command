#!/usr/bin/env bash
#
# start-mac.command
#
# Startskript fuer GemmPen Teacher auf dem Mac. Zum Starten einfach
# doppelklicken (Finder fuehrt .command-Dateien im Terminal aus).
#
# Das Skript prueft der Reihe nach alles, was fuer den Start noetig ist,
# und meldet jeden Schritt in einfacher Sprache. Bei einem Problem stoppt
# es NIE stumm: es steht immer ein Satz da, was zu tun ist.
#
# Trockenlauf-Modus: mit dem Argument "check" fuehrt das Skript nur die
# Pruefungen aus (Node, Ollama, Modelle, Abhaengigkeiten) und startet die
# App NICHT. Das wird auch in der Kommandozeile unter Linux genutzt, um
# das Skript ohne echten Mac zu testen. Aufruf: ./start-mac.command check
#
# Bash-Kompatibilitaet: Dieses Skript ist bewusst in einfachem, POSIX-nahem
# Bash geschrieben (kein "local -n", keine Bash-4-only-Arrays), damit es
# sowohl mit der auf dem Mac vorinstallierten Bash 3.2 als auch mit neueren
# Bash-Versionen und unter Linux (Sandbox-Test) laeuft.

set -u

# ---------------------------------------------------------------------------
# Grundeinrichtung
# ---------------------------------------------------------------------------

# Ordner dieses Skripts ermitteln, damit der Doppelklick von ueberall
# funktioniert (Finder startet mit einem beliebigen Arbeitsordner).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
# Das App-Projekt liegt eine Ebene ueber install/.
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DRY_RUN=0
if [ "${1:-}" = "check" ]; then
  DRY_RUN=1
fi

# macOS-Erkennung: "open" gibt es nur auf dem Mac. Unter Linux (Sandbox-Test)
# wird der Browser-Start uebersprungen statt zu scheitern.
IS_MAC=0
if [ "$(uname -s 2>/dev/null)" = "Darwin" ]; then
  IS_MAC=1
fi

# Sorgt dafuer, dass sich das Terminalfenster am Ende NICHT von selbst
# schliesst, wenn etwas schiefgeht oder das Skript fertig ist. Das Fenster
# bleibt offen bezw. wartet auf eine Taste, damit die Meldung lesbar bleibt.
pause_and_exit() {
  local code="$1"
  echo ""
  if [ "$IS_MAC" = "1" ]; then
    echo "Druecken Sie eine Taste zum Beenden."
    # -n 1: genau ein Zeichen reicht, -s: nicht anzeigen, -r: Backslash roh lassen.
    read -n 1 -s -r || true
  fi
  exit "$code"
}

line() {
  echo "----------------------------------------------------------------------"
}

echo ""
line
echo "GemmPen wird vorbereitet."
line
echo ""

# ---------------------------------------------------------------------------
# Schritt 1: Ist Node vorhanden?
# ---------------------------------------------------------------------------

echo "Schritt 1 von 6: Wird geprueft, ob die noetige Grundausstattung (Node.js) vorhanden ist ..."

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "Node.js wurde auf diesem Rechner nicht gefunden."
  echo ""
  echo "Was zu tun ist:"
  echo "1. Oeffnen Sie https://nodejs.org"
  echo "2. Laden Sie die empfohlene Version herunter (Button 'LTS') und installieren Sie sie."
  echo "3. Starten Sie danach dieses Programm erneut per Doppelklick."
  echo ""
  echo "Druecken Sie eine Taste zum Beenden."
  read -n 1 -s -r || true
  exit 1
fi

NODE_VERSION="$(node --version 2>/dev/null || echo "unbekannt")"
echo "Node.js ist vorhanden (Version $NODE_VERSION)."
echo ""

# ---------------------------------------------------------------------------
# Schritt 2: Ist Ollama vorhanden?
# ---------------------------------------------------------------------------

echo "Schritt 2 von 6: Wird geprueft, ob die Auswertung (Ollama) installiert ist ..."

if ! command -v ollama >/dev/null 2>&1; then
  echo ""
  echo "Die Auswertung (Ollama) wurde auf diesem Rechner nicht gefunden."
  echo ""
  echo "Was zu tun ist:"
  echo "1. Oeffnen Sie https://ollama.com"
  echo "2. Laden Sie das Programm herunter und installieren Sie es."
  echo "3. Starten Sie danach dieses Programm erneut per Doppelklick."
  echo ""
  echo "Druecken Sie eine Taste zum Beenden."
  read -n 1 -s -r || true
  exit 1
fi

echo "Die Auswertung (Ollama) ist installiert."
echo ""

# ---------------------------------------------------------------------------
# Schritt 3: Laeuft Ollama? Falls nicht, versuchen zu starten.
# ---------------------------------------------------------------------------

echo "Schritt 3 von 6: Wird geprueft, ob die Auswertung gerade laeuft ..."

OLLAMA_URL="http://localhost:11434"

ollama_is_running() {
  # /api/tags antwortet nur, wenn Ollama tatsaechlich laeuft.
  curl -s -m 3 "$OLLAMA_URL/api/tags" >/dev/null 2>&1
}

if ollama_is_running; then
  echo "Die Auswertung laeuft bereits."
else
  echo "Die Auswertung laeuft noch nicht. Sie wird jetzt im Hintergrund gestartet ..."
  if [ "$DRY_RUN" = "1" ]; then
    echo "(Trockenlauf: der tatsaechliche Start wird uebersprungen.)"
  else
    # "ollama serve" im Hintergrund starten, Ausgabe in eine Log-Datei
    # statt auf den Bildschirm (damit unser Skript weiterlaufen kann).
    OLLAMA_LOG="$APP_DIR/install/ollama-start.log"
    nohup ollama serve >"$OLLAMA_LOG" 2>&1 &
    # Kurz warten und mehrfach pruefen, ob die Auswertung ansprechbar wird.
    STARTED=0
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      sleep 1
      if ollama_is_running; then
        STARTED=1
        break
      fi
    done
    if [ "$STARTED" = "1" ]; then
      echo "Die Auswertung laeuft jetzt."
    else
      echo ""
      echo "Die Auswertung konnte nicht automatisch gestartet werden."
      echo ""
      echo "Was zu tun ist:"
      echo "1. Oeffnen Sie die Anwendung 'Ollama' von Hand (z. B. ueber Launchpad oder Programme)."
      echo "2. Warten Sie, bis das Symbol in der Menueleiste erscheint."
      echo "3. Starten Sie danach dieses Programm erneut per Doppelklick."
      pause_and_exit 1
    fi
  fi
fi
echo ""

# ---------------------------------------------------------------------------
# Schritt 4: Sind die benoetigten Modelle geladen?
# ---------------------------------------------------------------------------

echo "Schritt 4 von 6: Wird geprueft, ob die benoetigten Sprachmodelle geladen sind ..."

APP_CONFIG_FILE="$APP_DIR/data/config/app.json"

# Default-Modellnamen. Muessen mit DEFAULT_APP_CONFIG in lib/storage.ts und
# mit data/config/app.json uebereinstimmen (Stand: ZU BESTAETIGEN durch
# Svenja, siehe UEBERGABE.md). Wenn Svenja die Defaults im Code aendert,
# hier mitziehen.
DEFAULT_VISION_MODEL="gemma3:12b"
DEFAULT_GRADING_MODEL="gemma3:12b"

VISION_MODEL="$DEFAULT_VISION_MODEL"
GRADING_MODEL="$DEFAULT_GRADING_MODEL"

# Modellnamen aus data/config/app.json lesen, falls die Datei existiert.
# Bewusst ohne externes JSON-Werkzeug (kein jq als Voraussetzung), damit das
# Skript ohne Zusatzinstallation laeuft: einfache Zeilensuche reicht fuer
# die flache app.json-Struktur ("visionModel": "...", "gradingModel": "...").
read_json_string_field() {
  # $1 = Dateipfad, $2 = Feldname
  local file="$1"
  local field="$2"
  if [ -f "$file" ]; then
    sed -n "s/.*\"$field\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$file" | head -n 1
  fi
}

if [ -f "$APP_CONFIG_FILE" ]; then
  FOUND_VISION="$(read_json_string_field "$APP_CONFIG_FILE" "visionModel")"
  FOUND_GRADING="$(read_json_string_field "$APP_CONFIG_FILE" "gradingModel")"
  if [ -n "$FOUND_VISION" ]; then
    VISION_MODEL="$FOUND_VISION"
  fi
  if [ -n "$FOUND_GRADING" ]; then
    GRADING_MODEL="$FOUND_GRADING"
  fi
  echo "Einstellungen aus data/config/app.json gefunden."
else
  echo "Es gibt noch keine eigene Einstellung, es werden die Standard-Modelle verwendet."
fi

echo "Benoetigt fuer das Lesen der Handschrift: $VISION_MODEL"
echo "Benoetigt fuer die Bewertung: $GRADING_MODEL"
echo ""

# Eindeutige Liste der benoetigten Modelle bilden (vision und grading sind
# in der Praxis oft identisch).
MODELS_TO_CHECK="$VISION_MODEL"
if [ "$GRADING_MODEL" != "$VISION_MODEL" ]; then
  MODELS_TO_CHECK="$MODELS_TO_CHECK $GRADING_MODEL"
fi

model_is_loaded() {
  # $1 = Modellname. Prueft gegen "ollama list", da das auch ohne
  # laufenden HTTP-Server-Umweg funktioniert, sofern Ollama installiert ist.
  local model="$1"
  ollama list 2>/dev/null | awk '{print $1}' | grep -Fxq "$model"
}

MISSING_ANY=0
for MODEL in $MODELS_TO_CHECK; do
  if [ "$DRY_RUN" = "1" ]; then
    # Im Trockenlauf ohne echtes Ollama nur melden, kein Laden anstossen.
    if command -v ollama >/dev/null 2>&1 && ollama_is_running && model_is_loaded "$MODEL"; then
      echo "Modell '$MODEL' ist bereits geladen."
    else
      echo "Modell '$MODEL' ist (Stand Trockenlauf) noch nicht bestaetigt geladen. Im echten Start wuerde es jetzt heruntergeladen."
      MISSING_ANY=1
    fi
    continue
  fi

  if model_is_loaded "$MODEL"; then
    echo "Modell '$MODEL' ist bereits geladen."
  else
    echo "Modell '$MODEL' fehlt noch und wird jetzt heruntergeladen."
    echo "Das kann beim ersten Mal 10 bis 20 Minuten dauern, bitte dieses Fenster offen lassen."
    if ! ollama pull "$MODEL"; then
      echo ""
      echo "Das Modell '$MODEL' konnte nicht heruntergeladen werden."
      echo ""
      echo "Was zu tun ist:"
      echo "1. Pruefen Sie Ihre Internetverbindung."
      echo "2. Fuehren Sie in einem Terminal von Hand aus: ollama pull $MODEL"
      echo "3. Starten Sie danach dieses Programm erneut per Doppelklick."
      pause_and_exit 1
    fi
    echo "Modell '$MODEL' ist jetzt geladen."
  fi
done

if [ "$DRY_RUN" = "1" ] && [ "$MISSING_ANY" = "1" ]; then
  echo ""
  echo "(Trockenlauf: fehlende Modelle wurden nur gemeldet, nicht heruntergeladen.)"
fi
echo ""

# ---------------------------------------------------------------------------
# Schritt 5: Sind die Abhaengigkeiten der App installiert?
# ---------------------------------------------------------------------------

echo "Schritt 5 von 6: Wird geprueft, ob die App-Bausteine installiert sind ..."

cd "$APP_DIR" || {
  echo "Der App-Ordner wurde nicht gefunden: $APP_DIR"
  pause_and_exit 1
}

if [ ! -d "node_modules" ]; then
  echo "Das ist der erste Start. Die App-Bausteine werden jetzt einmalig installiert."
  echo "Das kann einige Minuten dauern, bitte dieses Fenster offen lassen."
  if [ "$DRY_RUN" = "1" ]; then
    echo "(Trockenlauf: npm install wird uebersprungen.)"
  else
    if ! npm install; then
      echo ""
      echo "Die App-Bausteine konnten nicht installiert werden."
      echo ""
      echo "Was zu tun ist:"
      echo "1. Pruefen Sie Ihre Internetverbindung."
      echo "2. Fuehren Sie in einem Terminal von Hand aus: cd \"$APP_DIR\" && npm install"
      echo "3. Starten Sie danach dieses Programm erneut per Doppelklick."
      pause_and_exit 1
    fi
    echo "Die App-Bausteine sind installiert."
  fi
else
  echo "Die App-Bausteine sind bereits installiert."
fi
echo ""

# ---------------------------------------------------------------------------
# Trockenlauf endet hier: nur Pruefungen, kein Bauen/Starten.
# ---------------------------------------------------------------------------

if [ "$DRY_RUN" = "1" ]; then
  line
  echo "Trockenlauf abgeschlossen. Alle Pruefungen wurden durchlaufen."
  echo "Die App wurde NICHT gebaut und NICHT gestartet (Trockenlauf-Modus)."
  line
  pause_and_exit 0
fi

# ---------------------------------------------------------------------------
# Schritt 6: App bauen (falls noetig) und starten, Browser oeffnen.
# ---------------------------------------------------------------------------

echo "Schritt 6 von 6: Die App wird vorbereitet und gestartet ..."

if [ ! -d ".next" ]; then
  echo "Das ist der erste Start. Die App wird jetzt einmalig aufbereitet."
  echo "Das kann einige Minuten dauern, bitte dieses Fenster offen lassen."
  if ! npm run build; then
    echo ""
    echo "Die App konnte nicht aufbereitet werden."
    echo ""
    echo "Was zu tun ist:"
    echo "1. Fuehren Sie in einem Terminal von Hand aus: cd \"$APP_DIR\" && npm run build"
    echo "2. Lesen Sie die dort angezeigte Fehlermeldung."
    echo "3. Wenn unklar bleibt was zu tun ist, wenden Sie sich an die Person, die Ihnen GemmPen gegeben hat."
    pause_and_exit 1
  fi
  echo "Die App ist aufbereitet."
else
  echo "Die App ist bereits aufbereitet."
fi
echo ""

echo "Die App wird jetzt gestartet ..."
echo "Dieses Fenster muss waehrend der Nutzung offen bleiben. Schliessen beendet GemmPen."
echo ""

# Browser erst oeffnen, wenn der Server wirklich antwortet (statt eine feste
# Wartezeit zu raten). Das laeuft im Hintergrund, waehrend "npm run start"
# im Vordergrund das Fenster besetzt haelt.
open_browser_when_ready() {
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    sleep 1
    if curl -s -m 2 "http://localhost:3000" >/dev/null 2>&1; then
      if [ "$IS_MAC" = "1" ]; then
        open "http://localhost:3000"
      else
        # Unter Linux (Sandbox-Test) gibt es kein "open". Nur melden.
        echo "(Hier wuerde auf dem Mac jetzt der Browser mit http://localhost:3000 geoeffnet.)"
      fi
      return 0
    fi
  done
}

open_browser_when_ready &

# npm run start bleibt im Vordergrund. So haelt das Doppelklick-Fenster
# den Server am Leben, bis die Lehrkraft es schliesst.
npm run start
START_EXIT_CODE=$?

if [ "$START_EXIT_CODE" -ne 0 ]; then
  echo ""
  echo "Die App konnte nicht gestartet werden oder wurde beendet."
  echo ""
  echo "Was zu tun ist:"
  echo "1. Starten Sie dieses Programm erneut per Doppelklick."
  echo "2. Wenn das Problem bleibt, wenden Sie sich an die Person, die Ihnen GemmPen gegeben hat."
  pause_and_exit 1
fi

pause_and_exit 0
