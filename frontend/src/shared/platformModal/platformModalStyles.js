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

export const headerStyle = {
  flexShrink: 0,
  minHeight: 68,
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

export const titleStyle = {
  fontSize: 18,
  fontWeight: 700,
  color: "#0F172A",
  lineHeight: 1.2,
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

export const contentStyle = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  boxSizing: "border-box",
};

export const footerShellStyle = {
  flexShrink: 0,
  marginTop: "auto",
  padding: "12px 16px 16px",
  background: "#FFFFFF",
  borderTop: "1px solid #E2E8F0",
  boxSizing: "border-box",
};

export const resizeHandleEastStyle = {
  position: "absolute",
  top: 68,
  right: 0,
  width: 8,
  height: "calc(100% - 68px)",
  cursor: "ew-resize",
  zIndex: 2,
};

export const resizeHandleSouthStyle = {
  position: "absolute",
  left: 0,
  bottom: 0,
  width: "100%",
  height: 8,
  cursor: "ns-resize",
  zIndex: 2,
};

export const resizeHandleSouthEastStyle = {
  position: "absolute",
  right: 0,
  bottom: 0,
  width: 14,
  height: 14,
  cursor: "nwse-resize",
  zIndex: 3,
};
