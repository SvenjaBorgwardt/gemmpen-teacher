"use client";

/*
  Footer mit rechtlichem Kurzhinweis auf jeder Seite.

  - Erinnert daran, dass alles lokal bleibt und die Vorschlaege zu pruefen sind.
  - Verlinkt die Rechtliches-Seite (Verantwortlichkeit, Datenschutz, Haftung).
  - Alle Texte aus den Locale-Dateien (Hausregel 8).
*/

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-line bg-paper-raised">
      <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ink-soft text-sm max-w-2xl">
          <span className="font-semibold text-ink">{t("footer.local")}</span>{" "}
          {t("footer.disclaimer")}
        </p>
        <Link
          href="/legal"
          className="shrink-0 text-sm font-semibold text-amber-strong hover:underline"
        >
          {t("footer.legal")}
        </Link>
      </div>
    </footer>
  );
}
