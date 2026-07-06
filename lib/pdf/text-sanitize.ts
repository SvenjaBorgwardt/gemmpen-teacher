/*
  Zeichen-Bereinigung fuer pdf-lib Standardfonts (WinAnsi).

  pdf-lib's eingebaute Fonts (Times-Roman, Helvetica, ...) koennen nur WinAnsi
  (CP1252) darstellen. WinAnsi deckt deutsche Umlaute und "ß" nativ ab
  (ä ö ü Ä Ö Ü ß sind alle im Bereich 0x80-0xFF vorhanden), aber kein
  darueber hinausgehendes Unicode (z.B. Emojis, viele Sonderzeichen, manche
  Anfuehrungszeichen-Varianten, CJK etc.).

  sanitizeForWinAnsi() ersetzt nicht abbildbare Zeichen sauber durch einen
  nahen WinAnsi-Ersatz (z.B. typografische Anfuehrungszeichen -> gerade
  Anfuehrungszeichen, Gedankenstriche -> einfacher Bindestrich gemaess
  Hausregel 1) statt beim PDF-Schreiben abzustuerzen. Nicht ersetzbare Reste
  werden durch "?" ersetzt.
*/

// WinAnsi (CP1252) deckt 0x20-0x7E (ASCII druckbar) und 0xA0-0xFF direkt ab.
// 0x80-0x9F sind Sonderbelegungen (u.a. einige Anfuehrungszeichen, Gedankenstriche).
const WINANSI_SPECIALS: Record<string, string> = {
  "‘": "'", // left single quote
  "’": "'", // right single quote / apostrophe
  "‚": ",", // single low-9 quote
  "“": '"', // left double quote
  "”": '"', // right double quote
  "„": '"', // double low-9 quote
  "–": "-", // en dash -> einfacher Bindestrich (Hausregel 1)
  "—": "-", // em dash -> einfacher Bindestrich (Hausregel 1)
  "…": "...", // horizontal ellipsis
  "˜": "~", // small tilde
  "•": "-", // bullet
  " ": " ", // non-breaking space -> normales Leerzeichen
  "−": "-", // minus sign
};

/** true, wenn das Zeichen direkt in WinAnsi (CP1252) codierbar ist. */
function isDirectlyEncodable(codePoint: number): boolean {
  if (codePoint >= 0x20 && codePoint <= 0x7e) return true;
  if (codePoint >= 0xa0 && codePoint <= 0xff) return true;
  return false;
}

/**
 * Ersetzt ein Zeichen, das nicht direkt in WinAnsi codierbar ist, sauber
 * statt einen Absturz beim PDF-Schreiben zu riskieren.
 */
function replaceChar(ch: string): string {
  const mapped = WINANSI_SPECIALS[ch];
  if (mapped !== undefined) return mapped;
  const codePoint = ch.codePointAt(0);
  if (codePoint !== undefined && isDirectlyEncodable(codePoint)) return ch;
  return "?";
}

/**
 * Bereinigt einen Text vollstaendig fuer pdf-lib Standardfonts.
 * Deutsche Umlaute und ss bleiben unveraendert (WinAnsi deckt sie ab).
 * Alles andere jenseits von WinAnsi wird sauber ersetzt statt zu crashen.
 */
export function sanitizeForWinAnsi(input: string): string {
  if (!input) return "";
  // Normalisieren, damit z.B. kombinierte Umlaut-Zeichen (Basisbuchstabe +
  // combining diaeresis) zu vorkomponierten Zeichen werden, die WinAnsi kennt.
  const normalized = input.normalize("NFC");
  let out = "";
  for (const ch of normalized) {
    out += replaceChar(ch);
  }
  return out;
}

/** true, wenn der Text nach der Bereinigung unveraendert waere. */
export function isWinAnsiSafe(input: string): boolean {
  return sanitizeForWinAnsi(input) === input;
}
