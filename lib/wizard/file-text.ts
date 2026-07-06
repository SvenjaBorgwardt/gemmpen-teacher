/*
  Datei-Einlesen fuer den Einrichten-Assistenten (AP5, Schritt 2 und 3).

  Text-Dateien (.txt, .md) werden direkt als Text uebernommen. Bei PDF oder
  Bild kann der Assistent den Inhalt noch nicht selbst lesen (das passiert
  erst waehrend der spaeteren Auswertung mit dem Vision-Slot, AP3). Fuer diese
  Faelle legt der Assistent einen Platzhaltertext ab, der klar sagt: der
  Inhalt wird bei der Auswertung gelesen, nicht jetzt schon im Assistenten.
*/

export type UploadKind = "text" | "pending";

export interface UploadResult {
  kind: UploadKind;
  /** Bei kind "text": der eingelesene Inhalt. Bei "pending": ein Platzhaltertext. */
  text: string;
  fileName: string;
}

function isTextFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    file.type === "text/plain" ||
    file.type === "text/markdown" ||
    name.endsWith(".txt") ||
    name.endsWith(".md")
  );
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
    reader.readAsText(file);
  });
}

/**
 * Liest eine hochgeladene Datei fuer Aufgabenstellung oder Erwartungshorizont.
 * pendingNote ist der lokalisierte Platzhaltertext fuer PDF/Bild-Dateien.
 */
export async function readUploadedTaskFile(
  file: File,
  pendingNote: string,
): Promise<UploadResult> {
  if (isTextFile(file)) {
    const text = await readAsText(file);
    return { kind: "text", text, fileName: file.name };
  }
  return { kind: "pending", text: pendingNote, fileName: file.name };
}
