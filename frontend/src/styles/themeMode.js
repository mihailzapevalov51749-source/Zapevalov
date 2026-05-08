const THEME_KEY = "themeMode";

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

export function setTheme(mode) {
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

export function applyTheme(mode) {
  const root = document.documentElement;

  if (mode === "dark") {
    root.setAttribute("data-theme", "dark");
  } else if (mode === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", isDark ? "dark" : "light");
  } else {
    root.setAttribute("data-theme", "light");
  }
}

export function initTheme() {
  const saved = getStoredTheme();
  applyTheme(saved);
}