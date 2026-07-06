#!/usr/bin/env bash
# AP13 Integrationslauf: startet next start, fuehrt den HTTP-Nutzerpfad aus,
# stoppt den Server. Alles in einem Aufruf, damit der Hintergrundprozess
# den Shell-Wechsel nicht ueberleben muss.
#
# Voraussetzung: npm run build ist bereits gelaufen (.next liegt vor) und die
# Base64-Assets liegen in ASSETS (siehe integration-http.mjs Kopf).
#
# Aufruf:
#   bash test/run-integration.sh
set -u

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

PORT="${PORT:-3100}"
export BASE="http://localhost:${PORT}"
export DATA="${DATA:-/tmp/ap13-data}"
export ASSETS="${ASSETS:-/tmp/ap13}"
export OUT="${OUT:-/tmp/ap13-out}"

rm -rf "$DATA"
mkdir -p "$DATA"

# Server im Hintergrund starten, mit isoliertem Datenordner und ohne Ollama
# (die Bewertungs-/Erkennungsrouten fallen auf den Mock zurueck).
GEMMPEN_DATA_DIR="$DATA" PORT="$PORT" npx next start -p "$PORT" > /tmp/ap13-next.log 2>&1 &
SERVER_PID=$!

cleanup() { kill "$SERVER_PID" 2>/dev/null; wait "$SERVER_PID" 2>/dev/null; }
trap cleanup EXIT

# Auf Erreichbarkeit warten.
for i in $(seq 1 40); do
  if curl -s -o /dev/null "http://localhost:${PORT}/"; then break; fi
  sleep 0.5
done

node test/integration-http.mjs
RESULT=$?

echo "--- letzte Serverzeilen ---"
tail -5 /tmp/ap13-next.log
exit $RESULT
