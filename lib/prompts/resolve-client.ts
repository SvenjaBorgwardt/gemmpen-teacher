/*
  Ermittelt einen ChatClient fuer serverseitige API-Routen: den echten
  Ollama-Client (AP3, lib/ollama.ts), wenn die Auswertung erreichbar ist,
  sonst den Mock (AP4, chat.mock.ts). So funktioniert der Assistent (AP5)
  auch ohne installierte Auswertung, meldet der Lehrkraft das aber ehrlich.

  Nur serverseitig verwenden (importiert lib/ollama.ts, das fetch gegen
  localhost macht).
*/

import type { ChatClient } from "./chat";
import { createMockChatClient } from "./chat.mock";
import { createOllamaClient } from "../ollama";

export interface ResolvedClient {
  client: ChatClient;
  /** true, wenn die echte Auswertung genutzt wird; false beim Mock-Ersatz. */
  usingRealClient: boolean;
}

/**
 * Liefert den echten Client, wenn die Auswertung erreichbar ist, sonst den
 * Mock. Wirft nie: ein nicht erreichbares Ollama fuehrt zum Mock-Fallback,
 * nicht zu einem Fehler, damit der Assistent immer nutzbar bleibt.
 */
export async function resolveGradingClient(): Promise<ResolvedClient> {
  try {
    const client = await createOllamaClient();
    const status = await client.getStatus();
    if (status.reachable) {
      return { client, usingRealClient: true };
    }
  } catch {
    // Faellt unten auf den Mock zurueck.
  }
  return { client: createMockChatClient(), usingRealClient: false };
}
