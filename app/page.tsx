"use client";

/*
  Start (Dashboard).

  Hero mit klarer These und einer Signatur-Vorschau (Mini-Feedback-Blatt mit
  dem Score-Objekt), darunter der lineare Ablauf in vier Schritten und eine
  klare Weiter-Aktion (Hausregel 4).
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

export default function Home() {
  const { t } = useI18n();

  return (
    <div>
      {/* Hero: These + Aktion links, Signatur-Vorschau rechts */}
      <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center mb-14">
        <div>
          <p className="text-amber-strong font-semibold mb-3">{t("app.name")}</p>
          <h1 className="text-4xl sm:text-5xl leading-[1.08] mb-4 max-w-xl">
            {t("dashboard.title")}
          </h1>
          <p className="text-lg text-ink-soft max-w-xl mb-7">{t("dashboard.lead")}</p>
          <Link href="/setup" className="gp-button">
            {t("dashboard.startSetup")}
          </Link>
        </div>

        {/* Signatur-Vorschau: ein Mini-Feedback-Blatt, wie es die Schuelerin bekommt */}
        <div className="gp-card p-6 sm:p-7 w-full max-w-md lg:justify-self-end">
          <p className="text-xs uppercase tracking-wide text-amber-strong font-semibold mb-4">
            {t("dashboard.sample.badge")}
          </p>
          <blockquote className="border-l-2 border-cat-grammar pl-4 mb-5">
            <p className="font-serif text-xl italic text-ink leading-snug">
              &ldquo;{t("dashboard.sample.quote")}&rdquo;
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

      {/* Jetzt / Als Naechstes */}
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

      {/* Vier Schritte */}
      <ol className="grid gap-4 sm:grid-cols-2">
        {STEPS.map((step) => (
          <li key={step.n}>
            <Link
              href={step.href}
              className="gp-card p-5 flex gap-4 h-full hover:border-amber transition-colors"
            >
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
    </div>
  );
}
