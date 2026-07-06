# AP9 i18n Validierung - Suchmuster und Ergebnisse

## Suchmuster für hartcodierte UI-Strings

Die folgenden Grep-Muster wurden genutzt, um hartcodierte deutsche und englische Strings in JSX/TSX zu finden:

### 1. Textliterale in JSX-Content
```bash
grep -r --include="*.tsx" --include="*.ts" -E '>\s*[^{$]+</[a-zA-Z]' app/ components/
```
Sucht nach Textknoten in JSX, die nicht mit `{` oder `$` beginnen (also keine Variablen/Template-Expressions).

### 2. Häufige UI-Termini (deutsch/englisch)
```bash
grep -r --include="*.tsx" '["'\''](?:Fehler|Error|Laden|Loading|Speichern|Save|Erfolg|Success)["'\'']' app/ components/
```
Sucht nach häufigen hartcodierten UI-Strings.

### 3. Python-Validierung
`check_i18n.py` scannt alle TSX-Dateien und prüft:
- Dateien, die **nicht** `useI18n` oder i18n-Importe enthalten
- JSX-Textknoten mit minimalem Rausch (ausgenommen bekannte Systemwörter)
- Länge > 2 Zeichen (um `<>`, `</>` zu ignorieren)

### 4. Locale-Schlüssel-Synchronisation
```bash
python3 << EOF
import json
with open('locales/de.json') as f: de = json.load(f)
with open('locales/en.json') as f: en = json.load(f)
assert set(de.keys()) == set(en.keys()), f"Keys mismatch"
