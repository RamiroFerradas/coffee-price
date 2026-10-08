export const THEMES = ["classic", "neon", "cyber", "espresso"] as const;

export type ThemeId = (typeof THEMES)[number];

export const DEFAULT_THEME: ThemeId = "espresso";

export const THEME_STORAGE_KEY = "qc-theme";

export function isValidTheme(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function resolveTheme(params?: {
  urlTheme?: string | null;
  storedTheme?: string | null;
}): ThemeId {
  const { urlTheme, storedTheme } = params ?? {};
  if (isValidTheme(urlTheme)) return urlTheme;
  if (isValidTheme(storedTheme)) return storedTheme;
  return DEFAULT_THEME;
}
