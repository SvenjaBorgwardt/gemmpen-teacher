/*
  Datentypen fuer den Ingest-Ablauf zwischen Client (Hochladen-Seite),
  API-Route und Speicher.

  Der Client rendert PDFs zu Seitenbildern und schickt einzelne Seitenbilder
  (PNG/JPEG als Base64 oder Blob) an die API. Fotos werden direkt geschickt.
  Die API entzerrt, schneidet zu und legt die Ergebnisse in data/submissions/ ab.
*/

/** Eingangsart einer Seite. */
export type IngestSourceKind = "photo" | "pdf-page";

/** Eine vom Client vorbereitete Seite (ein Bild, ein Blatt). */
export interface IngestPageInput {
  /** Herkunft: einzelnes Foto oder aus einer PDF-Seite gerendert. */
  kind: IngestSourceKind;
  /** Urspruenglicher Dateiname, fuer die Anzeige. */
  sourceName: string;
  /** Seitenzahl innerhalb der Quelldatei (0-basiert), nur bei pdf-page sinnvoll. */
  sourcePageIndex: number;
  /** Bilddaten als Data-URL (data:image/...;base64,...). */
  dataUrl: string;
}

/** Ergebnis der Verarbeitung einer einzelnen Seite (von der API zurueck). */
export interface IngestPageResult {
  /** Stabile ID der Seite (Dateiname ohne Endung). */
  pageId: string;
  /** Wurde die Scan-Vorlage erkannt? */
  templateDetected: boolean;
  /** Orientierung sicher (Asymmetrie-Quadrat gefunden)? */
  orientationConfident: boolean;
  /** Oeffentlich abrufbarer Pfad zum entzerrten Seitenbild. */
  imageUrl: string;
  /** Oeffentlich abrufbarer Pfad zum Kopfzeilen-Ausschnitt. */
  headerUrl: string;
  /** Ursprung, fuer die Galerie. */
  sourceName: string;
  sourcePageIndex: number;
}

/** Anfrage an die Ingest-API: mehrere vorbereitete Seiten einer Runde. */
export interface IngestRequest {
  /** ID der Bewertungsrunde (Ordner in data/submissions/). */
  roundId: string;
  /** Von der Lehrkraft vergebener Name fuer diesen Stapel (optional). */
  roundLabel?: string;
  /** Die vorbereiteten Seiten. */
  pages: IngestPageInput[];
}

export interface IngestResponse {
  roundId: string;
  results: IngestPageResult[];
}

/** Anfrage zum Zuordnen von Seiten zu einem Schueler-Kuerzel. */
export interface AssignRequest {
  roundId: string;
  /** Schueler-Kuerzel (Pseudonym). */
  studentAlias: string;
  /** Aufgaben-Code (optional, falls die Lehrkraft ihn eintraegt). */
  taskCode?: string;
  /** IDs der Seiten, die zu dieser Arbeit gehoeren, in Reihenfolge. */
  pageIds: string[];
}
