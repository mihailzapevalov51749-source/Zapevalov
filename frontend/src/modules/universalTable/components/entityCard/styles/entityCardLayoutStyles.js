import { entityCardTheme } from "./entityCardTheme";

export const entityCardLayoutStyle = {
  width: "100%",
  height: "100%",

  display: "flex",
  flexDirection: "column",

  background: entityCardTheme.colors.bg,

  overflow: "hidden",
};

export const entityCardHeaderContainerStyle = {
  width: "100%",
  height: entityCardTheme.layout.headerHeight,

  flexShrink: 0,

  borderBottom: `1px solid ${entityCardTheme.colors.border}`,

  background: entityCardTheme.colors.bg,

  zIndex: 20,
};

export const entityCardBodyStyle = {
  flex: 1,

  display: "flex",

  minHeight: 0,

  overflow: "hidden",

  background: entityCardTheme.colors.bg,
};

export const entityCardContentStyle = {
  flex: 1,

  minWidth: entityCardTheme.layout.leftPanelMinWidth,

  overflowY: "auto",
  overflowX: "hidden",

  padding: entityCardTheme.layout.bodyPadding,

  background: entityCardTheme.colors.bg,

  display: "flex",
  flexDirection: "column",

  gap: entityCardTheme.layout.bodyGap,

  boxSizing: "border-box",
};

export const entityCardSidebarStyle = {
  width: entityCardTheme.layout.rightPanelWidth,
  minWidth: entityCardTheme.layout.rightPanelWidth,
  maxWidth: entityCardTheme.layout.rightPanelWidth,

  height: "100%",

  borderLeft: `1px solid ${entityCardTheme.colors.border}`,

  background: entityCardTheme.colors.bg,

  overflow: "hidden",

  display: "flex",
  flexDirection: "column",

  boxSizing: "border-box",
};