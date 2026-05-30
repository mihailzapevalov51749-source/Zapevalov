export const tableWrapperStyle = {
  width: "100%",
  height: "100%",
  minHeight: 0,

  overflow: "hidden",

  border: "1px solid #e2e8f0",
  borderRadius: 12,

  background: "#ffffff",

  boxSizing: "border-box",

  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.035)",
};

export const tableViewRootStyle = {
  ...tableWrapperStyle,

  display: "flex",
  flexDirection: "column",

  maxWidth: "100%",
  minWidth: 0,

  height: "100%",
  minHeight: 0,

  overflow: "hidden",

  paddingTop: 8,
};

export const tableViewScrollWrapperStyle = {
  flex: 1,

  width: "100%",
  maxWidth: "100%",
  minWidth: 0,

  height: "100%",
  minHeight: 0,

  overflow: "hidden",

  boxSizing: "border-box",
};

export const getTableViewInnerStyle = (fullTableMinWidth) => ({
  display: "flex",
  flexDirection: "column",

  width: "100%",
  minWidth: 0,

  height: "100%",
  minHeight: 0,

  overflow: "hidden",

  boxSizing: "border-box",
});

export const getTableViewBodyScrollStyle = (fullTableMinWidth) => ({
  flex: 1,

  width: "100%",
  minWidth: 0,

  height: "100%",
  minHeight: 0,

  overflowX: "auto",
  overflowY: "auto",

  boxSizing: "border-box",
});

export const toolbarStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: 10,
  borderBottom: "1px solid #e2e8f0",
  background: "#ffffff",
};

export const addColumnPanelStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  padding: 10,
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
  flexWrap: "wrap",
};

export const headerGridStyle = {
  display: "grid",
  width: "max-content",
  minHeight: 36,
  borderBottom: "1px solid #e2e8f0",
  fontWeight: 700,
  background: "#f8fafc",
  color: "#475569",
  fontSize: 12,
};

export const headerCellStyle = {
  position: "relative",
  padding: "8px 10px",
  borderRight: "1px solid #e2e8f0",
  minWidth: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  overflow: "visible",
  boxSizing: "border-box",
};

export const headerTitleStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const renameColumnInputStyle = {
  width: "100%",
  height: 26,
  border: "1px solid #cbd5e1",
  borderRadius: 7,
  padding: "0 7px",
  outline: "none",
  fontSize: 12,
  fontWeight: 700,
  boxSizing: "border-box",
};

export const emptyTableStyle = {
  padding: 16,
  color: "#64748b",
  fontSize: 13,
  background: "#ffffff",
};

export const rowGridStyle = {
  display: "grid",
  width: "max-content",
  minHeight: 38,
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
  color: "#0f172a",
  background: "#ffffff",
};

export const cellWrapperStyle = {
  padding: 0,
  borderRight: "1px solid #f1f5f9",
  minWidth: 0,
  boxSizing: "border-box",
};

export const cellInputStyle = {
  width: "100%",
  height: 38,
  padding: "0 10px",
  border: "none",
  outline: "none",
  background: "transparent",
  fontSize: 13,
  color: "#0f172a",
  boxSizing: "border-box",
};

export const booleanCellStyle = {
  padding: "8px 10px",
};

export const buttonStyle = {
  height: 32,
  padding: "0 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

export const primaryButtonStyle = {
  ...buttonStyle,
  border: "1px solid #2563ff",
  background: "#2563ff",
  color: "#ffffff",
};

export const inputStyle = {
  height: 36,
  width: 220,
  padding: "0 11px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

export const selectStyle = {
  height: 36,
  padding: "0 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#ffffff",
  fontSize: 13,
  boxSizing: "border-box",
};

export const columnMenuButtonStyle = {
  width: 22,
  height: 22,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
  fontSize: 11,
  flexShrink: 0,
};

export const columnMenuStyle = {
  position: "absolute",
  width: 320,
  padding: 18,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#ffffff",
  boxShadow: "0 20px 42px rgba(15, 23, 42, 0.18)",
  zIndex: 9999,
  display: "grid",
  gap: 14,
  boxSizing: "border-box",
};

export const menuItemStyle = {
  width: "100%",
  padding: "8px 9px",
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#0f172a",
  textAlign: "left",
  fontSize: 14,
  cursor: "pointer",
  boxSizing: "border-box",
};

export const menuDangerItemStyle = {
  ...menuItemStyle,
  color: "#dc2626",
};

export const menuSelectRowStyle = {
  display: "grid",
  gap: 8,
};

export const menuLabelStyle = {
  fontSize: 13,
  color: "#64748b",
  fontWeight: 600,
};

export const menuSelectStyle = {
  width: "100%",
  height: 38,
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#ffffff",
  fontSize: 14,
  boxSizing: "border-box",
};

export const addRowFooterStyle = {
  display: "flex",
  alignItems: "center",
  minHeight: 40,
  padding: "0 12px",
  borderTop: "1px solid #e2e8f0",
  background: "#ffffff",
};

export const addRowFooterButtonStyle = {
  border: "none",
  background: "transparent",
  color: "#2563ff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  padding: 0,
};

export const addColumnHeaderStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  padding: "8px 10px",
  minHeight: 36,
  border: "none",
  background: "transparent",
  color: "#94a3b8",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  boxSizing: "border-box",
  overflow: "visible",
};

export const createColumnMenuStyle = {
  position: "absolute",
  width: 320,
  padding: 18,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#ffffff",
  boxShadow: "0 20px 42px rgba(15, 23, 42, 0.18)",
  zIndex: 9999,
  display: "grid",
  gap: 14,
  boxSizing: "border-box",
};

export const createColumnActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  paddingTop: 4,
};

