import { entityCardTheme } from "./entityCardTheme";

export const entityCardToolbarStyle = {
  height: "100%",

  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",

  gap: 4,

  paddingLeft: 16,

  flexShrink: 0,
};

export const entityCardToolbarButtonStyle = {
  width: 30,
  height: 30,
  minWidth: 30,

  border: "none",
  borderRadius: entityCardTheme.radius.sm,

  background: "transparent",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  cursor: "pointer",

  transition: "background 0.15s ease",

  padding: 0,
};

export const entityCardToolbarCloseButtonStyle = {
  ...entityCardToolbarButtonStyle,
  marginLeft: 4,
};

export const entityCardToolbarIconStyle = {
  width: 15,
  height: 15,

  objectFit: "contain",

  opacity: 0.72,

  flexShrink: 0,
};