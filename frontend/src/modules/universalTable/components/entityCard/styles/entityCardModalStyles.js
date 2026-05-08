import { entityCardTheme } from "./entityCardTheme";

export const entityCardOverlayStyle = {
  position: "fixed",

  top: 8,
  left: 276,
  right: 0,
  bottom: 0,

  zIndex: 100000,

  background: "transparent",

  display: "flex",
  alignItems: "stretch",
  justifyContent: "center",

  padding: "8px 10px",

  boxSizing: "border-box",
};

export const entityCardModalStyle = {
  width: "100%",
  maxWidth: 1480,

  height: "100%",

  background: entityCardTheme.colors.bg,

  borderRadius: 14,

  overflow: "hidden",

  border: `1px solid ${entityCardTheme.colors.border}`,

  boxSizing: "border-box",

  boxShadow:
    "0 1px 2px rgba(15,23,42,0.04), 0 18px 54px rgba(15,23,42,0.10)",
};