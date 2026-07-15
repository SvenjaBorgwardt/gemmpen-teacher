@echo off
REM ============================================================================
REM start-windows.bat
REM
REM Startskript fuer GemmPen Teacher unter Windows. Zum Starten einfach
REM doppelklicken.
REM
REM Das Skript prueft der Reihe nach alles, was fuer den Start noetig ist,
REM und meldet jeden Schritt in einfacher Sprache. Bei einem Problem stoppt
REM es NIE stumm: es steht immer ein Satz da, was zu tun ist, und am Ende
REM immer "Druecken Sie eine Taste zum Beenden.", bevor sich das Fenster
REM schliesst.
REM
REM Trockenlauf-Modus: mit dem Argument "check" fuehrt das Skript nur die
REM Pruefungen aus (Node, Ollama, Modelle, Abhaengigkeiten) und startet die
REM App NICHT. Aufruf in der Eingabeaufforderung: start-windows.bat check
REM
REM Hinweis fuer die Pruefung dieses Skripts: ein echter Testlauf unter
REM Windows war im Rahmen dieser Arbeit NICHT moeglich (die Entwicklungs-
REM umgebung ist ein Mac/Linux-System ohne Windows). Dieses Skript wurde
REM sorgfaeltig von Hand gegengelesen und spiegelt exakt dieselbe Logik wie
REM start-mac.command, aber es wurde nicht auf einem echten Windows-Rechner
REM ausgefuehrt. Der echte Test findet auf Svenjas Mac statt (siehe
REM install/README.md); ein Windows-Test ist ein offener Punkt.
REM ============================================================================

setlocal EnableExtensions EnableDelayedExpansion

REM ----------------------------------------------------------------------
REM Grundeinrichtung
REM ----------------------------------------------------------------------

REM %~dp0 ist der Ordner, in dem diese .bat-Datei liegt (mit Backslash am
REM Ende). Das App-Projekt liegt eine Ebene darueber (install\..).
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.."
set "APP_DIR=%CD%"
popd

set "DRY_RUN=0"
if /I "%~1"=="check" set "DRY_RUN=1"

REM Interner Aufruf (siehe Schritt 6): eine zweite, unsichtbare Kopie dieses
REM Fensters wartet nur darauf, dass die App erreichbar ist, und oeffnet dann
REM den Browser. Das laeuft in einem eigenen Mini-Fenster, damit das
REM Hauptfenster fuer "npm run start" frei bleibt. Sofort danach beendet
REM sich diese Kopie wieder (goto :eof).
if /I "%~1"=="__wait_and_open_browser__" (
  for /L %%i in (1,1,20) do (
    timeout /t 1 /nobreak >nul
    powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri 'http://localhost:3000' | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
    if not errorlevel 1 (
      start "" "http://localhost:3000"
      goto :eof
    )
  )
  goto :eof
)

set "DEFAULT_VISION_MODEL=gemma4:12b"
set "DEFAULT_GRADING_MODEL=gemma4:12b"
set "VISION_MODEL=%DEFAULT_VISION_MODEL%"
set "GRADING_MODEL=%DEFAULT_GRADING_MODEL%"

echo.
echo ----------------------------------------------------------------------
echo GemmPen wird vorbereitet.
echo ----------------------------------------------------------------------
echo.

REM ----------------------------------------------------------------------
REM Schritt 1: Ist Node vorhanden?
REM ----------------------------------------------------------------------

echo Schritt 1 von 6: Wird geprueft, ob die noetige Grundausstattung (Node.js) vorhanden ist ...

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js wurde auf diesem Rechner nicht gefunden.
  echo.
  echo Was zu tun ist:
  echo 1. Oeffnen Sie https://nodejs.org
  echo 2. Laden Sie die empfohlene Version herunter ^(Button "LTS"^) und installieren Sie sie.
  echo 3. Starten Sie danach dieses Programm erneut per Doppelklick.
  echo.
  goto :fail
)

for /f "delims=" %%V in ('node --version 2^>nul') do set "NODE_VERSION=%%V"
echo Node.js ist vorhanden ^(Version %NODE_VERSION%^).
echo.

