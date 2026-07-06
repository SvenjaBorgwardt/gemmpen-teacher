"use client";

/*
  Start (Dashboard).
  Zeigt den linearen Ablauf in vier Schritten und eine klare Weiter-Aktion (Hausregel 4).
*/

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

const STEPS = [
  { n: 1, href: "/setup", titleKey: "dashboard.step.setup", descKey: "dashboard.step.setup.desc" },
  { n: 2, href: "/upload", titleKey: "dashboard.step.upload", descKey: "dashboard.step.upload.desc" },
  { n: 3, href: "/review", titleKey: "dashboard.step.review", descKey: "dashboard.step.review.desc" },
  { n: 4, href: "/assess", titleKey: "dashboard.step.assess", descKey: "dashboard.step.assess.desc" },
];

export default function Home() {
  const { t } = useI18n();

  return (
    <div>
      <p className="text-amber-strong font-semibold mb-2">{t("app.name")}</p>
      <h1 className="text-5xl mb-3">{t("dashboard.title")}</h1>
      <p className="text-lg text-ink-soft max-w-2xl mb-8">{t("dashboard.lead")}</p>

      <div className="grid gap-3 sm:grid-cols-2 mb-8">
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-amber-strong font-semibold mb-1">
            {t("common.now")}
          </p>
          <p className="text-ink">{t("dashboard.now")}</p>
        </div>
        <div className="gp-card p-4">
          <p className="text-xs uppercase tracking-wide text-ink-soft font-semibold mb-1">
            {t("common.next")}
          </p>
          <p className="text-ink-soft">{t("dashboard.next")}</p>
        </div>
      </div>

      <ol className="grid gap-4 sm:grid-cols-2 mb-10">
        {STEPS.map((step) => (
          <li key={step.n}>
            <Link href={step.href} className="gp-card p-5 flex gap-4 h-full hover:border-amber transition-colors">
              <span className="shrink-0 w-9 h-9 rounded-full bg-amber-soft text-amber-strong font-semibold flex items-center justify-center">
                {step.n}
              </span>
              <span>
                <span className="block font-serif text-xl text-ink">{t(step.titleKey)}</span>
                <span className="block text-ink-soft text-[15px] mt-1">{t(step.descKey)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <Link href="/setup" className="gp-button">
        {t("dashboard.startSetup")}
      </Link>
    </div>
  );
}
