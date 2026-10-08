"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
  isValidTheme,
  resolveTheme,
  type ThemeId,
} from "@/lib/theme";

const THEME_LABELS: Record<ThemeId, string> = {
  classic: "Classic",
  neon: "Neon",
  cyber: "Cyber",
  espresso: "Espresso",
};

const THEME_CHANGE_EVENT = "qc-theme-change";

function readStoredTheme(): string | null {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readUrlTheme(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("theme");
  } catch {
    return null;
  }
}

function currentTheme(): ThemeId {
  const fromDom = document.documentElement.dataset.theme;
  if (isValidTheme(fromDom)) return fromDom;
  return resolveTheme({ urlTheme: readUrlTheme(), storedTheme: readStoredTheme() });
}

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
}

function serverTheme(): ThemeId {
  return DEFAULT_THEME;
}

export function ThemeSwitcher() {
  const active = useSyncExternalStore(subscribe, currentTheme, serverTheme);

  // Re-apply the resolved theme if React cleared the <html> attribute (dev Strict Mode
  // remount). Writes only — the state above already reflects the same value.
  useEffect(() => {
    if (!isValidTheme(document.documentElement.dataset.theme)) {
      document.documentElement.setAttribute("data-theme", currentTheme());
    }
  }, []);

  const select = (theme: ThemeId) => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage unavailable (private mode): the in-page theme still applies.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return (
    <div
      role="group"
      aria-label="Tema"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-line bg-surface/90 p-1 shadow-sm backdrop-blur"
    >
      {THEMES.map((theme) => (
        <button
          key={theme}
          type="button"
          aria-pressed={active === theme}
          onClick={() => select(theme)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200 ${
            active === theme
              ? "bg-accent text-on-accent"
              : "text-muted hover:text-accent"
          }`}
        >
          {THEME_LABELS[theme]}
        </button>
      ))}
    </div>
  );
}
