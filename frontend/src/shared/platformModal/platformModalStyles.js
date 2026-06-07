/** Same stack as entity card; YASII stays above in reserved corner. */
/** Above entity card (100000), below YASII launcher (120000). */
export const PLATFORM_MODAL_Z_INDEX = 110000;

export const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.22)",
  zIndex: PLATFORM_MODAL_Z_INDEX,
  boxSizing: "border-box",
};

export const panelShellStyle = {
  position: "fixed",
  display: "flex",
  flexDirection: "column",
  background: "#FFFFFF",
  borderRadius: 16,
  border: "1px solid #E2E8F0",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.12)",
  overflow: "hidden",
  boxSizing: "border-box",
  margin: 0,
  right: "auto",
  bottom: "auto",
  transform: "none",
};

export const PLATFORM_MODAL_HEADER_HEIGHT_DEFAULT = 68;
export const PLATFORM_MODAL_HEADER_HEIGHT_COMPACT = 52;

/** Reserved vertical space for footer + resize grip (px). */
export const PLATFORM_MODAL_FOOTER_RESERVE_PX = 68;

/** Footer stays above body scroll; resize handles stay above footer for pointer events. */
export const PLATFORM_MODAL_FOOTER_Z_INDEX = 10;
export const PLATFORM_MODAL_RESIZE_HANDLE_Z_INDEX = 40;
/** Right/bottom grip size; footer gets extra padding when resize is enabled. */
export const PLATFORM_MODAL_RESIZE_GRIP_SIZE_PX = 16;

/** Minimum modal width when footer with two actions is shown. */
export const PLATFORM_MODAL_FOOTER_SAFE_MIN_WIDTH = 300;

/**
 * Platform standard minimum width for work modals (forms, wizards, settings).
 * All new PlatformModal instances should use layoutPreset="standard" (default).
 */
export const PLATFORM_MODAL_STANDARD_MIN_WIDTH = PLATFORM_MODAL_FOOTER_SAFE_MIN_WIDTH;

/** Minimum width for compact confirm/notice modals (delete, close guard). */
export const PLATFORM_MODAL_COMPACT_MIN_WIDTH = 300;

export const headerStyle = {
  flexShrink: 0,
  minHeight: PLATFORM_MODAL_HEADER_HEIGHT_DEFAULT,
  padding: "0 22px",
  borderBottom: "1px solid #E2E8F0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  boxSizing: "border-box",
  background: "#FFFFFF",
  userSelect: "none",
  touchAction: "none",
  position: "relative",
  zIndex: 10,
  pointerEvents: "auto",
};

export const headerCompactStyle = {
  ...headerStyle,
  minHeight: PLATFORM_MODAL_HEADER_HEIGHT_COMPACT,
  padding: "0 18px",
  gap: 10,
};

export const titleStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: "#0F172A",
  lineHeight: 1.2,
};

export const titleCompactStyle = {
  ...titleStyle,
  fontSize: 16,
  fontWeight: 600,
};

export const subtitleStyle = {
  marginTop: 4,
  fontSize: 12,
  color: "#64748B",
  lineHeight: 1.3,
};

export const closeButtonStyle = {
  width: 34,
  height: 34,
  border: "none",
  background: "transparent",
  borderRadius: 10,
  cursor: "pointer",
  color: "#475569",
  fontSize: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

export const closeButtonCompactStyle = {
  ...closeButtonStyle,
  width: 30,
  height: 30,
  borderRadius: 8,
};

export const contentStyle = {
  flex: "1 1 auto",
  minHeight: 0,
  overflow: "hidden",
  boxSizing: "border-box",
};

export const bodyScrollStyle = {
  height: "100%",
  minHeight: 0,
  overflowX: "hidden",
  overflowY: "auto",
  boxSizing: "border-box",
  WebkitOverflowScrolling: "touch",
};

export const footerShellStyle = {
  flex: "0 0 auto",
  flexShrink: 0,
  position: "relative",
  zIndex: PLATFORM_MODAL_FOOTER_Z_INDEX,
  padding: "12px 16px 16px",
  background: "#FFFFFF",
  borderTop: "1px solid #E2E8F0",
  boxSizing: "border-box",
  overflow: "visible",
  minWidth: 0,
};

export const resizeHandleEastStyle = {
  position: "absolute",
  top: 68,
  right: 0,
  width: 8,
  height: "calc(100% - 68px)",
  cursor: "ew-resize",
  zIndex: PLATFORM_MODAL_RESIZE_HANDLE_Z_INDEX,
  pointerEvents: "auto",
};

export const resizeHandleSouthStyle = {
  position: "absolute",
  left: 0,
  bottom: 0,
  width: "100%",
  height: 8,
  cursor: "ns-resize",
  zIndex: PLATFORM_MODAL_RESIZE_HANDLE_Z_INDEX,
  pointerEvents: "auto",
};

export const resizeHandleSouthEastStyle = {
  position: "absolute",
  right: 0,
  bottom: 0,
  width: 14,
  height: 14,
  cursor: "nwse-resize",
  zIndex: PLATFORM_MODAL_RESIZE_HANDLE_Z_INDEX + 1,
  pointerEvents: "auto",
};
