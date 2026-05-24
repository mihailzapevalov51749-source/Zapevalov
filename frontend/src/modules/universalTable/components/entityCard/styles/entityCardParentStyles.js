import { entityCardTheme } from "./entityCardTheme";

export const entityCardParentStyle = {
  width: "100%",
  minHeight: 34,

  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",

  padding: "0 12px",
  boxSizing: "border-box",

  background: entityCardTheme.colors.primarySoft,
  border: `1px solid ${entityCardTheme.colors.primaryBorder}`,
  borderRadius: 8,

  cursor: "pointer",

  flexShrink: 0,
};

export const entityCardParentLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

export const entityCardParentIconBoxStyle = {
  width: 18,
  height: 18,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  borderRadius: 4,

  background: "rgba(37, 99, 235, 0.08)",

  flexShrink: 0,
};

export const entityCardParentIconStyle = {
  width: 11,
  height: 11,
  objectFit: "contain",
  opacity: 0.9,
};

export const entityCardParentLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  color: entityCardTheme.colors.primary,
  whiteSpace: "nowrap",
};

export const entityCardParentDividerStyle = {
  fontSize: 12,
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
  fontSize: 11,
  fontWeight: 700,
  color: entityCardTheme.colors.primary,

  flexShrink: 0,
  marginLeft: 12,
};