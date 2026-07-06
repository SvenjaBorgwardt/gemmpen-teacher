/*
  Rubric-Modul: oeffentliche Schnittstelle.

  Enthaelt Validierung (validateSubjectConfig), Metadaten-Ableitung
  (metadataFromConfig) und den Kalibrierungslauf (runCalibration).
  Das maschinenlesbare JSON-Schema liegt in rubric.schema.json.
*/

export * from "./validate";
export * from "./metadata";
export * from "./calibrate";
