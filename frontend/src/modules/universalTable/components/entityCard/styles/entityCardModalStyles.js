import { entityCardTheme } from "./entityCardTheme";

export const entityCardOverlayStyle = {
  position: "fixed",

  inset: 0,

  zIndex: 100000,

  background: "rgba(15, 23, 42, 0.24)",

  display: "flex",

  alignItems: "center",

  justifyContent: "flex-start",

  padding: 20,

  paddingLeft: 350,

  boxSizing: "border-box",

  backdropFilter: "blur(2px)",
};

export const entityCardModalStyle = {
  width: "min(980px, calc(100vw - 120px))",

  height: "min(1040px, calc(100vh - 12px))",

  background: entityCardTheme.colors.bg,

  borderRadius: 8,

  overflow: "hidden",

  boxSizing: "border-box",

  display: "flex",

  border: `1px solid ${entityCardTheme.colors.border}`,

  boxShadow:
    "0 18px 54px rgba(15, 23, 42, 0.22)",
};