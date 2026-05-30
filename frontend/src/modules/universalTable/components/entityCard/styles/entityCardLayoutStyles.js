import { entityCardTheme } from "./entityCardTheme";

/** Fixed comments column width — must match UT Card sidebar. */
export const ENTITY_CARD_SIDEBAR_WIDTH = 300;

export const entityCardLayoutStyle = {
  width: "100%",
  height: "100%",
  flex: "1 1 auto",
  minHeight: 0,
  minWidth: 0,

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

export const entityCardMainColumnStyle = {
  flex: "1 1 0%",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

export const entityCardContentStyle = {
  flex: "1 1 0%",

  minWidth: 0,

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
  width: ENTITY_CARD_SIDEBAR_WIDTH,
  minWidth: ENTITY_CARD_SIDEBAR_WIDTH,
  maxWidth: ENTITY_CARD_SIDEBAR_WIDTH,
  flex: `0 0 ${ENTITY_CARD_SIDEBAR_WIDTH}px`,

  height: "100%",

  borderLeft: "none",

  background: entityCardTheme.colors.bg,

  overflow: "hidden",

  display: "flex",
  flexDirection: "column",

  flexShrink: 0,

  boxSizing: "border-box",
};