REM ----------------------------------------------------------------------
REM Schritt 2: Ist Ollama vorhanden?
REM ----------------------------------------------------------------------

echo Schritt 2 von 6: Wird geprueft, ob die Auswertung (Ollama) installiert ist ...

where ollama >nul 2>nul
if errorlevel 1 (
  echo.
  echo Die Auswertung ^(Ollama^) wurde auf diesem Rechner nicht gefunden.
  echo.
  echo Was zu tun ist:
  echo 1. Oeffnen Sie https://ollama.com
  echo 2. Laden Sie das Programm herunter und installieren Sie es.
  echo 3. Starten Sie danach dieses Programm erneut per Doppelklick.
  echo.
  goto :fail
)

echo Die Auswertung ^(Ollama^) ist installiert.
echo.

REM ----------------------------------------------------------------------
REM Schritt 3: Laeuft Ollama? Falls nicht, versuchen zu starten.
REM ----------------------------------------------------------------------

echo Schritt 3 von 6: Wird geprueft, ob die Auswertung gerade laeuft ...

call :check_ollama_running
if "%OLLAMA_RUNNING%"=="1" (
  echo Die Auswertung laeuft bereits.
) else (
  echo Die Auswertung laeuft noch nicht. Sie wird jetzt im Hintergrund gestartet ...
  if "%DRY_RUN%"=="1" (
    echo ^(Trockenlauf: der tatsaechliche Start wird uebersprungen.^)
  ) else (
    REM "start" mit leerem Titel "" oeffnet ein neues, unabhaengiges Fenster,
    REM damit unser Skript weiterlaufen kann, waehrend Ollama im Hintergrund
    REM hochfaehrt.
    start "" /min ollama serve
    set "STARTED=0"
    for /L %%i in (1,1,10) do (
      timeout /t 1 /nobreak >nul
      call :check_ollama_running
      if "!OLLAMA_RUNNING!"=="1" (
        set "STARTED=1"
        goto :ollama_start_wait_done
      )
    )
    :ollama_start_wait_done
    if "!STARTED!"=="1" (
      echo Die Auswertung laeuft jetzt.
    ) else (
      echo.
      echo Die Auswertung konnte nicht automatisch gestartet werden.
      echo.
      echo Was zu tun ist:
      echo 1. Oeffnen Sie das Programm "Ollama" von Hand ^(z. B. ueber das Startmenue^).
      echo 2. Warten Sie, bis das Symbol unten rechts in der Taskleiste erscheint.
      echo 3. Starten Sie danach dieses Programm erneut per Doppelklick.
      goto :fail
    )
  )
)
echo.

REM ----------------------------------------------------------------------
REM Schritt 4: Sind die benoetigten Modelle geladen?
REM ----------------------------------------------------------------------

echo Schritt 4 von 6: Wird geprueft, ob die benoetigten Sprachmodelle geladen sind ...

set "APP_CONFIG_FILE=%APP_DIR%\data\config\app.json"

if exist "%APP_CONFIG_FILE%" (
  echo Einstellungen aus data\config\app.json gefunden.
  REM Modellnamen aus der flachen app.json-Struktur lesen. Bewusst ohne
  REM externes JSON-Werkzeug (kein zusaetzliches Programm noetig): einfache
  REM Zeilensuche reicht fuer "visionModel": "..." bzw. "gradingModel": "...".
  for /f "usebackq tokens=2 delims=:," %%A in (`findstr /C:"visionModel" "%APP_CONFIG_FILE%"`) do (
    set "RAW=%%A"
    call :extract_json_string RAW FOUND_VISION
  )
  for /f "usebackq tokens=2 delims=:," %%A in (`findstr /C:"gradingModel" "%APP_CONFIG_FILE%"`) do (
    set "RAW=%%A"
    call :extract_json_string RAW FOUND_GRADING
  )
  if defined FOUND_VISION set "VISION_MODEL=!FOUND_VISION!"
  if defined FOUND_GRADING set "GRADING_MODEL=!FOUND_GRADING!"
) else (
  echo Es gibt noch keine eigene Einstellung, es werden die Standard-Modelle verwendet.
)

