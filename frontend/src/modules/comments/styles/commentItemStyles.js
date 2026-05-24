import {
  COLLAPSE_LINE_COUNT,
} from "../domain/commentItemUtils";

export const wrapperStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  paddingBottom: 8,
  borderRadius: 12,
  transition: "background 0.25s ease, box-shadow 0.25s ease",
};

export const highlightedWrapperStyle = {
  ...wrapperStyle,
  background: "rgba(59, 109, 245, 0.10)",
  boxShadow: "0 0 0 2px rgba(59, 109, 245, 0.14)",
};

export const rowStyle = {
  width: "100%",
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
};

export const contentStyle = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 3,
};

export const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  minWidth: 0,
};

export const headerLeftStyle = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  minWidth: 0,
};

export const authorStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "#475569",
  lineHeight: 1.15,
};

export const dateStyle = {
  fontSize: 10,
  color: "#94A3B8",
  lineHeight: 1.15,
  fontWeight: 500,
};

export const editedStyle = {
  fontSize: 10,
  color: "#CBD5E1",
  lineHeight: 1.15,
  fontWeight: 500,
};

export const bodyStyle = {
  fontSize: 12,
  color: "#475569",
  lineHeight: 1.38,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

export const collapsedBodyStyle = {
  ...bodyStyle,
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: COLLAPSE_LINE_COUNT,
  overflow: "hidden",
};

export const editTextareaStyle = {
  width: "100%",
  minHeight: 58,
  maxHeight: 160,
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  padding: "8px 10px",
  boxSizing: "border-box",
  resize: "vertical",
  outline: "none",
  fontSize: 12,
  color: "#475569",
  lineHeight: 1.38,
  fontFamily: "inherit",
  background: "#FFFFFF",
};

export const editToolbarStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  marginTop: 8,
};

export const editToolButtonStyle = {
  width: 22,
  height: 22,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#2563EB",
  fontSize: 16,
  lineHeight: 1,
};

export const editAttachmentsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 8,
};

export const editAttachmentRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "5px 8px",
  borderRadius: 8,
  background: "#F8FAFC",
  border: "1px solid #E2E8F0",
};

export const editAttachmentNameStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
};

export const editAttachmentDeleteButtonStyle = {
  width: 22,
  height: 22,
  minWidth: 22,
  border: "none",
  borderRadius: 6,
  background: "#FEE2E2",
  color: "#DC2626",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1,
};

export const editActionsStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 6,
};

export const editButtonStyle = {
  height: 26,
  border: "none",
  borderRadius: 8,
  padding: "0 10px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

export const saveEditButtonStyle = {
  ...editButtonStyle,
  background: "#3B6DF5",
  color: "#FFFFFF",
};

export const cancelEditButtonStyle = {
  ...editButtonStyle,
  background: "#F1F5F9",
  color: "#64748B",
};

export const textToggleStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  margin: "3px 0 0",
  padding: 0,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  color: "#94A3B8",
  fontSize: 11,
  fontWeight: 700,
};

export const textToggleLineStyle = {
  height: 1,
  flex: 1,
  background: "#E2E8F0",
};

export const textToggleLabelStyle = {
  whiteSpace: "nowrap",
};

export const moreButtonStyle = {
  width: 22,
  height: 22,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: "#94A3B8",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 18,
  lineHeight: 1,
  padding: 0,
};

export const menuStyle = {
  position: "fixed",
  width: 150,
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 10,
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.16)",
  padding: 6,
  zIndex: 300000,
};

export const menuButtonStyle = {
  width: "100%",
  height: 30,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#475569",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  textAlign: "left",
  padding: "0 8px",
};

export const menuDeleteButtonStyle = {
  ...menuButtonStyle,
  color: "#DC2626",
};

export const actionsStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  marginTop: 2,
};

export const actionsRightStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
};

export const reactionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  flexWrap: "wrap",
};

export const reactionBadgeStyle = {
  height: 20,
  border: "none",
  borderRadius: 999,
  background: "#F8FAFC",
  padding: "0 6px",
  display: "flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  fontSize: 11,
  color: "#64748B",
};

export const reactionTriggerStyle = {
  height: 18,
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  gap: 2,
  cursor: "pointer",
  padding: 0,
  opacity: 0.82,
};

export const chevronStyle = {
  fontSize: 8,
  color: "#CBD5E1",
  lineHeight: 1,
  transform: "translateY(-1px)",
};

export const reactionsPopoverWrapperStyle = {
  position: "relative",
};

export const reactionsOverlayStyle = {
  position: "fixed",
  display: "flex",
  alignItems: "center",
  gap: 3,
  width: "max-content",
  padding: "4px 6px",
  borderRadius: 999,
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.14)",
  zIndex: 300000,
};

export const reactionEmojiButtonStyle = {
  width: 28,
  height: 28,
  border: "none",
  borderRadius: "50%",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

export const replyButtonStyle = {
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 500,
  color: "#94A3B8",
  whiteSpace: "nowrap",
};

export const repliesDividerStyle = {
  marginLeft: 36,
  marginRight: 8,
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
  userSelect: "none",
};

export const repliesDividerLineStyle = {
  height: 1,
  flex: 1,
  background: "#E2E8F0",
};

export const repliesDividerTextStyle = {
  border: "none",
  background: "transparent",
  padding: 0,
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 700,
  color: "#94A3B8",
  whiteSpace: "nowrap",
};

export const systemStyle = {
  marginLeft: 0,
  padding: "6px 10px 6px 36px",
  borderRadius: 8,
  background: "#F8FAFC",
  border: "none",
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

export const systemTitleStyle = {
  fontSize: 11,
  fontWeight: 600,
  color: "#94A3B8",
};

export const systemBodyStyle = {
  fontSize: 12,
  color: "#64748B",
  lineHeight: 1.35,
  whiteSpace: "pre-wrap",
};

export const repliesWrapperStyle = {
  marginLeft: 36,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export const replyComposerStyle = {
  marginLeft: 36,
};

export const popoverOverlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 300000,
  background: "transparent",
};

export const popoverStyle = {
  position: "fixed",
  overflowY: "auto",
  background: "#FFFFFF",
  border: "1px solid #E2E8F0",
  borderRadius: 12,
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.16)",
  padding: 6,
  zIndex: 300001,
  boxSizing: "border-box",
};

export const userButtonStyle = {
  width: "100%",
  border: "none",
  background: "transparent",
  padding: "9px 10px",
  borderRadius: 8,
  cursor: "pointer",
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  textAlign: "left",
};