"use client";

/*
  i18n-Helfer fuer gemmpen-teacher.

  - Zwei Locale-Dateien: locales/de.json, locales/en.json.
  - Alle UI-Strings kommen ausschliesslich daraus (Hausregel 8).
  - Standardsprache Englisch (Public-Release), Umschalter in der Navigation.
  - Die Wahl wird in localStorage gemerkt (Schluessel gemmpen.locale).

  Die Sprache wird als externer Speicher (localStorage) ueber useSyncExternalStore
  gelesen. So bleibt die Server-Ausgabe bei der Standardsprache und der Client
  uebernimmt die gespeicherte Wahl ohne setState im Effekt.
*/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import de from "@/locales/de.json";
import en from "@/locales/en.json";
import type { UiLocale } from "./types";

type Messages = Record<string, string>;

const DICTS: Record<UiLocale, Messages> = {
  de: de as Messages,
  en: en as Messages,
};

const STORAGE_KEY = "gemmpen.locale";
const DEFAULT_LOCALE: UiLocale = "en";

/* ---- Externer Sprachspeicher (localStorage + Ereignisse) ---- */

const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  // Auch auf Aenderungen aus anderen Tabs reagieren.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): UiLocale {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "de" ? "de" : "en";
}

// Auf dem Server gibt es kein localStorage: immer Standardsprache.
function getServerSnapshot(): UiLocale {
  return DEFAULT_LOCALE;
}

function storeLocale(next: UiLocale) {
  window.localStorage.setItem(STORAGE_KEY, next);
  notify();
}

/* ---- Kontext ---- */

interface LocaleContextValue {
  locale: UiLocale;
  setLocale: (next: UiLocale) => void;
  /** Uebersetzt einen Schluessel; fehlt er, wird der Schluessel selbst zurueckgegeben. */
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Sprache im html-Element spiegeln (fuer Vorleseprogramme).
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: UiLocale) => {
    storeLocale(next);
  }, []);

  const t = useCallback(
    (key: string) => {
      const dict = DICTS[locale];
      return dict[key] ?? DICTS[DEFAULT_LOCALE][key] ?? key;
    },
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Zugriff auf Sprache und Uebersetzer. Nur innerhalb von LocaleProvider nutzen. */
export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useI18n muss innerhalb von LocaleProvider verwendet werden.");
  }
  return ctx;
}
