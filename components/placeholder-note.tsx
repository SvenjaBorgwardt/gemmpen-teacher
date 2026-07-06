"use client";

/*
  Platzhalter-Hinweis fuer Bereiche, die in spaeteren Arbeitspaketen gebaut werden.
  Text kommt aus der Locale-Datei (common.placeholder).
*/

import { useI18n } from "@/lib/i18n";

export function PlaceholderNote() {
  const { t } = useI18n();
  return (
    <div className="gp-card p-6 text-ink-soft">
      <p>{t("common.placeholder")}</p>
    </div>
  );
}
