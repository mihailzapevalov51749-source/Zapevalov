const settingsCardStyle = {
  width: 328,
   height: "calc(100vh - 32px)",
  maxHeight: "calc(100vh - 116px)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  background: "#ffffff",
  border: "1px solid #e5eaf2",
  borderRadius: 14,
  boxShadow:
    "0 18px 44px rgba(15, 23, 42, 0.14), 0 3px 12px rgba(15, 23, 42, 0.08)",
  color: "#111827",
};

const settingsHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "12px 14px 10px",
  borderBottom: "1px solid #eef2f7",
  flexShrink: 0,
};

const settingsHeaderTitleWrapperStyle = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  minWidth: 0,
  flex: 1,
};

const settingsHeaderTitleStyle = {
  fontSize: 16,
  lineHeight: "22px",
  fontWeight: 700,
  color: "#111827",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const settingsIconButtonStyle = {
  width: 29,
  height: 29,
  borderRadius: 9,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};


const settingsBodyStyle = {
  overflowY: "auto",
  overflowX: "hidden",
  minHeight: 0,
  flex: 1,
  paddingBottom: 12,
};


const settingsBodyBlockStyle = {
  padding: "9px 14px 10px",
};

const settingsActionsBlockStyle = {
  padding: "6px 14px 18px",
};

const settingsCardSummaryStyle = {
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 500,
  color: "#64748b",
  padding: "0 2px 9px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const settingsSectionTitleStyle = {
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 600,
  color: "#8b98aa",
  marginBottom: 8,
};

const settingsListStyle = {
  border: "1px solid #e2e8f0",
  borderRadius: 13,
  overflow: "hidden",
  background: "#ffffff",
};

const settingsRowOuterStyle = {
  borderBottom: "1px solid #eef2f7",
};

const settingsLastRowOuterStyle = {
  borderBottom: "none",
};

const settingsRowButtonStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
};

const settingsRowIconWrapperStyle = {
  width: 29,
  height: 29,
  borderRadius: 9,
  background: "#f3f6fa",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const settingsRowTitleWrapperStyle = {
  minWidth: 0,
  flex: 1,
};

const settingsRowTitleStyle = {
  fontSize: 13,
  lineHeight: "17px",
  fontWeight: 700,
  color: "#111827",
  marginBottom: 1,
  textAlign: "left",
};

const settingsRowDescriptionStyle = {
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 400,
  color: "#66758a",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textAlign: "left",
};

const settingsRowArrowStyle = {
  color: "#9aa7ba",
  fontSize: 18,
  flexShrink: 0,
  transition: "transform 0.16s ease",
};

const settingsDetailsWrapperStyle = {
  padding: "0 10px 10px 49px",
  background: "#f8fbff",
};

const settingsFieldsListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const settingsFilterDetailsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const settingsFilterPreviewListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const settingsOpenFilterButtonStyle = {
  height: 30,
  borderRadius: 9,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#2563eb",
  cursor: "pointer",
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const settingsFieldButtonStyle = {
  minHeight: 32,
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  border: "none",
  background: "transparent",
  padding: "0 2px",
  borderRadius: 8,
  textAlign: "left",
};

const settingsFieldLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

const settingsFieldCheckStyle = {
  width: 16,
  height: 16,
  borderRadius: 5,
  border: "1px solid #cbd5e1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  transition: "all 0.16s ease",
};

const settingsFieldCheckDotStyle = {
  width: 6,
  height: 6,
  borderRadius: 999,
  background: "#ffffff",
};

const settingsFieldTitleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const settingsFieldSystemLabelStyle = {
  flexShrink: 0,
  fontSize: 10,
  lineHeight: "14px",
  fontWeight: 600,
  color: "#94a3b8",
  background: "#eef2f7",
  borderRadius: 999,
  padding: "0 6px",
};

const settingsDetailRowStyle = {
  minHeight: 22,
  display: "flex",
  alignItems: "center",
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 500,
  color: "#334155",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const settingsDetailExtraTextStyle = {
  marginTop: 2,
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 600,
  color: "#64748b",
};

const settingsRowImageStyle = {
  width: 16,
  height: 16,
  objectFit: "contain",
  opacity: 0.9,
};

const settingsHeaderImageStyle = {
  width: 14,
  height: 14,
  objectFit: "contain",
};

const settingsActionButtonStyle = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  height: 32,
  borderRadius: 9,
  border: "none",
  background: "transparent",
  padding: "0 9px",
  cursor: "pointer",
  fontSize: 13,
  lineHeight: "17px",
  fontWeight: 500,
  color: "#111827",
  textAlign: "left",
};

const settingsActionImageStyle = {
  width: 14,
  height: 14,
  objectFit: "contain",
  opacity: 0.85,
};

const settingsFooterStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  padding: "9px 14px 11px",
  borderTop: "1px solid #eef2f7",
  background: "#ffffff",
  flexShrink: 0,
};

const settingsFooterSaveButtonStyle = {
  height: 32,
  borderRadius: 10,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#334155",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const settingsFooterDeleteButtonStyle = {
  height: 32,
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#ffffff",
  color: "#ef4444",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const settingsFooterImageStyle = {
  width: 14,
  height: 14,
  objectFit: "contain",
};

export {
  settingsCardStyle,
  settingsHeaderStyle,
  settingsHeaderTitleWrapperStyle,
  settingsHeaderTitleStyle,
  settingsIconButtonStyle,
  settingsBodyStyle,
  settingsBodyBlockStyle,
  settingsActionsBlockStyle,
  settingsCardSummaryStyle,
  settingsSectionTitleStyle,
  settingsListStyle,
  settingsRowOuterStyle,
  settingsLastRowOuterStyle,
  settingsRowButtonStyle,
  settingsRowIconWrapperStyle,
  settingsRowTitleWrapperStyle,
  settingsRowTitleStyle,
  settingsRowDescriptionStyle,
  settingsRowArrowStyle,
  settingsDetailsWrapperStyle,
  settingsFieldsListStyle,
  settingsFilterDetailsStyle,
  settingsFilterPreviewListStyle,
  settingsOpenFilterButtonStyle,
  settingsFieldButtonStyle,
  settingsFieldLeftStyle,
  settingsFieldCheckStyle,
  settingsFieldCheckDotStyle,
  settingsFieldTitleStyle,
  settingsFieldSystemLabelStyle,
  settingsDetailRowStyle,
  settingsDetailExtraTextStyle,
  settingsRowImageStyle,
  settingsHeaderImageStyle,
  settingsActionButtonStyle,
  settingsActionImageStyle,
  settingsFooterStyle,
  settingsFooterSaveButtonStyle,
  settingsFooterDeleteButtonStyle,
  settingsFooterImageStyle,
};