export const createColumnCheckboxStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
  color: "#334155",
};

export const tableDropdownSpacerStyle = {
  height: 280,
};

/* Table representations bar */

export const tableRepresentationsRootStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  minWidth: 0,
  width: "100%",
  maxWidth: "100%",
  flex: "1 1 auto",
};

export const tableRepresentationsLeftSideStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
  flexShrink: 1,
};

export const tableRepresentationsRightSideStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  marginLeft: "auto",
  flexShrink: 0,
};

export const tableRepresentationsPinnedGroupStyle = {
  display: "inline-flex",
  alignItems: "center",
  minWidth: 0,
  flexShrink: 0,
  border: "1px solid #dbe3ef",
  borderRadius: 8,
  background: "#ffffff",
  overflow: "hidden",
};

export const getTableRepresentationsPinnedButtonStyle = ({
  isActive = false,
  isFirst = false,
  asDiv = false,
}) => ({
  height: 34,
  maxWidth: 190,
  minWidth: 120,
  padding: "0 14px",
  border: "none",
  borderRight: isFirst ? "1px solid #dbe3ef" : "none",
  background: isActive ? "#eff6ff" : "#ffffff",
  color: isActive ? "#2563eb" : "#334155",
  cursor: asDiv ? "default" : "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: isActive ? 800 : 600,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flexShrink: 0,
  boxShadow: isActive ? "inset 0 -2px 0 #2563eb" : "none",
  boxSizing: "border-box",
});

export const tableRepresentationsEmptySlotStyle = {
  height: 34,
  minWidth: 120,
  padding: "0 14px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#94a3b8",
  fontSize: 13,
  fontWeight: 600,
  background: "#f8fafc",
  boxSizing: "border-box",
};

export const tableRepresentationsNameStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const tableRepresentationsOverflowWrapperStyle = {
  position: "relative",
  flexShrink: 0,
};

export const tableRepresentationsOverflowButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#334155",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 800,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};


export const tableRepresentationsOverflowMenuStyle = {
  position: "absolute",
  top: 40,
  right: 0,
  zIndex: 4000,
  minWidth: 380,
  maxWidth: 430,
  padding: 6,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.16)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

export const tableRepresentationsViewsLimitRowStyle = {
  minHeight: 42,
  padding: "4px 8px 8px",
  borderBottom: "1px solid #e2e8f0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

export const tableRepresentationsViewsLimitLabelStyle = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

export const tableRepresentationsViewsLimitControlStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  flexShrink: 0,
};

export const tableRepresentationsViewsLimitArrowButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 7,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#2563eb",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

export const tableRepresentationsViewsLimitInputStyle = {
  width: 44,
  height: 28,
  borderRadius: 7,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  outline: "none",
  textAlign: "center",
  fontSize: 13,
  fontWeight: 800,
  boxSizing: "border-box",
};

export const tableRepresentationsEmptyOverflowStyle = {
  padding: "8px 10px",
  color: "#64748b",
  fontSize: 13,
};

export const tableRepresentationsOverflowItemStyle = {
  minHeight: 44,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "0 6px 0 10px",
};

export const tableRepresentationsOverflowItemNameButtonStyle = {
  minWidth: 0,
  flex: "1 1 auto",
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: 13,
  textAlign: "left",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const tableRepresentationsOverflowRenameWrapperStyle = {
  minWidth: 0,
  flex: "1 1 auto",
  display: "flex",
  alignItems: "center",
};

export const tableRepresentationsOverflowActionsStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  flexShrink: 0,
};

export const tableRepresentationsSlotButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: "1px solid #dbe3ef",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontSize: 13,
  fontWeight: 800,
};

export const tableRepresentationsEyeButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#475569",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  padding: 0,
};

export const tableRepresentationsEyeIconStyle = {
  width: 16,
  height: 16,
  objectFit: "contain",
  pointerEvents: "none",
};

export const tableRepresentationsSettingsWrapperStyle = {
  position: "relative",
  flexShrink: 0,
};

