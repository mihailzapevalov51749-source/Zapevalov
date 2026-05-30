import { entityCardTheme } from "../entityCardTheme";

export const entityCardHeaderStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 18px",
  boxSizing: "border-box",
  background: entityCardTheme.colors.bg,
  flexShrink: 0,
};

export const entityCardHeaderLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  minWidth: 0,
  flex: 1,
};

export const entityCardHeaderTitleWrapStyle = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

export const entityCardHeaderTitleStyle = {
  margin: 0,
  fontSize: 18,
  fontWeight: 800,
  lineHeight: 1.25,
  color: entityCardTheme.colors.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const entityCardHeaderMetaStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: entityCardTheme.colors.textMuted,
  lineHeight: 1.2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const entityCardHeaderStatusBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  background: entityCardTheme.colors.primarySoft,
  color: entityCardTheme.colors.primary,
  flexShrink: 0,
};

export const entityCardHeaderCloseButtonStyle = {
  width: 32,
  height: 32,
  border: "none",
  borderRadius: entityCardTheme.radius.sm,
  background: "transparent",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  color: entityCardTheme.colors.textMuted,
  fontSize: 22,
  lineHeight: 1,
  flexShrink: 0,
};
