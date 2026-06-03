/** Scrollable body inside PlatformModal (card settings). */
export const contentStyle = {
  padding: "14px 16px 16px",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

export const sectionCardStyle = {
  border: "1px solid #E2E8F0",
  borderRadius: 14,
  background: "#FFFFFF",
  overflow: "hidden",
  flexShrink: 0,
};

export const sectionStyle = {
  ...sectionCardStyle,
};

export const sectionHeaderStyle = {
  minHeight: 48,
  padding: "8px 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #EEF2F7",
  boxSizing: "border-box",
};

export const sectionHeaderLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
};

export const sectionTitleStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#0F172A",
  lineHeight: 1.2,
};

export const sectionDescriptionStyle = {
  marginTop: 4,
  fontSize: 12,
  color: "#64748B",
  lineHeight: 1.3,
};

export const listStyle = {
  display: "flex",
  flexDirection: "column",
};

export const rowStyle = {
  minHeight: 38,
  padding: "0 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  borderBottom: "1px solid #F1F5F9",
  boxSizing: "border-box",
  flexShrink: 0,
  background: "#FFFFFF",
  transition: "0.15s ease",
};

export const dragOverRowStyle = {
  ...rowStyle,
  background: "#EFF6FF",
  boxShadow: "inset 3px 0 0 #2563EB",
};

export const leftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
  flex: 1,
};

export const dragHandleStyle = {
  width: 14,
  minWidth: 14,
  color: "#94A3B8",
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "grab",
  userSelect: "none",
};

export const rowLabelStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: "#0F172A",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  lineHeight: 1.25,
};

export const disabledRowLabelStyle = {
  ...rowLabelStyle,
  opacity: 0.45,
};

export const rowMetaStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: "#94A3B8",
  lineHeight: 1.2,
};

export const rowTextWrapperStyle = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

export const moveButtonsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  flexShrink: 0,
};

export const visibilityButtonStyle = {
  width: 26,
  height: 26,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

export const visibilityIconStyle = {
  width: 15,
  height: 15,
  opacity: 0.9,
};

export const hiddenVisibilityIconStyle = {
  ...visibilityIconStyle,
  opacity: 0.24,
  filter: "grayscale(1)",
};

export const fieldsListStyle = {
  ...listStyle,
  maxHeight: "none",
  overflowY: "visible",
  overflowX: "hidden",
};

export const collapseButtonStyle = {
  width: 28,
  height: 28,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#64748B",
  fontSize: 16,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

export const footerActionsStyle = {
  display: "flex",
  flexDirection: "row",
  alignItems: "stretch",
  gap: 12,
  width: "100%",
};

export const resetButtonStyle = {
  flex: "1 1 0",
  minWidth: 0,
  height: 42,
  border: "1px solid #CBD5E1",
  borderRadius: 14,
  background: "#FFFFFF",
  color: "#475569",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  padding: "0 12px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  boxSizing: "border-box",
};

export const saveButtonStyle = {
  width: "100%",
  height: 42,
  border: "1px solid #CBD5E1",
  borderRadius: 14,
  background: "#FFFFFF",
  color: "#0F172A",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  transition: "0.15s ease",
};

export const saveButtonCompactStyle = {
  ...saveButtonStyle,
  flex: "1 1 0",
  minWidth: 0,
  width: "auto",
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};

export const saveIconStyle = {
  width: 16,
  height: 16,
  opacity: 0.9,
};
