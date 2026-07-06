/*
  Ollama-Client (lib/ollama.ts): Fehlerbehandlung ohne laufendes Ollama.

  Diese Tests laufen ohne echtes Ollama (auch in der Sandbox ohne Netzwerk zu
  einem lokalen Dienst). Sie zielen bewusst auf einen Port, auf dem nichts
  lauscht, und pruefen, dass der Client verstaendliche Fehler mit einem
  Locale-Schluessel wirft/liefert statt abzustuerzen (Definition of Done AP3).
*/

import { test } from "node:test";
import assert from "node:assert/strict";
import { OllamaClient, OllamaError } from "../ollama";

// Port, auf dem in der Testumgebung sicher nichts lauscht.
const UNREACHABLE_URL = "http://127.0.0.1:19999";

test("chat() auf nicht erreichbarem Ollama wirft OllamaError statt abzustuerzen", async () => {
  const client = new OllamaClient({ baseUrl: UNREACHABLE_URL, timeoutMs: 2000 });
  await assert.rejects(
    () => client.chat("gemma3:12b", "system", "user"),
    (err: unknown) => {
      assert.ok(err instanceof OllamaError);
      assert.equal(err.kind, "unreachable");
      assert.equal(err.messageKey, "ollama.error.unreachable");
      return true;
    },
  );
});

test("chatWithImage() auf nicht erreichbarem Ollama wirft OllamaError", async () => {
  const client = new OllamaClient({ baseUrl: UNREACHABLE_URL, timeoutMs: 2000 });
  await assert.rejects(
    () => client.chatWithImage("gemma3:12b", "system", "user", "QQ=="),
    (err: unknown) => {
      assert.ok(err instanceof OllamaError);
      assert.equal(err.kind, "unreachable");
      return true;
    },
  );
});

test("chatWithImage() ohne Bild wirft einen verstaendlichen invalidInput-Fehler", async () => {
  const client = new OllamaClient({ baseUrl: UNREACHABLE_URL, timeoutMs: 2000 });
  await assert.rejects(
    () => client.chatWithImage("gemma3:12b", "system", "user", ""),
    (err: unknown) => {
      assert.ok(err instanceof OllamaError);
      assert.equal(err.kind, "invalidInput");
      assert.equal(err.messageKey, "ollama.error.invalidInput");
      return true;
    },
  );
});

test("chat() ohne Modellnamen wirft invalidInput, ohne einen Netzwerkaufruf zu machen", async () => {
  const client = new OllamaClient({ baseUrl: UNREACHABLE_URL, timeoutMs: 2000 });
  await assert.rejects(
    () => client.chat("", "system", "user"),
    (err: unknown) => {
      assert.ok(err instanceof OllamaError);
      assert.equal(err.kind, "invalidInput");
      return true;
    },
  );
});

test("getStatus() liefert reachable=false statt zu werfen, wenn Ollama nicht laeuft", async () => {
  const client = new OllamaClient({ baseUrl: UNREACHABLE_URL, timeoutMs: 2000 });
  const status = await client.getStatus();
  assert.equal(status.reachable, false);
  assert.deepEqual(status.models, []);
  assert.equal(status.messageKey, "ollama.error.unreachable");
});

test("hasModel() liefert false statt zu werfen, wenn Ollama nicht laeuft", async () => {
  const client = new OllamaClient({ baseUrl: UNREACHABLE_URL, timeoutMs: 2000 });
  const has = await client.hasModel("gemma3:12b");
  assert.equal(has, false);
});

test("complete() (ChatClient-Interface aus lib/prompts/chat.ts) wirft denselben verstaendlichen Fehler", async () => {
  const client = new OllamaClient({ baseUrl: UNREACHABLE_URL, timeoutMs: 2000 });
  await assert.rejects(
    () => client.complete({ system: "s", user: "u" }, "gemma3:12b"),
    (err: unknown) => {
      assert.ok(err instanceof OllamaError);
      assert.equal(err.kind, "unreachable");
      return true;
    },
  );
});

test("Zeitlimit greift: sehr kurzes Timeout gegen eine (theoretisch) langsame Adresse wirft timeout oder unreachable", async () => {
  // 10.255.255.1 ist in der Praxis nicht erreichbar (RFC 5737/reserviert-aehnlich
  // in vielen Sandboxes) und liefert typischerweise keine schnelle Antwort;
  // wir pruefen nur, dass in jedem Fall ein OllamaError mit gueltigem kind kommt,
  // nie eine ungefangene Exception.
  const client = new OllamaClient({ baseUrl: "http://10.255.255.1:11434", timeoutMs: 300 });
  await assert.rejects(
    () => client.chat("gemma3:12b", "s", "u"),
    (err: unknown) => {
      assert.ok(err instanceof OllamaError);
      assert.ok(err.kind === "timeout" || err.kind === "unreachable");
      return true;
    },
  );
});
