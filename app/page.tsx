"use client";

/*
  Start (Landing Page).

  Warm-Paper-Landing im handgemachten Notizblock-Charakter (Hausregel 7):
  1. Hero - Marken-Siegel (Federkiel), grosse These, zwei Aktionen und ein
     Vertrauens-Satz; rechts ein Beispiel-Feedback-Blatt als "handkorrigiertes"
     Papier (leicht gedreht, mit Stempel und Unterlage).
  2. Drei Kern-Versprechen (liest, bewertet, bleibt lokal).
  3. Ablauf in vier Schritten mit verbindender Punktlinie.
  4. Abschluss mit vollem Logo-Schriftzug und klarer Weiter-Aktion.

  Alle Texte ueber t() (Hausregel 8). Keine technischen Begriffe (Hausregel).
*/

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { ScoreObject } from "@/components/score-object";

const STEPS = [
  { n: 1, href: "/setup", titleKey: "dashboard.step.setup", descKey: "dashboard.step.setup.desc" },
  { n: 2, href: "/upload", titleKey: "dashboard.step.upload", descKey: "dashboard.step.upload.desc" },
  { n: 3, href: "/review", titleKey: "dashboard.step.review", descKey: "dashboard.step.review.desc" },
  { n: 4, href: "/assess", titleKey: "dashboard.step.assess", descKey: "dashboard.step.assess.desc" },
];

// Illustrative Beispieldaten fuer die Signatur-Vorschau (13/15 -> "sehr gut").
const SAMPLE_SEGMENTS = [
  { key: "grammar", name: "Grammar", points: 13, maxPoints: 15, colorKey: "grammar" },
  { key: "sentence", name: "Sentence structure", points: 12, maxPoints: 15, colorKey: "sentence" },
  { key: "vocabulary", name: "Vocabulary", points: 14, maxPoints: 15, colorKey: "vocabulary" },
  { key: "connectives", name: "Connectives", points: 13, maxPoints: 15, colorKey: "connectives" },
];

// Kern-Versprechen mit schlichten Linien-Symbolen (kein Emoji, Hausregel).
const VALUES = [
  {
    key: "read",
    titleKey: "dashboard.value.read.title",
    textKey: "dashboard.value.read.text",
    icon: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
  },
  {
    key: "mark",
    titleKey: "dashboard.value.mark.title",
    textKey: "dashboard.value.mark.text",
    icon: (
      <>
        <path d="M4 13l4 4L20 5" />
        <path d="M4 20h16" />
      </>
    ),
  },
  {
    key: "private",
    titleKey: "dashboard.value.private.title",
    textKey: "dashboard.value.private.text",
    icon: (
      <>
        <path d="M4 11l8-6 8 6" />
        <path d="M6 10v9h12v-9" />
        <path d="M10 19v-5h4v5" />
      </>
    ),
  },
];