echo Benoetigt fuer das Lesen der Handschrift: !VISION_MODEL!
echo Benoetigt fuer die Bewertung: !GRADING_MODEL!
echo.

set "MISSING_ANY=0"

call :ensure_model "!VISION_MODEL!"
if "!GRADING_MODEL!" NEQ "!VISION_MODEL!" (
  call :ensure_model "!GRADING_MODEL!"
)

if "%DRY_RUN%"=="1" if "!MISSING_ANY!"=="1" (
  echo.
  echo ^(Trockenlauf: fehlende Modelle wurden nur gemeldet, nicht heruntergeladen.^)
)
echo.

REM ----------------------------------------------------------------------
REM Schritt 5: Sind die Abhaengigkeiten der App installiert?
REM ----------------------------------------------------------------------

echo Schritt 5 von 6: Wird geprueft, ob die App-Bausteine installiert sind ...

cd /d "%APP_DIR%"
if errorlevel 1 (
  echo Der App-Ordner wurde nicht gefunden: %APP_DIR%
  goto :fail
)

if not exist "node_modules" (
  echo Das ist der erste Start. Die App-Bausteine werden jetzt einmalig installiert.
  echo Das kann einige Minuten dauern, bitte dieses Fenster offen lassen.
  if "%DRY_RUN%"=="1" (
    echo ^(Trockenlauf: npm install wird uebersprungen.^)
  ) else (
    call npm install
    if errorlevel 1 (
      echo.
      echo Die App-Bausteine konnten nicht installiert werden.
      echo.
      echo Was zu tun ist:
      echo 1. Pruefen Sie Ihre Internetverbindung.
      echo 2. Oeffnen Sie eine Eingabeaufforderung in "%APP_DIR%" und fuehren Sie aus: npm install
      echo 3. Starten Sie danach dieses Programm erneut per Doppelklick.
      goto :fail
    )
    echo Die App-Bausteine sind installiert.
  )
) else (
  echo Die App-Bausteine sind bereits installiert.
)
echo.

REM ----------------------------------------------------------------------
REM Trockenlauf endet hier: nur Pruefungen, kein Bauen/Starten.
REM ----------------------------------------------------------------------

if "%DRY_RUN%"=="1" (
  echo ----------------------------------------------------------------------
  echo Trockenlauf abgeschlossen. Alle Pruefungen wurden durchlaufen.
  echo Die App wurde NICHT gebaut und NICHT gestartet ^(Trockenlauf-Modus^).
  echo ----------------------------------------------------------------------
  goto :success
)

REM ----------------------------------------------------------------------
REM Schritt 6: App bauen (falls noetig) und starten, Browser oeffnen.
REM ----------------------------------------------------------------------

echo Schritt 6 von 6: Die App wird vorbereitet und gestartet ...

if not exist ".next" (
  echo Das ist der erste Start. Die App wird jetzt einmalig aufbereitet.
  echo Das kann einige Minuten dauern, bitte dieses Fenster offen lassen.
  call npm run build
  if errorlevel 1 (
    echo.
    echo Die App konnte nicht aufbereitet werden.
    echo.
    echo Was zu tun ist:
    echo 1. Oeffnen Sie eine Eingabeaufforderung in "%APP_DIR%" und fuehren Sie aus: npm run build
    echo 2. Lesen Sie die dort angezeigte Fehlermeldung.
    echo 3. Wenn unklar bleibt was zu tun ist, wenden Sie sich an die Person, die Ihnen GemmPen gegeben hat.
    goto :fail
  )
  echo Die App ist aufbereitet.
) else (
  echo Die App ist bereits aufbereitet.
)
echo.

echo Die App wird jetzt gestartet ...
echo Dieses Fenster muss waehrend der Nutzung offen bleiben. Schliessen beendet GemmPen.
echo.

