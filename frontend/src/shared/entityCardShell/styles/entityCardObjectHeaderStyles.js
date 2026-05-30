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
  gap: 20,
  minWidth: 0,
};

export const entityCardHeaderBackButtonStyle = {
  height: 32,

  border: "none",
  borderRadius: entityCardTheme.radius.sm,

  background: "transparent",

  display: "inline-flex",
  alignItems: "center",
  gap: 7,

  cursor: "pointer",

  padding: "0 6px",

  color: "#465A8B",
};

export const entityCardHeaderBackIconStyle = {
  width: 16,
  height: 16,
  objectFit: "contain",
  opacity: 0.85,
  flexShrink: 0,
};

export const entityCardHeaderBackTextStyle = {
  fontSize: 13,
  fontWeight: 600,
  color: "#465A8B",
  lineHeight: 1,
};

export const entityCardHeaderIdStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#465A8B",
  lineHeight: 1,
  whiteSpace: "nowrap",
};
