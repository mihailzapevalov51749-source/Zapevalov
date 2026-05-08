export const FONT_FAMILY = "Inter, Manrope, Arial, sans-serif";

export const textBase = {
  fontFamily: FONT_FAMILY,
  fontSize: 13,
  lineHeight: 1.35,
  color: "#0f172a",
};

export const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 3000,
  background: "rgba(15, 23, 42, 0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const modalStyle = {
  width: 760,
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "calc(100vh - 32px)",
  borderRadius: 12,
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 16px 50px rgba(15, 23, 42, 0.18)",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  fontFamily: FONT_FAMILY,
};

export const headerStyle = {
  minHeight: 54,
  padding: "13px 18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #e2e8f0",
  boxSizing: "border-box",
  flexShrink: 0,
};

export const titleStyle = {
  ...textBase,
  fontSize: 18,
  fontWeight: 800,
};

export const subtitleStyle = {
  ...textBase,
  marginTop: 4,
  color: "#64748b",
  fontWeight: 500,
};

export const closeButtonStyle = {
  ...textBase,
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#64748b",
  cursor: "pointer",
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

export const bodyStyle = {
  padding: 16,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  background: "#ffffff",
};

export const emptyStateStyle = {
  ...textBase,
  marginBottom: 10,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#92400e",
  fontWeight: 600,
};

export const topLineStyle = {
  marginBottom: 14,
};

export const filterNameLineStyle = {
  display: "grid",
  gridTemplateColumns: "104px 1fr",
  alignItems: "center",
  gap: 10,
};

export const fieldLabelInlineStyle = {
  ...textBase,
  color: "#64748b",
  fontWeight: 800,
};

export const quickFilterInputCompactStyle = {
  ...textBase,
  width: "100%",
  height: 32,
  borderRadius: 8,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  padding: "0 10px",
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
};

export const sectionHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 8,
  flexShrink: 0,
};

export const sectionTitleCompactStyle = {
  ...textBase,
  fontSize: 18,
  fontWeight: 800,
};

export const savedFiltersSelectStyle = {
  ...textBase,
  width: 190,
  height: 40,
  borderRadius: 8,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  padding: "0 10px",
  fontWeight: 700,
  outline: "none",
  cursor: "pointer",
};

export const conditionsTableHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "1.25fr 0.9fr 1.25fr 38px",
  alignItems: "center",
  gap: 8,
  height: 24,
  padding: "0 2px",
  flexShrink: 0,
};

export const conditionHeaderTextStyle = {
  ...textBase,
  color: "#94a3b8",
  fontWeight: 800,
};

export const conditionsListStyle = {
  maxHeight: 260,
  overflowY: "auto",
  paddingRight: 2,
  minHeight: 34,
};

export const conditionRowStyle = {
  display: "grid",
  gridTemplateColumns: "1.25fr 0.9fr 1.25fr 38px",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
};

export const selectStyle = {
  ...textBase,
  height: 40,
  borderRadius: 8,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  padding: "0 10px",
  fontWeight: 500,
  outline: "none",
  minWidth: 0,
};

export const operatorSelectStyle = {
  ...selectStyle,
};

export const inputStyle = {
  ...textBase,
  height: 40,
  borderRadius: 8,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  padding: "0 10px",
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  minWidth: 0,
};

export const userSearchRootStyle = {
  position: "relative",
  minWidth: 0,
};

export const userClearButtonStyle = {
  position: "absolute",
  right: 8,
  top: "50%",
  transform: "translateY(-50%)",
  width: 22,
  height: 22,
  borderRadius: 7,
  border: "none",
  background: "transparent",
  color: "#94a3b8",
  cursor: "pointer",
  fontFamily: FONT_FAMILY,
  fontSize: 16,
  fontWeight: 800,
  lineHeight: 1,
};

export const userDropdownStyle = {
  position: "fixed",
  zIndex: 10000,
  maxHeight: 220,
  overflowY: "auto",
  borderRadius: 10,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.18)",
  padding: 4,
};

export const userOptionStyle = {
  width: "100%",
  minHeight: 42,
  padding: "7px 9px",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: 2,
  textAlign: "left",
  fontFamily: FONT_FAMILY,
};

export const userOptionNameStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: 13,
  lineHeight: 1.25,
  fontWeight: 700,
  color: "#0f172a",
};

export const userOptionMetaStyle = {
  fontFamily: FONT_FAMILY,
  fontSize: 12,
  lineHeight: 1.25,
  fontWeight: 500,
  color: "#64748b",
};

export const userEmptyOptionStyle = {
  ...textBase,
  padding: "10px 9px",
  color: "#64748b",
  fontWeight: 600,
};

export const removeButtonStyle = {
  ...textBase,
  width: 38,
  height: 38,
  borderRadius: 8,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  fontWeight: 700,
};

export const addButtonStyle = {
  ...textBase,
  height: 40,
  width: 130,
  padding: "0 12px",
  marginTop: 6,
  borderRadius: 8,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#2563ff",
  cursor: "pointer",
  fontWeight: 800,
  flexShrink: 0,
};

export const footerStyle = {
  padding: "12px 16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  borderTop: "1px solid #e2e8f0",
  background: "#ffffff",
  flexShrink: 0,
};

export const secondaryButtonStyle = {
  ...textBase,
  height: 42,
  padding: "0 18px",
  borderRadius: 8,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#334155",
  cursor: "pointer",
  fontWeight: 700,
};

export const primaryButtonStyle = {
  ...textBase,
  height: 42,
  padding: "0 20px",
  borderRadius: 8,
  border: "1px solid #2563ff",
  background: "#2563ff",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 800,
};

export const dangerButtonStyle = {
  ...textBase,
  height: 42,
  padding: "0 18px",
  marginRight: "auto",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "#fff7f7",
  color: "#dc2626",
  cursor: "pointer",
  fontWeight: 800,
};