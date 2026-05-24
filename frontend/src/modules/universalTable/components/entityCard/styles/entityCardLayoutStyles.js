import { entityCardTheme } from "./entityCardTheme";

export const entityCardLayoutStyle = {
  width: "100%",
  height: "100%",

  display: "flex",

  background: entityCardTheme.colors.bg,

  overflow: "hidden",
};

export const entityCardHeaderContainerStyle = {
  width: "100%",
  height: 54,

  flexShrink: 0,

  borderBottom: "none",

  background: entityCardTheme.colors.bg,

  zIndex: 20,

  boxSizing: "border-box",
};

export const entityCardBodyStyle = {
  flex: 1,

  display: "flex",

  minWidth: 0,
  minHeight: 0,

  overflow: "hidden",

  background: entityCardTheme.colors.bg,
};

export const entityCardContentStyle = {
  flex: 1,

  minWidth:
    entityCardTheme.layout.leftPanelMinWidth,

  overflowY: "auto",
  overflowX: "hidden",

  padding: "0px 10px 14px",

  background: entityCardTheme.colors.bg,

  display: "flex",
  flexDirection: "column",

  gap: 5,

  boxSizing: "border-box",
};

export const entityCardSidebarStyle = {
  width:300,
  minWidth: 300,
  maxWidth: 300,

  height: "100%",

  borderLeft: "none",

  background: entityCardTheme.colors.bg,

  overflow: "hidden",

  display: "flex",
  flexDirection: "column",

  flexShrink: 0,

  boxSizing: "border-box",
};