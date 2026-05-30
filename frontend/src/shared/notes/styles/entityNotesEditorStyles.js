export const DEFAULT_WORKSPACE_LEFT_OFFSET = 240;

export const TEXT_COLORS = [
  "#0F172A",
  "#334155",
  "#64748B",
  "#DC2626",
  "#EA580C",
  "#CA8A04",
  "#16A34A",
  "#0891B2",
  "#2563EB",
  "#7C3AED",
  "#C026D3",
  "#DB2777",
];

export const wrapperStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

export function getFullscreenOverlayStyle(workspaceLeftOffset = DEFAULT_WORKSPACE_LEFT_OFFSET) {
  return {
    position: "fixed",
    left: workspaceLeftOffset,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
    background: "#F8FAFC",
    display: "flex",
    justifyContent: "center",
    overflowY: "auto",
    padding: "40px 0",
    boxSizing: "border-box",
  };
}

export const fullscreenInnerStyle = {
  width: 794,
  minHeight: 1123,
  background: "#FFFFFF",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  padding: "24px 32px 40px",
  boxSizing: "border-box",
};

export const toolbarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  padding: "0 0 8px",
  borderBottom: "1px solid #E2E8F0",
};

export const toolbarLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  flex: 1,
  minWidth: 0,
};

export const toolbarRightStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 5,
  minWidth: 250,
  flexShrink: 0,
};

export const toolbarPublishStatusStyle = {
  width: 150,
  color: "#64748B",
  fontSize: 12,
  lineHeight: "16px",
  textAlign: "right",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flexShrink: 0,
};

export const toolbarPublishWarningStatusStyle = {
  width: 150,
  color: "#EA580C",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: "16px",
  textAlign: "right",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flexShrink: 0,
};

export const toolbarButtonStyle = {
  width: 26,
  height: 28,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  flexShrink: 0,
};

export const toolbarIconStyle = {
  width: 15,
  height: 15,
  opacity: 0.72,
};

export const colorPopoverStyle = {
  position: "absolute",
  top: 34,
  left: 0,
  zIndex: 50,
  display: "grid",
  gridTemplateColumns: "repeat(4, 24px)",
  gap: 8,
  padding: 10,
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  background: "#FFFFFF",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
};

export const colorButtonStyle = {
  width: 24,
  height: 24,
  borderRadius: 999,
  border: "2px solid #FFFFFF",
  cursor: "pointer",
  boxShadow: "0 0 0 1px #CBD5E1 inset",
};

export const editorBoxStyle = {
  position: "relative",
  minHeight: 180,
  background: "#FFFFFF",
  overflow: "hidden",
};

export const fullscreenEditorBoxStyle = {
  minHeight: 920,
};

export const editorStyle = {
  minHeight: 180,
  border: "none",
  outline: "none",
  background: "transparent",
  color: "#0F172A",
  fontSize: 14,
  lineHeight: "24px",
  padding: "14px 2px 28px",
  boxSizing: "border-box",
};

export const fullscreenEditorStyle = {
  minHeight: 920,
  fontSize: 15,
  lineHeight: "28px",
};

export const placeholderStyle = {
  position: "absolute",
  top: 14,
  left: 2,
  color: "#94A3B8",
  fontSize: 13,
  lineHeight: "24px",
  pointerEvents: "none",
};

export const saveStatusStyle = {
  position: "absolute",
  right: 2,
  bottom: 0,
  color: "#94A3B8",
  fontSize: 11,
  lineHeight: "14px",
  pointerEvents: "none",
};

export const loadingStyle = {
  color: "#94A3B8",
  fontSize: 13,
};

export const mentionPopoverOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 300000,
  background: "transparent",
};

export const mentionPopoverStyle = {
  position: "fixed",
  width: 320,
  maxHeight: 190,
  overflowY: "auto",
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16)",
  padding: 6,
  zIndex: 300001,
  boxSizing: "border-box",
};

export const mentionUserButtonStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  padding: "9px 10px",
  borderRadius: 8,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 10,
  textAlign: "left",
};

export const mentionAvatarStyle = {
  width: 32,
  height: 32,
  minWidth: 32,
  borderRadius: "50%",
  background: "#E2E8F0",
  color: "#0F172A",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 800,
  overflow: "hidden",
};

export const mentionChipStyle = `
  display: inline-flex;
  align-items: center;
  max-width: 240px;
  padding: 1px 6px;
  margin: 0 2px;
  border-radius: 999px;
  background: #EEF2FF;
  color: #2563EB;
  font-weight: 700;
  white-space: nowrap;
  scroll-margin-top: 120px;
  transition: all 0.25s ease;
`;

export const publishConfirmOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 400000,
  background: "rgba(15, 23, 42, 0.32)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  boxSizing: "border-box",
};

export const publishConfirmModalStyle = {
  width: 420,
  maxWidth: "100%",
  background: "#FFFFFF",
  borderRadius: 14,
  boxShadow: "0 20px 50px rgba(15, 23, 42, 0.22)",
  padding: 20,
  boxSizing: "border-box",
};

export const publishConfirmTitleStyle = {
  color: "#0F172A",
  fontSize: 16,
  fontWeight: 800,
  lineHeight: "22px",
  marginBottom: 8,
};

export const publishConfirmTextStyle = {
  color: "#475569",
  fontSize: 13,
  lineHeight: "20px",
  marginBottom: 18,
};

export const publishConfirmActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
};

export const publishConfirmSecondaryButtonStyle = {
  height: 34,
  padding: "0 14px",
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  background: "#FFFFFF",
  color: "#334155",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

export const publishConfirmPrimaryButtonStyle = {
  height: 34,
  padding: "0 14px",
  border: "1px solid #2563EB",
  borderRadius: 8,
  background: "#2563EB",
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
