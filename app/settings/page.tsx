"use client";

/*
  Einstellungen-Seite (AP3).

  Zeigt, ob die Auswertung erreichbar ist, welche Modelle geladen sind, und
  erlaubt das Aendern der Modellnamen. Ein Testknopf loest den Verbindungstest
  erneut aus.

  Hausregel 3 (keine technischen Begriffe): "Auswertung" statt "Modell"/"Ollama"
  wo moeglich. "Ollama" wird nur dort genannt, wo die Lehrkraft das Programm
  tatsaechlich installieren oder starten muss (Hinweistext bei nicht erreichbar).
*/

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import type { AppConfig } from "@/lib/types";

interface StatusResponse {
  reachable: boolean;
  models: string[];
  messageKey?: string;
}

type LoadState = "loading" | "ready" | "error";

export default function SettingsPage() {
  const { t } = useI18n();

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [visionModel, setVisionModel] = useState("");
  const [gradingModel, setGradingModel] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("");

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState(false);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/recognize/config");
    const data = (await res.json()) as AppConfig;
    setConfig(data);
    setVisionModel(data.visionModel);
    setGradingModel(data.gradingModel);
    setOllamaBaseUrl(data.ollamaBaseUrl);
  }, []);

  const loadStatus = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/recognize/status");
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
      setState("ready");
    } catch {
      setStatus({ reachable: false, models: [], messageKey: "ollama.error.unreachable" });
      setState("error");
    }
  }, []);

  // Erststart: Einstellungen und Verbindungsstatus laden. Der Aufruf steht
  // bewusst in einer async IIFE innerhalb des Effekts (nicht als direkter
  // Effekt-Body-Aufruf einer setState-aufrufenden Funktion), damit die
  // Reaktions-Regel fuer Effekte sauber bleibt.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await Promise.all([loadConfig(), loadStatus()]);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConfig, loadStatus]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    await loadStatus();
    setTesting(false);
  }, [loadStatus]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSavedHint(false);
    const res = await fetch("/api/recognize/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ollamaBaseUrl, visionModel, gradingModel }),
    });
    const data = (await res.json()) as AppConfig;
    setConfig(data);
    setSaving(false);
    setSavedHint(true);
    // Nach dem Speichern gleich pruefen, ob die neuen Namen erreichbar sind.
    await loadStatus();
  }, [ollamaBaseUrl, visionModel, gradingModel, loadStatus]);

  const reachable = status?.reachable ?? false;
  const modelsLoaded = status?.models ?? [];

  const visionLoaded = modelsLoaded.some(
    (m) => m === visionModel || m.split(":")[0] === visionModel.split(":")[0],
  );
  const gradingLoaded = modelsLoaded.some(
    (m) => m === gradingModel || m.split(":")[0] === gradingModel.split(":")[0],
  );

  return (
    <div>
      <PageHeader titleKey="settings.title" nowKey="settings.now" nextKey="settings.next" />

      <div className="grid gap-6 max-w-2xl">
        {/* Verbindungsstatus */}
        <section className="gp-card p-5">
          <h2 className="text-xl mb-3">{t("settings.connection.title")}</h2>

          {state === "loading" && !status ? (
            <p className="text-ink-soft">{t("settings.connection.checking")}</p>
          ) : reachable ? (
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-1 h-3 w-3 rounded-full shrink-0"
                style={{ background: "#5c8a4a" }}
              />
              <div>
                <p className="font-semibold">{t("settings.connection.ok")}</p>
                <p className="text-ink-soft text-sm mt-1">
                  {modelsLoaded.length > 0
                    ? t("settings.connection.modelsFound").replace(
                        "{{count}}",
                        String(modelsLoaded.length),
                      )
                    : t("settings.connection.noModels")}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-1 h-3 w-3 rounded-full shrink-0"
                style={{ background: "#B85C3A" }}
              />
              <div>
                <p className="font-semibold">{t("settings.connection.notReachable")}</p>
                <p className="text-ink-soft text-sm mt-1">{t("settings.connection.startHint")}</p>
              </div>
            </div>
          )}

          {modelsLoaded.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {modelsLoaded.map((m) => (
                <li
                  key={m}
                  className="text-xs px-2 py-1 rounded-full bg-amber-soft text-amber-strong"
                >
                  {m}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="gp-button-ghost mt-4"
          >
            {testing ? t("settings.connection.testing") : t("settings.connection.test")}
          </button>
        </section>

        {/* Modellnamen */}
        <section className="gp-card p-5">
          <h2 className="text-xl mb-1">{t("settings.models.title")}</h2>
          <p className="text-ink-soft text-sm mb-4">{t("settings.models.hint")}</p>

          <div className="grid gap-4">
            <div>
              <label htmlFor="visionModel" className="block text-sm font-semibold mb-1">
                {t("settings.models.vision")}
              </label>
              <input
                id="visionModel"
                type="text"
                value={visionModel}
                onChange={(e) => setVisionModel(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2"
              />
              <p className="text-xs mt-1 text-ink-soft">
                {visionLoaded
                  ? t("settings.models.loaded")
                  : reachable
                    ? t("settings.models.notLoaded")
                    : t("settings.models.unknown")}
              </p>
            </div>

            <div>
              <label htmlFor="gradingModel" className="block text-sm font-semibold mb-1">
                {t("settings.models.grading")}
              </label>
              <input
                id="gradingModel"
                type="text"
                value={gradingModel}
                onChange={(e) => setGradingModel(e.target.value)}
                className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2"
              />
              <p className="text-xs mt-1 text-ink-soft">
                {gradingLoaded
                  ? t("settings.models.loaded")
                  : reachable
                    ? t("settings.models.notLoaded")
                    : t("settings.models.unknown")}
              </p>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-ink-soft">
                {t("settings.models.advanced")}
              </summary>
              <div className="mt-3">
                <label htmlFor="baseUrl" className="block text-sm font-semibold mb-1">
                  {t("settings.models.baseUrl")}
                </label>
                <input
                  id="baseUrl"
                  type="text"
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2"
                />
              </div>
            </details>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button type="button" onClick={handleSave} disabled={saving} className="gp-button">
              {saving ? t("settings.models.saving") : t("settings.models.save")}
            </button>
            {savedHint && <span className="text-sm text-ink-soft">{t("settings.models.saved")}</span>}
          </div>

          {config && (
            <p className="text-xs text-ink-soft mt-3">
              {t("settings.models.defaultsNotice")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
