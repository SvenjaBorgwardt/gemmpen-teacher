/*
  Anbindung an die Auswertung (Ollama, REST auf localhost:11434).

  Implementiert das ChatClient-Interface aus lib/prompts/chat.ts (Methode
  complete({system, user}) -> roher Text), damit die Bewertungskette und die
  Kalibrierung aus AP4 ohne Anpassung den echten Client nutzen koennen.

  Zusaetzlich:
  - Vision-Aufruf mit Bildanhang fuer die Transkription (transcribeImage).
  - Verbindungsstatus und geladene Modelle (getStatus) fuer die
    Einstellungen-Seite.

  Fehlerbehandlung: jeder Fehler wird als OllamaError geworfen, mit einem
  Locale-Schluessel (messageKey) fuer eine verstaendliche deutsche/englische
  Meldung in der UI, plus einer technischen Detailmeldung fuer Protokolle.
  Es wird nie ungefangen geworfen oder abgestuerzt; alle Aufrufe haben ein
  Zeitlimit.

  Nur serverseitig verwenden (nutzt fetch gegen localhost, laeuft aber auch
  clientseitig technisch - hier bewusst fuer API-Routen gedacht, siehe
  app/api/recognize/*).
*/

import type { RenderedPrompt } from "./prompts/render";
import type { ChatClient } from "./prompts/chat";
import { readAppConfig, DEFAULT_APP_CONFIG } from "./storage";

/* ----------------------------------------------------------------------------
   Fehler
---------------------------------------------------------------------------- */

/** Gruende, warum ein Ollama-Aufruf scheitert. Bestimmt die Locale-Meldung. */
export type OllamaErrorKind =
  | "unreachable" // Verbindung kam gar nicht zustande (Programm nicht gestartet)
  | "timeout" // Zeitlimit ueberschritten
  | "modelMissing" // Modell ist nicht geladen/installiert
  | "badResponse" // Antwort kam, war aber nicht auswertbar (Status/Format)
  | "invalidInput"; // Aufruf war von unserer Seite falsch (Programmierfehler)

/**
 * Fehler eines Ollama-Aufrufs. messageKey verweist auf einen Locale-Schluessel
 * (ollama.error.*), damit die UI eine verstaendliche, uebersetzte Meldung
 * zeigen kann statt eines technischen Textes.
 */
export class OllamaError extends Error {
  readonly kind: OllamaErrorKind;
  readonly messageKey: string;
  /** Technisches Detail fuer Protokolle, nie direkt in der UI anzeigen. */
  readonly detail?: string;

  constructor(kind: OllamaErrorKind, messageKey: string, detail?: string) {
    super(detail ? `${messageKey}: ${detail}` : messageKey);
    this.name = "OllamaError";
    this.kind = kind;
    this.messageKey = messageKey;
    this.detail = detail;
  }
}

function unreachableError(baseUrl: string, cause?: unknown): OllamaError {
  const detail = cause instanceof Error ? cause.message : undefined;
  void baseUrl;
  return new OllamaError("unreachable", "ollama.error.unreachable", detail);
}

function timeoutError(): OllamaError {
  return new OllamaError("timeout", "ollama.error.timeout");
}

function modelMissingError(model: string): OllamaError {
  return new OllamaError("modelMissing", "ollama.error.modelMissing", model);
}

function badResponseError(detail: string): OllamaError {
  return new OllamaError("badResponse", "ollama.error.badResponse", detail);
}

/* ----------------------------------------------------------------------------
   Grundgeruest: fetch mit Zeitlimit und einheitlicher Fehlerabbildung
---------------------------------------------------------------------------- */

const DEFAULT_TIMEOUT_MS = 120_000;

interface OllamaClientOptions {
  baseUrl?: string;
  /** Zeitlimit je Aufruf in Millisekunden. */
  timeoutMs?: number;
}

async function fetchJson<T>(
  baseUrl: string,
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { ...init, signal: controller.signal });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw timeoutError();
    throw unreachableError(baseUrl, err);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      // ignorieren, bodyText bleibt leer
    }
    // Ollama meldet ein fehlendes Modell typischerweise mit 404 und einem
    // Hinweistext, der den Modellnamen und "not found" enthaelt.
    if (res.status === 404 && /not found|no such model/i.test(bodyText)) {
      throw modelMissingError(extractModelName(bodyText) ?? "?");
    }
    throw badResponseError(`HTTP ${res.status}: ${bodyText.slice(0, 300)}`);
  }

  try {
    return (await res.json()) as T;
  } catch (err) {
    throw badResponseError(
      `Antwort ist kein gueltiges JSON (${(err as Error)?.message ?? "unbekannt"})`,
    );
  }
}

function extractModelName(bodyText: string): string | null {
  const m = bodyText.match(/model\s+"?([\w.:/-]+)"?/i);
  return m ? m[1] : null;
}

/* ----------------------------------------------------------------------------
   Ollama-REST-Antworten (nur die Felder, die wir nutzen)
---------------------------------------------------------------------------- */

