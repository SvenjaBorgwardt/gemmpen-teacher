/*
  Ermittelt einen Vision-Client fuer die Erkennungs-Route: den echten
  Ollama-Client (AP3, lib/ollama.ts), wenn die Auswertung erreichbar ist,
  sonst den Mock (vision.mock.ts). Gleiches Muster wie resolveGradingClient
  fuer den Text-Slot (lib/prompts/resolve-client.ts), damit der komplette
  Ablauf auch ohne installierte Auswertung durchklickbar bleibt und der
  Lehrkraft ehrlich gemeldet wird, ob echt gelesen wurde.

  Nur serverseitig verwenden (importiert lib/ollama.ts, das fetch gegen
  localhost macht).
*/

import type { VisionChatClient } from "./transcribe";
import { createMockVisionClient } from "./vision.mock";
import { createOllamaClient } from "../ollama";

export interface ResolvedVisionClient {
  client: VisionChatClient;
  /** true, wenn die echte Auswertung genutzt wird; false beim Mock-Ersatz. */
  usingRealClient: boolean;
}

/**
 * Liefert den echten Vision-Client, wenn die Auswertung erreichbar ist, sonst
 * den Mock. Wirft nie: ein nicht erreichbares Ollama fuehrt zum Mock-Fallback,
 * nicht zu einem Fehler, damit die Erkennung immer ein Ergebnis liefert.
 */
export async function resolveVisionClient(): Promise<ResolvedVisionClient> {
  try {
    const client = await createOllamaClient();
    const status = await client.getStatus();
    if (status.reachable) {
      return { client, usingRealClient: true };
    }
  } catch {
    // Faellt unten auf den Mock zurueck.
  }
  return { client: createMockVisionClient(), usingRealClient: false };
}
