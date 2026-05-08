import { entityCardTheme } from "./entityCardTheme";

export const entityCardParentStyle = {
  width: "100%",
  minHeight: 42,

  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",

  padding: "0 16px",
  boxSizing: "border-box",

  background: entityCardTheme.colors.primarySoft,
  border: `1px solid ${entityCardTheme.colors.primaryBorder}`,
  borderRadius: entityCardTheme.radius.md,

  cursor: "pointer",

  flexShrink: 0,
};

export const entityCardParentLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  minWidth: 0,
};

export const entityCardParentIconBoxStyle = {
  width: 22,
  height: 22,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: 6,

  background: "rgba(37, 99, 235, 0.08)",

  flexShrink: 0,
};

export const entityCardParentIconStyle = {
  width: 13,
  height: 13,
  objectFit: "contain",
  opacity: 0.9,
};

export const entityCardParentLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: entityCardTheme.colors.primary,
  whiteSpace: "nowrap",
};

export const entityCardParentDividerStyle = {
  fontSize: 14,
  color: "#7C8DB5",
  flexShrink: 0,
};

export const entityCardParentValueStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: entityCardTheme.colors.text,

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const entityCardParentIdStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: entityCardTheme.colors.primary,

  flexShrink: 0,
  marginLeft: 16,
};