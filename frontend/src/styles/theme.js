export const brandColors = {
  primaryBlue: "#2563FF",
  darkBlue: "#0D1B2A",
  deepBackground: "#0A0F1A",
  textWhite: "#F4F7FB",
  secondaryGray: "#64748B",
  lightGray: "#E2E8F0",

  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#38BDF8",

  gradientBlue: "linear-gradient(135deg, #2563FF, #1E90FF, #3B82F6)",
};

export const lightTheme = {
  name: "light",

  colors: {
    ...brandColors,

    appBackground: "#F1F5F9",
    workspaceBackground: "#F8FAFC",
    panelBackground: "#FFFFFF",
    cardBackground: "#FFFFFF",

    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",

    border: "#E2E8F0",
    borderStrong: "#CBD5E1",

    inputBackground: "#FFFFFF",
    inputDisabledBackground: "#F1F5F9",

    sidebarBackground: "#0A0F1A",
    sidebarPanel: "rgba(255,255,255,0.03)",
    sidebarBorder: "rgba(255,255,255,0.06)",
    sidebarText: "#F4F7FB",
    sidebarTextMuted: "rgba(255,255,255,0.62)",
    sidebarHover: "rgba(255,255,255,0.06)",
    sidebarActive:
      "linear-gradient(135deg, rgba(37,99,255,0.36), rgba(59,130,246,0.24))",
  },
};

export const darkTheme = {
  name: "dark",

  colors: {
    ...brandColors,

    appBackground: "#020617",
    workspaceBackground: "#0A0F1A",
    panelBackground: "#0F172A",
    cardBackground: "#0F172A",

    textPrimary: "#F4F7FB",
    textSecondary: "rgba(255,255,255,0.72)",
    textMuted: "rgba(255,255,255,0.52)",

    border: "rgba(255,255,255,0.06)",
    borderStrong: "rgba(255,255,255,0.1)",

    inputBackground: "#020617",
    inputDisabledBackground: "#111827",

    sidebarBackground: "#0A0F1A",
    sidebarPanel: "rgba(255,255,255,0.03)",
    sidebarBorder: "rgba(255,255,255,0.06)",
    sidebarText: "#F4F7FB",
    sidebarTextMuted: "rgba(255,255,255,0.62)",
    sidebarHover: "rgba(255,255,255,0.06)",
    sidebarActive:
      "linear-gradient(135deg, rgba(37,99,255,0.36), rgba(59,130,246,0.24))",
  },
};

export const theme = lightTheme;

export function getThemeByMode(mode = "light") {
  if (mode === "dark") return darkTheme;
  return lightTheme;
}