interface OllamaChatResponse {
  message?: { role: string; content: string };
  done?: boolean;
}

interface OllamaTagsResponse {
  models?: Array<{ name: string; model?: string; size?: number }>;
}

/* ----------------------------------------------------------------------------
   Client
---------------------------------------------------------------------------- */

/**
 * Ollama-Client fuer die Auswertung. Implementiert ChatClient (complete) fuer
 * die Bewertungskette/Kalibrierung aus AP4 und bietet zusaetzlich
 * transcribeImage (Vision) sowie getStatus (Einstellungen-Seite).
 */
export class OllamaClient implements ChatClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(options: OllamaClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_APP_CONFIG.ollamaBaseUrl).replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Erstellt einen Client mit den in data/config/app.json hinterlegten Einstellungen. */
  static async fromAppConfig(overrides: OllamaClientOptions = {}): Promise<OllamaClient> {
    const config = await readAppConfig();
    return new OllamaClient({
      baseUrl: overrides.baseUrl ?? config.ollamaBaseUrl,
      timeoutMs: overrides.timeoutMs,
    });
  }

  /**
   * ChatClient-Vertrag: reine Text-Generierung gegen ein Modell.
   * Modellname wird beim Aufruf uebergeben (siehe complete()-Ueberladung
   * unten fuer die konkrete Nutzung mit gradingModel).
   */
  async complete(prompt: RenderedPrompt, model?: string): Promise<string> {
    const config = await readAppConfig();
    const useModel = model ?? config.gradingModel;
    return this.chat(useModel, prompt.system, prompt.user);
  }

  /** Text-Generierung mit explizitem Modellnamen (fuer Faelle ausserhalb der Bewertungskette). */
  async chat(model: string, system: string, user: string): Promise<string> {
    if (!model || model.trim() === "") {
      throw new OllamaError("invalidInput", "ollama.error.invalidInput", "Kein Modellname angegeben.");
    }
    const body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      stream: false,
    };
    const res = await fetchJson<OllamaChatResponse>(
      this.baseUrl,
      "/api/chat",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      this.timeoutMs,
    );
    const content = res.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw badResponseError("Die Antwort enthaelt keinen Text.");
    }
    return content;
  }

  /**
   * Vision-Aufruf mit Bildanhang. imageBase64 ist die reine Base64-Nutzlast
   * (ohne "data:image/..;base64," Praefix). Gibt den rohen Antworttext zurueck.
   */
  async chatWithImage(
    model: string,
    system: string,
    user: string,
    imageBase64: string,
  ): Promise<string> {
    if (!model || model.trim() === "") {
      throw new OllamaError("invalidInput", "ollama.error.invalidInput", "Kein Modellname angegeben.");
    }
    if (!imageBase64 || imageBase64.trim() === "") {
      throw new OllamaError("invalidInput", "ollama.error.invalidInput", "Kein Bild angegeben.");
    }
    const body = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user, images: [imageBase64] },
      ],
      stream: false,
    };
    const res = await fetchJson<OllamaChatResponse>(
      this.baseUrl,
      "/api/chat",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      this.timeoutMs,
    );
    const content = res.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw badResponseError("Die Antwort enthaelt keinen Text.");
    }
    return content;
  }

  /**
   * Verbindungsstatus fuer die Einstellungen-Seite: erreichbar ja/nein und
   * geladene Modelle. Wirft nie; nicht erreichbar wird als reachable=false
   * abgebildet, damit die UI ruhig anzeigen kann statt abzustuerzen.
   */
  async getStatus(): Promise<OllamaStatus> {
    try {
      const res = await fetchJson<OllamaTagsResponse>(
        this.baseUrl,
        "/api/tags",
        { method: "GET" },
        Math.min(this.timeoutMs, 10_000),
      );
      const models = (res.models ?? []).map((m) => m.name ?? m.model ?? "").filter(Boolean);
      return { reachable: true, models };
    } catch (err) {
      const messageKey =
        err instanceof OllamaError ? err.messageKey : "ollama.error.unreachable";
      return { reachable: false, models: [], messageKey };
    }
  }

  /** Prueft, ob ein bestimmtes Modell in der Liste der geladenen Modelle steht. */
  async hasModel(modelName: string): Promise<boolean> {
    const status = await this.getStatus();
    if (!status.reachable) return false;
    // Ollama-Namen tragen oft ein Tag (":latest"); Vergleich toleriert das.
    const norm = (s: string) => s.split(":")[0];
    return status.models.some((m) => m === modelName || norm(m) === norm(modelName));
  }
}

/** Ergebnis eines Verbindungstests. */
export interface OllamaStatus {
  reachable: boolean;
  models: string[];
  /** Nur gesetzt, wenn reachable=false: Locale-Schluessel fuer die Meldung. */
  messageKey?: string;
}

/** Bequemer Einstiegspunkt: Client mit den gespeicherten App-Einstellungen. */
export async function createOllamaClient(): Promise<OllamaClient> {
  return OllamaClient.fromAppConfig();
}