export default function Home() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-16 sm:gap-20">
      {/* 1. Hero */}
      <section className="paper-panel px-6 py-10 sm:px-10 sm:py-14">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 lg:gap-14 items-center">
          <div>
            {/* Marken-Siegel: Federkiel-Zeichen als "Wachssiegel" */}
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-soft ring-1 ring-line shadow-[var(--card-shadow)]">
              <img src="/logo-mark.png" alt="" className="h-8 w-auto" />
            </span>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-amber-strong">
              {t("dashboard.hero.kicker")}
            </p>
            <h1 className="mt-2 text-5xl sm:text-6xl leading-[1.04] max-w-xl">
              {t("dashboard.title")}
            </h1>
            <p className="mt-5 text-lg text-ink-soft max-w-xl">{t("dashboard.lead")}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/setup" className="gp-button">
                {t("dashboard.startSetup")}
              </Link>
              <a href="#how" className="gp-button-ghost">
                {t("dashboard.hero.secondary")}
              </a>
            </div>

            <p className="mt-5 flex items-center gap-2 text-sm text-ink-soft">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="text-amber-strong shrink-0"
              >
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              {t("dashboard.hero.trust")}
            </p>
          </div>

          {/* Beispiel-Feedback-Blatt: gedrehtes Papier mit Unterlage und Stempel */}
          <div className="relative lg:justify-self-end w-full max-w-md">
            <div
              aria-hidden="true"
              className="absolute inset-0 gp-card rotate-2 translate-x-1.5 translate-y-1.5"
            />
            <div className="relative gp-card p-6 sm:p-7 -rotate-1">
              <span className="absolute -top-3 right-5 -rotate-6 rounded-md border border-alert/40 bg-paper-raised px-2 py-1 text-xs font-semibold uppercase tracking-wide text-alert">
                {t("dashboard.sample.stamp")}
              </span>

              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-amber-strong">
                {t("dashboard.sample.badge")}
              </p>
              <blockquote className="mb-6">
                <p className="font-serif text-xl italic text-ink leading-relaxed">
                  &ldquo;
                  <span
                    className="ink-underline"
                    style={{ ["--mark" as string]: "var(--cat-grammar)" } as React.CSSProperties}
                  >
                    {t("dashboard.sample.quote")}
                  </span>
                  &rdquo;
                </p>
              </blockquote>
              <ScoreObject
                display="13 / 15"
                label={t("dashboard.sample.gradeLabel")}
                segments={SAMPLE_SEGMENTS}
              />
              <div className="mt-5 pt-4 border-t border-line">
                <p className="font-serif text-[15px] text-ink mb-1">
                  {t("dashboard.sample.strengthHeading")}
                </p>
                <p className="text-ink-soft text-[15px]">{t("dashboard.sample.strengthText")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Kern-Versprechen */}
      <section className="grid gap-4 sm:grid-cols-3">
        {VALUES.map((v) => (
          <div key={v.key} className="gp-card p-6">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-soft text-amber-strong">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                {v.icon}
              </svg>
            </span>
            <h2 className="mt-4 font-serif text-2xl text-ink">{t(v.titleKey)}</h2>
            <p className="mt-1.5 text-ink-soft text-[15px]">{t(v.textKey)}</p>
          </div>
        ))}
      </section>

      {/* 3. Ablauf in vier Schritten */}
      <section id="how" className="scroll-mt-24">
        <div className="mb-7 max-w-xl">
          <h2 className="text-3xl sm:text-4xl">{t("dashboard.steps.title")}</h2>
          <p className="mt-2 text-ink-soft text-lg">{t("dashboard.steps.lead")}</p>
        </div>

        <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Verbindende Punktlinie (nur breit, hinter den Karten) */}
          <div
            aria-hidden="true"
            className="hidden lg:block absolute left-0 right-0 top-[3.35rem] border-t border-dashed border-line -z-10"
          />
          {STEPS.map((step) => (
            <li key={step.n}>
              <Link
                href={step.href}
                className="gp-card p-5 flex flex-col gap-3 h-full hover:border-amber transition-colors"
              >
                <span className="w-9 h-9 rounded-full bg-amber-soft text-amber-strong font-semibold flex items-center justify-center tabular-nums lining-nums">
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
      </section>

      {/* 4. Abschluss */}
      <section className="paper-panel px-6 py-12 sm:py-14 text-center">
        <img
          src="/logo-lockup.png"
          alt={t("app.name")}
          className="mx-auto h-20 sm:h-24 w-auto"
        />
        <h2 className="mt-6 text-3xl sm:text-4xl">{t("dashboard.close.title")}</h2>
        <p className="mt-2 text-ink-soft text-lg max-w-md mx-auto">{t("dashboard.close.text")}</p>
        <div className="mt-7">
          <Link href="/setup" className="gp-button">
            {t("dashboard.startSetup")}
          </Link>
        </div>
      </section>
    </div>
  );
}