export const tableRepresentationsSettingsButtonStyle = {
  width: 34,
  height: 34,
  borderRadius: 9,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  padding: 0,
};

export const tableRepresentationsSettingsIconStyle = {
  width: 16,
  height: 16,
  objectFit: "contain",
  pointerEvents: "none",
};

export const tableRepresentationsSettingsMenuStyle = {
  position: "absolute",
  top: 38,
  right: 0,
  zIndex: 5000,
  width: 220,
  padding: 6,
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.18)",
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

export const tableRepresentationsSettingsMenuItemStyle = {
  width: "100%",
  minHeight: 32,
  padding: "0 10px",
  border: "none",
  borderRadius: 7,
  background: "transparent",
  color: "#334155",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  textAlign: "left",
  fontSize: 13,
  fontWeight: 600,
};

export const tableRepresentationsSettingsMenuDividerStyle = {
  height: 1,
  background: "#e2e8f0",
  margin: "4px 0",
};

export const tableRepresentationsSettingsMenuBottomActionsStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  paddingTop: 2,
};


export const tableRepresentationsSettingsSaveButtonStyle = {
  height: 32,
  flex: "1 1 0",
  borderRadius: 8,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#2563eb",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};


export const tableRepresentationsSettingsDeleteButtonStyle = {
  height: 32,
  flex: "1 1 0",
  borderRadius: 8,
  border: "1px solid #fecaca",
  background: "#fff7f7",
  color: "#dc2626",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

export const tableRepresentationsRenameFormStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  minWidth: 0,
  width: "100%",
};

export const tableRepresentationsRenameInputStyle = {
  height: 26,
  minWidth: 130,
  width: "100%",
  padding: "0 8px",
  borderRadius: 7,
  border: "1px solid #bfdbfe",
  outline: "none",
  color: "#0f172a",
  background: "#ffffff",
  fontSize: 13,
  fontWeight: 600,
  boxSizing: "border-box",
};

export const tableRepresentationsRenameSaveButtonStyle = {
  width: 26,
  height: 26,
  borderRadius: 7,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#16a34a",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 900,
  flexShrink: 0,
};

export const tableRepresentationsRenameCancelButtonStyle = {
  width: 26,
  height: 26,
  borderRadius: 7,
  border: "1px solid #fecaca",
  background: "#fff7f7",
  color: "#dc2626",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: 900,
  flexShrink: 0,
};

export const tableRepresentationsCreateWrapperStyle = {
  position: "relative",
  flexShrink: 0,
};

export const tableRepresentationsCreateButtonStyle = {
  height: 34,
  padding: "0 14px",
  borderRadius: 8,
  border: "1px solid #93c5fd",
  background: "#ffffff",
  color: "#2563eb",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  fontSize: 13,
  fontWeight: 700,
  flexShrink: 0,
};

export const tableRepresentationsDirtyModalOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 8000,
  background: "rgba(15, 23, 42, 0.22)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const tableRepresentationsDirtyModalStyle = {
  width: 430,
  maxWidth: "calc(100vw - 32px)",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  boxShadow: "0 24px 70px rgba(15, 23, 42, 0.25)",
  padding: 18,
  boxSizing: "border-box",
};

export const tableRepresentationsDirtyModalTitleStyle = {
  color: "#0f172a",
  fontSize: 16,
  fontWeight: 800,
  marginBottom: 8,
};

export const tableRepresentationsDirtyModalTextStyle = {
  color: "#475569",
  fontSize: 13,
  lineHeight: 1.5,
  marginBottom: 18,
};

export const tableRepresentationsDirtyModalActionsStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
};

export const tableRepresentationsDirtyPrimaryButtonStyle = {
  height: 34,
  padding: "0 14px",
  borderRadius: 9,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 800,
};

export const tableRepresentationsDirtySecondaryButtonStyle = {
  height: 34,
  padding: "0 14px",
  borderRadius: 9,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#475569",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};

export const tableRepresentationsDirtyCancelButtonStyle = {
  height: 34,
  padding: "0 14px",
  borderRadius: 9,
  border: "1px solid #dbe3ef",
  background: "#f8fafc",
  color: "#334155",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};

export const tableCss = `
.universal-table-row:hover {
  background: #f8fbff !important;
}

.universal-table-row:focus {
  outline: none;
}

.universal-table-row:focus-visible {
  outline: 2px solid #bfdbfe;
  outline-offset: -2px;
}

.universal-table-row input[type="checkbox"] {
  accent-color: #2563ff;
}

.universal-table-cell-primary {
  font-weight: 700;
  color: #0f172a;
}

.universal-table-muted {
  color: #64748b;
}

.universal-table-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 3px 9px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  background: #eff6ff;
  color: #2563ff;
  border: 1px solid #bfdbfe;
  box-sizing: border-box;
}
`;