REM Den Browser erst oeffnen, wenn der Server wirklich antwortet, statt eine
REM feste Wartezeit zu raten. Das laeuft in einem eigenen Hintergrund-Fenster,
REM waehrend "npm run start" im Vordergrund dieses Fenster besetzt haelt.
start "" /min cmd /c ""%~f0" __wait_and_open_browser__"

call npm run start
if errorlevel 1 (
  echo.
  echo Die App konnte nicht gestartet werden oder wurde beendet.
  echo.
  echo Was zu tun ist:
  echo 1. Starten Sie dieses Programm erneut per Doppelklick.
  echo 2. Wenn das Problem bleibt, wenden Sie sich an die Person, die Ihnen GemmPen gegeben hat.
  goto :fail
)

goto :success

REM ============================================================================
REM Hilfsroutinen (werden mit "call :name" aufgerufen, danach geht es mit
REM dem naechsten Befehl nach dem Aufruf weiter)
REM ============================================================================

:check_ollama_running
REM Setzt OLLAMA_RUNNING=1, wenn die Auswertung antwortet, sonst 0.
REM Nutzt PowerShell (auf jedem unterstuetzten Windows vorhanden), da ein
REM einfaches "curl"-Kommando nicht auf jeder Windows-Version verfuegbar ist.
set "OLLAMA_RUNNING=0"
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 -Uri 'http://localhost:11434/api/tags'; exit 0 } catch { exit 1 }" >nul 2>nul
if not errorlevel 1 set "OLLAMA_RUNNING=1"
exit /b 0

:extract_json_string
REM Sehr einfache Extraktion des ersten "..."-Werts aus einer Textzeile wie
REM  "visionModel": "gemma4:12b"
REM %1 = Name der Eingabe-Variable, %2 = Name der Ziel-Variable.
setlocal EnableDelayedExpansion
set "V=!%~1!"
REM alles bis zum ersten " abschneiden
for /f "tokens=1* delims=\"" %%X in ("!V!") do set "V=%%Y"
REM den Rest ab dem naechsten " abschneiden
for /f "delims=\"" %%X in ("!V!") do set "V=%%X"
endlocal & set "%~2=%V%"
exit /b 0

:ensure_model
REM %1 = Modellname. Prueft "ollama list" und laedt bei Bedarf mit "ollama pull".
set "MODEL=%~1"
set "MODEL_FOUND=0"
for /f "skip=1 tokens=1" %%M in ('ollama list 2^>nul') do (
  if /I "%%M"=="%MODEL%" set "MODEL_FOUND=1"
)

if "%DRY_RUN%"=="1" (
  if "%MODEL_FOUND%"=="1" (
    echo Modell "%MODEL%" ist bereits geladen.
  ) else (
    echo Modell "%MODEL%" ist ^(Stand Trockenlauf^) noch nicht bestaetigt geladen. Im echten Start wuerde es jetzt heruntergeladen.
    set "MISSING_ANY=1"
  )
  exit /b 0
)

if "%MODEL_FOUND%"=="1" (
  echo Modell "%MODEL%" ist bereits geladen.
  exit /b 0
)

echo Modell "%MODEL%" fehlt noch und wird jetzt heruntergeladen.
echo Das kann beim ersten Mal 10 bis 20 Minuten dauern, bitte dieses Fenster offen lassen.
call ollama pull "%MODEL%"
if errorlevel 1 (
  echo.
  echo Das Modell "%MODEL%" konnte nicht heruntergeladen werden.
  echo.
  echo Was zu tun ist:
  echo 1. Pruefen Sie Ihre Internetverbindung.
  echo 2. Oeffnen Sie eine Eingabeaufforderung und fuehren Sie aus: ollama pull %MODEL%
  echo 3. Starten Sie danach dieses Programm erneut per Doppelklick.
  goto :fail
)
echo Modell "%MODEL%" ist jetzt geladen.
exit /b 0

:success
echo.
echo Druecken Sie eine Taste zum Beenden.
pause >nul
endlocal
exit /b 0

:fail
echo.
echo Druecken Sie eine Taste zum Beenden.
pause >nul
endlocal
exit /b 1
