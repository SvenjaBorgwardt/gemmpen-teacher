/*
  Integrationstest: OllamaClient als ChatClient in der Bewertungskette aus AP4.

  Zeigt, dass lib/ollama.ts wirklich das ChatClient-Interface aus
  lib/prompts/chat.ts erfuellt (renderCriteriaScore -> client.complete(prompt)
  -> parseJsonResponse), so wie es in einer echten Bewertungsrunde genutzt
  wuerde. Ohne laufendes Ollama muss das eine verstaendliche OllamaError
  ergeben, kein ungefangener Absturz.
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { renderCriteriaScore } from "../prompts/render";
import { OllamaClient, OllamaError } from "../ollama";
import type { ChatClient } from "../prompts/chat";
import { loadExample } from "./helpers";

const UNREACHABLE_URL = "http://127.0.0.1:19999";

test("OllamaClient erfuellt das ChatClient-Interface und scheitert verstaendlich ohne Ollama", async () => {
  const config = loadExample("englisch-comment");
  const prompt = renderCriteriaScore(config, "Dear Sir or Madam, I believe AI tools should be introduced.");

  // Typ-Pruefung: OllamaClient muss sich wie ein ChatClient verwenden lassen,
  // exakt wie es AP7 (Review) und lib/rubric/calibrate.ts (AP4) tun.
  const client: ChatClient = new OllamaClient({ baseUrl: UNREACHABLE_URL, timeoutMs: 2000 });

  await assert.rejects(
    () => client.complete(prompt),
    (err: unknown) => {
      assert.ok(err instanceof OllamaError);
      assert.equal(err.messageKey, "ollama.error.unreachable");
      return true;
    },
  );
});
