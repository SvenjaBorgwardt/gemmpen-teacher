"use client";

/*
  Hauptnavigation mit Sprachumschalter.

  - Zeigt auf jedem Screen, wo man ist (aktiver Punkt hervorgehoben).
  - Sichtbarkeit/Aktivzustand ueber die aktive Klasse selbst, nicht ueber ID-Selektoren
    gegen display (Hausregel 9).
  - Umschalter-Icon (Globus) wechselt DE/EN, Wahl bleibt in localStorage (siehe i18n).
  - Alle Beschriftungen aus den Locale-Dateien.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

interface NavItem {
  href: string;
  key: string;
}

const ITEMS: NavItem[] = [
  { href: "/", key: "nav.dashboard" },
  { href: "/setup", key: "nav.setup" },
  { href: "/subjects", key: "nav.subjects" },
  { href: "/upload", key: "nav.upload" },
  { href: "/review", key: "nav.review" },
  { href: "/assess", key: "nav.assess" },
  { href: "/export", key: "nav.export" },
  { href: "/settings", key: "nav.settings" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Nav() {
  const pathname = usePathname();
  const { t, locale, setLocale } = useI18n();

  return (
    <header className="border-b border-line bg-paper-raised">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-serif text-2xl font-semibold text-ink shrink-0">
          {t("app.name")}
        </Link>

        <nav aria-label={t("nav.dashboard")} className="flex-1">
          <ul className="flex flex-wrap items-center gap-1">
            {ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      "gp-nav-link px-3 py-2 rounded-md text-[15px] transition-colors " +
                      (active
                        ? "bg-amber-soft text-amber-strong font-semibold"
                        : "text-ink-soft hover:text-ink hover:bg-amber-soft/50")
                    }
                  >
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setLocale(locale === "de" ? "en" : "de")}
          aria-label={t("nav.language")}
          title={locale === "de" ? t("nav.language.en") : t("nav.language.de")}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-line text-ink-soft hover:text-ink hover:bg-amber-soft/50 transition-colors"
        >
          {/* Globus-Symbol */}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3c2.5 2.5 3.5 5.7 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.7-3.5-9S9.5 5.5 12 3z" />
          </svg>
          <span className="text-sm font-semibold uppercase">{locale}</span>
        </button>
      </div>
    </header>
  );
}
