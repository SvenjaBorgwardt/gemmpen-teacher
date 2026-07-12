"use client";

/*
  Hauptnavigation mit Sprachumschalter.

  - Zeigt auf jedem Screen, wo man ist (aktiver Punkt hervorgehoben).
  - Sichtbarkeit/Aktivzustand ueber die aktive Klasse selbst, nicht ueber ID-Selektoren
    gegen display (Hausregel 9).
  - Ab md: alle Punkte inline. Darunter: Menue-Button klappt die Punkte als
    Panel auf (kein Umbruch mehr ueber das Logo). Menue schliesst bei Navigation.
  - Umschalter-Icon (Globus) wechselt DE/EN, Wahl bleibt in localStorage (siehe i18n).
  - Alle Beschriftungen aus den Locale-Dateien.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  // Menue schliessen, sobald sich die Route aendert.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const links = ITEMS.map((item) => {
    const active = isActive(pathname, item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          aria-current={active ? "page" : undefined}
          className={
            "gp-nav-link block px-3 py-2 rounded-md text-[15px] transition-colors " +
            (active
              ? "bg-amber-soft text-amber-strong font-semibold"
              : "text-ink-soft hover:text-ink hover:bg-amber-soft/50")
          }
        >
          {t(item.key)}
        </Link>
      </li>
    );
  });

  const langToggle = (
    <button
      type="button"
      onClick={() => setLocale(locale === "de" ? "en" : "de")}
      aria-label={t("nav.language")}
      title={locale === "de" ? t("nav.language.en") : t("nav.language.de")}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-line text-ink-soft hover:text-ink hover:bg-amber-soft/50 transition-colors"
    >
      {/* Globus-Symbol */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.5 2.5 3.5 5.7 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.7-3.5-9S9.5 5.5 12 3z" />
      </svg>
      <span className="text-sm font-semibold uppercase">{locale}</span>
    </button>
  );

  return (
    <header className="border-b border-line bg-paper-raised">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-6">
        <Link href="/" className="font-serif text-2xl font-semibold text-ink shrink-0">
          {t("app.name")}
        </Link>

        {/* Ab md: Punkte inline */}
        <nav aria-label={t("nav.dashboard")} className="hidden md:block flex-1">
          <ul className="flex flex-wrap items-center gap-1">{links}</ul>
        </nav>
        <div className="hidden md:block shrink-0">{langToggle}</div>

        {/* Unter md: Menue-Button */}
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={t("nav.menu")}
          className="md:hidden ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-md border border-line text-ink-soft hover:text-ink hover:bg-amber-soft/50 transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
          <span className="text-sm font-semibold">{t("nav.menu")}</span>
        </button>
      </div>

      {/* Unter md: aufklappbares Panel */}
      {menuOpen && (
        <nav id="mobile-nav" aria-label={t("nav.dashboard")} className="md:hidden border-t border-line px-6 py-3">
          <ul className="flex flex-col gap-1">{links}</ul>
          <div className="mt-3 pt-3 border-t border-line">{langToggle}</div>
        </nav>
      )}
    </header>
  );
}
