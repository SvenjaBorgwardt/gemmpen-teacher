"use client";

/*
  Faecher-Seite (AP5): Liste aller Fach-Konfigurationen mit Fach, Sprache und
  Kriterienzahl. Aktionen je Konfiguration: bearbeiten (oeffnet den Assistenten
  mit Vorbelegung, ?edit=id), duplizieren (Kopie mit neuer id) und loeschen
  (mit Rueckfrage). Screenfuehrung nach Hausregel 4.
*/

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { useI18n } from "@/lib/i18n";
import type { GradingSystem, SubjectConfig } from "@/lib/types";

export default function SubjectsPage() {
  const { t } = useI18n();
  const [configs, setConfigs] = useState<SubjectConfig[] | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/setup/configs");
    if (!res.ok) return;
    const data = (await res.json()) as { configs: SubjectConfig[] };
    setConfigs(data.configs);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/setup/configs");
      if (cancelled || !res.ok) return;
      const data = (await res.json()) as { configs: SubjectConfig[] };
      if (!cancelled) setConfigs(data.configs);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const duplicate = useCallback(
    async (config: SubjectConfig) => {
      setDuplicatingId(config.id);
      try {
        const res = await fetch(`/api/setup/configs/${encodeURIComponent(config.id)}/duplicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: `${config.name} (2)` }),
        });
        if (res.ok) await load();
      } finally {
        setDuplicatingId(null);
      }
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/setup/configs/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        await load();
      }
    },
    [load],
  );

  const gradingSystemLabel = (system: GradingSystem): string => {
    switch (system) {
      case "nrw-points":
        return t("setup.step4.gradingSystem.nrwPoints");
      case "grades-1-6":
        return t("setup.step4.gradingSystem.grades16");
      case "percent":
        return t("setup.step4.gradingSystem.percent");
    }
  };

  return (
    <div>
      <PageHeader titleKey="subjects.title" nowKey="subjects.now" nextKey="subjects.next" />

      <div className="mb-6">
        <Link href="/setup" className="gp-button">
          {t("subjects.create")}
        </Link>
      </div>

      {/* Scan-Vorlagen: druckfertige Blaetter fuer die Klasse, siehe docs/ERSTE-SCHRITTE.md Schritt 5. */}
      <div className="gp-card p-5 mb-6">
        <p className="font-serif text-xl text-ink mb-1">{t("templates.title")}</p>
        <p className="text-ink-soft text-[15px] mb-3">{t("templates.hint")}</p>
        <div className="flex flex-wrap gap-3">
          <a href="/templates/vorlage-linien.pdf" download className="gp-button-ghost">
            {t("templates.lined")}
          </a>
          <a href="/templates/vorlage-kaestchen.pdf" download className="gp-button-ghost">
            {t("templates.squared")}
          </a>
          <a href="/templates/scan-anleitung.pdf" download className="gp-button-ghost">
            {t("templates.guide")}
          </a>
        </div>
      </div>

      {configs === null ? (
        <div className="gp-card p-6 text-ink-soft">{t("subjects.loading")}</div>
      ) : configs.length === 0 ? (
        <div className="gp-card p-6 text-ink-soft">{t("subjects.empty")}</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {configs.map((config) => (
            <li key={config.id} className="gp-card p-5 space-y-3">
              <div>
                <h2 className="font-serif text-2xl text-ink">{config.name}</h2>
                <p className="text-ink-soft text-[15px]">
                  {t("subjects.card.subject")}: {config.subject} - {config.textLanguage}/
                  {config.feedbackLanguage}
                </p>
                <p className="text-ink-soft text-[15px]">
                  {t("subjects.card.criteria")}: {config.rubric.criteria.length}
                </p>
                <p className="text-ink-soft text-[15px]">
                  {t("subjects.card.gradingSystem")}: {gradingSystemLabel(config.gradingSystem)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/setup?edit=${encodeURIComponent(config.id)}`}
                  className="gp-button-ghost"
                >
                  {t("subjects.card.edit")}
                </Link>
                <button
                  type="button"
                  className="gp-button-ghost"
                  onClick={() => void duplicate(config)}
                  disabled={duplicatingId === config.id}
                >
                  {duplicatingId === config.id
                    ? t("subjects.card.duplicate.working")
                    : t("subjects.card.duplicate")}
                </button>
                <button
                  type="button"
                  className="text-[15px] text-cat-grammar font-semibold hover:underline"
                  onClick={() => setConfirmDeleteId(config.id)}
                >
                  {t("subjects.card.delete")}
                </button>
              </div>

              {confirmDeleteId === config.id && (
                <div className="rounded-md border border-cat-grammar bg-paper p-4 space-y-2">
                  <p className="text-ink font-semibold">
                    {t("subjects.card.delete.confirmTitle")}
                  </p>
                  <p className="text-ink-soft text-[15px]">
                    {t("subjects.card.delete.confirmText")}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="gp-button"
                      onClick={() => void remove(config.id)}
                    >
                      {t("subjects.card.delete.confirmYes")}
                    </button>
                    <button
                      type="button"
                      className="gp-button-ghost"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      {t("subjects.card.delete.confirmNo")}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
