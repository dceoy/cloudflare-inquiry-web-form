export type Theme = "light" | "dark";

const themeStorageKey = "theme";

const isTheme = (value: string | null): value is Theme =>
  value === "light" || value === "dark";

export const getStoredTheme = (): Theme | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(themeStorageKey);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
};

const getSystemTheme = (): Theme => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const getInitialTheme = (): {
  theme: Theme;
  source: "stored" | "system";
} => {
  const storedTheme = getStoredTheme();

  if (storedTheme) {
    return { theme: storedTheme, source: "stored" };
  }

  return { theme: getSystemTheme(), source: "system" };
};
