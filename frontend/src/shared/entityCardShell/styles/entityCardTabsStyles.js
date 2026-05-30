import { entityCardTheme } from "../entityCardTheme";

export const entityCardTabsWrapperStyle = {
  width: "100%",

  border: entityCardTheme.section.border,
  borderRadius: entityCardTheme.section.radius,

  background: entityCardTheme.section.background,

  overflow: "hidden",

  boxSizing: "border-box",
  flexShrink: 0,
};

export const entityCardTabsHeaderStyle = {
  width: "100%",
  height: 52,

  display: "flex",
  alignItems: "center",
  gap: 26,

  padding: "0 18px",

  borderBottom: `1px solid ${entityCardTheme.colors.borderSoft}`,
  background: entityCardTheme.colors.bg,

  boxSizing: "border-box",
  overflowX: "auto",
};

export const entityCardTabButtonStyle = {
  height: "100%",

  padding: 0,

  border: "none",
  borderBottom: "2px solid transparent",

  background: "transparent",

  display: "inline-flex",
  alignItems: "center",
  gap: 8,

  cursor: "pointer",

  fontSize: 13,
  fontWeight: 600,

  color: entityCardTheme.colors.textMuted,

  transition: "all 0.15s ease",

  whiteSpace: "nowrap",
  flexShrink: 0,
};

export const entityCardActiveTabButtonStyle = {
  color: entityCardTheme.colors.primary,
  borderBottom: `2px solid ${entityCardTheme.colors.primary}`,
};

export const entityCardTabIconStyle = {
  width: 15,
  height: 15,

  objectFit: "contain",

  flexShrink: 0,
  opacity: 0.85,
};

export const entityCardTabsContentStyle = {
  width: "100%",
  minHeight: 200,

  padding: "16px 18px",

  boxSizing: "border-box",

  display: "flex",
  flexDirection: "column",
  gap: 16,

  background: entityCardTheme.colors.bg,
};

export const entityCardTabCountBadgeStyle = {
  minWidth: 18,
  height: 18,
  padding: "0 6px",
  borderRadius: 999,
  background: "#EEF2FF",
  color: "#2563EB",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: "18px",
  textAlign: "center",
  boxSizing: "border-box",
};

export const entityCardTabsExpandWrapperStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  marginTop: 14,
  padding: "2px 20px 14px",
};

export const entityCardTabsExpandLineStyle = {
  height: 1,
  flex: 1,
  background: "#CBD5E1",
};

export const entityCardTabsExpandButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#94A3B8",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: "16px",
  cursor: "pointer",
  padding: "0 8px",
};
