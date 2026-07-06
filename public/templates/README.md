# Scan-Vorlagen

Dieser Ordner enthaelt die druckfertigen Vorlagen fuer GemmPen-Teacher.

## Dateien

- `vorlage-linien.pdf` - Schreibvorlage mit Linien, Linienabstand 12 mm
- `vorlage-kaestchen.pdf` - Schreibvorlage mit Kaestchen, Kaestchengroesse 5 mm
- `scan-anleitung.pdf` - einseitige Anleitung fuer Schueler: Handyfoto oder Scanner
- `templates_build.py` - Python-Skript, das alle drei PDFs erzeugt

## Testausdruck

Vor dem echten Einsatz einmal testweise ausdrucken und pruefen:

1. PDF am Rechner oeffnen und drucken.
2. Im Druckdialog **100 Prozent Skalierung** einstellen.
3. **"An Seite anpassen" (Fit to page / Skalieren) MUSS ausgeschaltet sein.**
   Wenn der Drucker die Seite automatisch skaliert, stimmen die
   Millimeterangaben der Eckmarker nicht mehr und die spaetere
   Markererkennung (AP2) funktioniert nicht zuverlaessig.
4. Nach dem Ausdruck mit einem Lineal nachmessen: der Abstand zwischen den
   Mittelpunkten der beiden oberen Eckmarker sollte 210 mm minus 2 x 15 mm
   = 180 mm betragen (siehe Geometrie unten). Weicht das deutlich ab, war
   die Skalierung falsch eingestellt.

## Erzeugung / Neubau

```
pip install reportlab --break-system-packages
python3 templates_build.py
```

Das Skript schreibt alle drei PDFs in denselben Ordner, in dem es liegt.

## Markergeometrie (verbindlich fuer die Erkennung in AP2)

Seitengroesse: DIN A4, Hochformat, 210 mm x 297 mm.

Jede der vier Ecken traegt einen Marker: einen gefuellten dunklen Kreis
mit einem hellen (weissen) Innenpunkt. Die obere linke Ecke hat
zusaetzlich ein kleines dunkles Quadrat direkt neben dem Kreis, damit die
Bildorientierung eindeutig erkennbar ist (auch wenn ein Foto gedreht oder
gespiegelt angeliefert wird).

Alle Positionsangaben sind Mittelpunkt-Koordinaten, gemessen von der
jeweils naechstgelegenen Blattkante (nicht diagonal). Die Konstanten sind
im Skript `templates_build.py` als benannte Variablen hinterlegt
(`MARKER_INSET`, `MARKER_DIAMETER`, `MARKER_INNER_DOT_DIAMETER`,
`ASYM_SQUARE_SIZE`, `ASYM_SQUARE_GAP`). Diese Datei ist die Quelle der
Wahrheit, hier folgt die Beschreibung in Worten:

### Kreis-Marker (alle vier Ecken)

- Aussendurchmesser: 8 mm, gefuellt, Farbe sehr dunkles Braun-Schwarz
  (`#2B2420`, in der Praxis wie Schwarz zu behandeln)
- Innenpunkt: 2 mm Durchmesser, weiss (Papierfarbe), exakt zentriert im
  Kreis. Der Innenpunkt eignet sich gut, um den Mittelpunkt des Markers
  per Bildverarbeitung praezise zu bestimmen (z. B. Zentroid des hellen
  Lochs innerhalb der dunklen Flaeche).
- Mittelpunkt-Abstand zu den beiden angrenzenden Blattkanten: 15 mm
  (horizontal UND vertikal, also 15 mm von der linken bzw. rechten Kante
  und 15 mm von der oberen bzw. unteren Kante)

Daraus ergeben sich folgende Mittelpunkt-Koordinaten (X von links, Y von
oben, in mm, Blattmasse 210 x 297):

| Ecke              | X    | Y    |
|--------------------|------|------|
| oben links         | 15   | 15   |
| oben rechts        | 195  | 15   |
| unten links        | 15   | 282  |
| unten rechts       | 195  | 282  |

(Hinweis: In `templates_build.py` selbst wird intern das
reportlab-Koordinatensystem verwendet, Y von unten gemessen. Die Tabelle
oben ist in "Y von oben" umgerechnet, das ist die uebliche Konvention in
Bildverarbeitung/Foto.)

### Asymmetrie-Merkmal oben links

Nur an der oberen linken Ecke: ein zusaetzliches gefuelltes Quadrat,
4 mm Kantenlaenge, platziert direkt rechts neben dem Kreis-Marker.

- Abstand von der Kreis-Aussenkante zum Quadrat: 3 mm
- Das Quadrat ist auf der gleichen Hoehe wie der Kreis-Mittelpunkt
  vertikal zentriert
- Damit beginnt das Quadrat bei X = 15 + 4 (Kreisradius) + 3 (Abstand)
  = 22 mm und endet bei X = 26 mm, auf Hoehe Y = 15 mm (Mittelpunkt-Y)

Erkennungslogik fuer AP2: nachdem alle vier Kreis-Marker gefunden
wurden, ist derjenige Marker, der ein zusaetzliches dunkles Quadrat in
unmittelbarer Naehe (max. ca. 10 mm Abstand) auf seiner rechten Seite
hat, die obere linke Ecke. Damit laesst sich die Bildorientierung (auch
bei 90/180/270 Grad Drehung oder Spiegelung) eindeutig bestimmen, indem
man prueft, auf welcher Seite des jeweiligen Markers sich das Quadrat
befindet.

### Sicherheitsabstand Kopfzeile / Inhalt zu den Markern

Kopfzeilen-Inhalt (Aufgaben-Code-Kaestchen links, Schueler-Kuerzel-
Kaestchen rechts) beginnt bzw. endet mit Sicherheitsabstand zu den
oberen Markern, damit nichts optisch mit den Markern kollidiert:

- Linker Sicherheitsabstand: Marker-Mittelpunkt (15 mm) + Kreisradius
  (4 mm) + Quadrat-Abstand (3 mm) + Quadratgroesse (4 mm) + 4 mm Puffer
  = 30 mm ab linker Kante
- Rechter Sicherheitsabstand: Marker-Mittelpunkt (15 mm von rechts) +
  Kreisradius (4 mm) + 4 mm Puffer = 23 mm ab rechter Kante

## Weitere Layout-Masse (zur Einordnung, nicht fuer die Markererkennung
noetig)

- Seitenraender der Schreibzone: 20 mm links und rechts
- Linienabstand (`vorlage-linien.pdf`): 12 mm
- Kaestchengroesse (`vorlage-kaestchen.pdf`): 5 mm x 5 mm
- Fusszeile "Blatt __ von __": 12 mm ueber der unteren Kante
- Schreibregeln-Block: direkt ueber der Fusszeile, ca. 22 mm hoch
