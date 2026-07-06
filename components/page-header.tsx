"use client";

/*
  Gemeinsamer Seitenkopf.
  Setzt Hausregel 4 um: jeder Screen sagt, was JETZT zu tun ist und was DANACH kommt.
  Titel und Texte kommen als Locale-Schluessel herein.
*/

import { useI18n } from "@/lib/i18n";

interface PageHeaderProps {
  titleKey: string;
  nowKey: string;
  nextKey: string;
}

export function PageHeader({ titleKey, nowKey, nextKey }: PageHeaderProps) {
  const { t } = useI18n();
  return (
    <div className="mb-8">
      <h1 className="text-4xl mb-4">{t(titleKey)}</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-amber-strong font-semibold mb-1">
            {t("common.now")}
          </p>
          <p className="text-ink">{t(nowKey)}</p>
        </div>
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
            {t("common.next")}
          </p>
          <p className="text-ink-soft">{t(nextKey)}</p>
        </div>
      </div>
    </div>
  );
}
