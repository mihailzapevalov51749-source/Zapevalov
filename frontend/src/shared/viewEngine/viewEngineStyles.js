/** View Engine table styles (tokens from docs/references/tableStyles.js). */

import {
  VE_CELL_HEIGHT,
  VE_CELL_PADDING_X,
  VE_COLOR_BG,
  VE_COLOR_BG_MUTED,
  VE_COLOR_BORDER,
  VE_COLOR_BORDER_SOFT,
  VE_COLOR_PRIMARY_BG,
  VE_COLOR_ROW_HOVER,
  VE_COLOR_TEXT,
  VE_COLOR_TEXT_HEADER,
  VE_COLOR_TEXT_MUTED,
  VE_DEFAULT_COLUMN_WIDTH,
  VE_FONT_SIZE_CELL,
  VE_FONT_SIZE_HEADER,
  VE_HEADER_MIN_HEIGHT,
  VE_MAX_COLUMN_WIDTH,
  VE_MIN_COLUMN_WIDTH,
  VE_ROW_MIN_HEIGHT,
  VE_TABLE_RADIUS,
  VE_TABLE_ROOT_PADDING_TOP,
  VE_TABLE_SHADOW,
} from "./viewEngineReferenceTokens";

export {
  VE_CELL_HEIGHT as VIEW_ENGINE_CELL_HEIGHT,
  VE_CELL_PADDING_X as VIEW_ENGINE_CELL_PADDING_X,
  VE_HEADER_MIN_HEIGHT as VIEW_ENGINE_HEADER_MIN_HEIGHT,
  VE_ROW_MIN_HEIGHT as VIEW_ENGINE_ROW_MIN_HEIGHT,
  VE_DEFAULT_COLUMN_WIDTH as DEFAULT_COLUMN_WIDTH,
  VE_MIN_COLUMN_WIDTH as MIN_COLUMN_WIDTH,
  VE_MAX_COLUMN_WIDTH as MAX_COLUMN_WIDTH,
};

export const viewEngineTableRootStyle = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${VE_COLOR_BORDER}`,
  borderRadius: VE_TABLE_RADIUS,
  background: VE_COLOR_BG,
  boxSizing: "border-box",
  overflow: "hidden",
  boxShadow: VE_TABLE_SHADOW,
  paddingTop: VE_TABLE_ROOT_PADDING_TOP,
};

export const viewEngineTableInnerStyle = {
  display: "flex",
  flexDirection: "column",
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  width: "100%",
};

export const viewEngineTableBodyScrollStyle = {
  flex: 1,
  width: "100%",
  minWidth: 0,
  minHeight: 0,
  position: "relative",
  overflowX: "auto",
  overflowY: "auto",
  overscrollBehavior: "contain",
  boxSizing: "border-box",
};

export const viewEngineTableBodyContentStyle = {
  minWidth: "fit-content",
  width: "max-content",
  display: "flex",
  flexDirection: "column",
  position: "relative",
};

export const viewEngineHeaderGridStyle = {
  display: "grid",
  width: "fit-content",
  minHeight: VE_HEADER_MIN_HEIGHT,
  borderBottom: `1px solid ${VE_COLOR_BORDER}`,
  fontWeight: 700,
  background: VE_COLOR_BG_MUTED,
  color: VE_COLOR_TEXT_HEADER,
  fontSize: VE_FONT_SIZE_HEADER,
  boxSizing: "border-box",
};

export const viewEngineHeaderCellStyle = {
  position: "relative",
  padding: "8px 10px",
  borderRight: `1px solid ${VE_COLOR_BORDER}`,
  minWidth: 0,
  minHeight: VE_HEADER_MIN_HEIGHT,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  overflow: "visible",
  boxSizing: "border-box",
};

export const viewEngineHeaderTitleStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: VE_COLOR_TEXT_HEADER,
};

export const viewEngineEmptyStateStyle = {
  padding: 16,
  color: VE_COLOR_TEXT_MUTED,
  fontSize: VE_FONT_SIZE_CELL,
  background: VE_COLOR_BG,
  boxSizing: "border-box",
};

export const viewEngineRowGridStyle = {
  display: "grid",
  width: "fit-content",
  minHeight: VE_ROW_MIN_HEIGHT,
  borderBottom: `1px solid ${VE_COLOR_BORDER_SOFT}`,
  fontSize: VE_FONT_SIZE_CELL,
  color: VE_COLOR_TEXT,
  background: VE_COLOR_BG,
  boxSizing: "border-box",
};

export const viewEngineCellWrapperStyle = {
  padding: 0,
  borderRight: `1px solid ${VE_COLOR_BORDER_SOFT}`,
  minWidth: 0,
  minHeight: VE_ROW_MIN_HEIGHT,
  height: "100%",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "stretch",
  overflow: "hidden",
};

export const viewEngineCellInnerStyle = {
  width: "100%",
  minHeight: VE_CELL_HEIGHT,
  padding: `0 ${VE_CELL_PADDING_X}px`,
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  fontSize: VE_FONT_SIZE_CELL,
  color: VE_COLOR_TEXT,
  background: "transparent",
  overflow: "hidden",
};

export const viewEngineRowHoverBackground = VE_COLOR_ROW_HOVER;
export const viewEngineHeaderActiveSortBackground = VE_COLOR_PRIMARY_BG;
