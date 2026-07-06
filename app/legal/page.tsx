"use client";

/*
  Rechtliches: Verantwortlichkeit (DSGVO), Datenschutz, Haftung, Impressum-Hinweis.

  Fasst die Kernpunkte der Projekt-Docs in der App zusammen, damit sie auch ohne
  die Markdown-Dateien und ohne Internet sichtbar sind. Alle Texte kommen aus den
  Locale-Dateien (Hausregel 8). Die ausfuehrlichen Fassungen liegen im Projektordner.
*/

import { useI18n } from "@/lib/i18n";

export default function LegalPage() {
  const { t } = useI18n();

  const sections = [
    {
      key: "responsibility",
      title: t("legal.responsibility.title"),
      paras: [
        t("legal.responsibility.p1"),
        t("legal.responsibility.p2"),
        t("legal.responsibility.p3"),
      ],
    },
    {
      key: "privacy",
      title: t("legal.privacy.title"),
      paras: [t("legal.privacy.p1")],
    },
    {
      key: "disclaimer",
      title: t("legal.disclaimer.title"),
      paras: [
        t("legal.disclaimer.p1"),
        t("legal.disclaimer.p2"),
        t("legal.disclaimer.p3"),
      ],
    },
    {
      key: "imprint",
      title: t("legal.imprint.title"),
      paras: [t("legal.imprint.p1")],
    },
  ];

  return (
    <div>
      <p className="text-amber-strong font-semibold mb-2">{t("app.name")}</p>
      <h1 className="text-5xl mb-3">{t("legal.title")}</h1>
      <p className="text-lg text-ink-soft max-w-2xl mb-8">{t("legal.intro")}</p>

      <div className="flex flex-col gap-4 mb-8">
        {sections.map((section) => (
          <section key={section.key} className="gp-card p-5">
            <h2 className="font-serif text-2xl text-ink mb-3">{section.title}</h2>
            <div className="flex flex-col gap-2">
              {section.paras.map((para, i) => (
                <p key={i} className="text-ink-soft text-[15px] leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="text-ink-soft text-sm max-w-2xl mb-2">{t("legal.notAdvice")}</p>
      <p className="text-ink-soft text-sm max-w-2xl">{t("legal.moreInProject")}</p>
    </div>
  );
}
