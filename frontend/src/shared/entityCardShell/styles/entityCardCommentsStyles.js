import { entityCardTheme } from "../entityCardTheme";

export const entityCardCommentsStyle = {
  width: "100%",
  height: "100%",
  minWidth: 0,
  maxWidth: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: "14px",
  boxSizing: "border-box",
  background: entityCardTheme.colors.bg,
  overflow: "hidden",
};

export const entityCardCommentsHeaderStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

export const entityCardCommentsTitleStyle = {
  fontSize: 13,
  fontWeight: 800,
  color: entityCardTheme.colors.text,
  lineHeight: 1.2,
};

export const entityCardCommentsListStyle = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  display: "flex",
  flexDirection: "column",
  gap: 10,
  paddingRight: 2,
};

export const entityCardCommentsEmptyStyle = {
  flex: 1,
  minHeight: 260,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: "24px 18px",
  boxSizing: "border-box",
};

export const entityCardCommentsEmptyIconStyle = {
  width: 72,
  height: 72,
  borderRadius: "50%",
  background: "#FFF7F1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 18,
  flexShrink: 0,
};

export const entityCardCommentsEmptyTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#475569",
  lineHeight: 1.35,
  marginBottom: 6,
};

export const entityCardCommentsEmptyTextStyle = {
  maxWidth: 220,
  fontSize: 12,
  color: "#94A3B8",
  lineHeight: 1.5,
};

export const entityCardCommentCardStyle = {
  width: "100%",
  border: `1px solid ${entityCardTheme.colors.borderSoft}`,
  borderRadius: entityCardTheme.radius.md,
  background: entityCardTheme.colors.bg,
  padding: "12px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

export const entityCardCommentTopStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
};

export const entityCardCommentAvatarStyle = {
  width: 32,
  height: 32,
  minWidth: 32,
  borderRadius: "50%",
  background: "#E0E7FF",
  color: "#3730A3",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 700,
  userSelect: "none",
};

export const entityCardCommentAuthorStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: entityCardTheme.colors.text,
  lineHeight: 1.2,
};

export const entityCardCommentDateStyle = {
  fontSize: 11,
  color: entityCardTheme.colors.textMuted,
  marginTop: 2,
  lineHeight: 1.2,
};

export const entityCardCommentTextStyle = {
  fontSize: 13,
  color: entityCardTheme.colors.text,
  lineHeight: 1.55,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

export const entityCardCommentActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export const entityCardCommentActionButtonStyle = {
  width: 28,
  height: 28,
  minWidth: 28,
  border: `1px solid ${entityCardTheme.colors.borderSoft}`,
  borderRadius: entityCardTheme.radius.sm,
  background: entityCardTheme.colors.bg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
};

export const entityCardCommentInputWrapperStyle = {
  width: "100%",
  border: "1px solid #E5E7EB",
  borderRadius: 14,
  background: "#FFFFFF",
  padding: "8px 8px 8px 10px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  flexShrink: 0,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

export const entityCardCommentTextareaStyle = {
  width: "100%",
  minHeight: 18,
  height: 18,
  border: "none",
  resize: "none",
  outline: "none",
  background: "transparent",
  fontSize: 12,
  color: entityCardTheme.colors.text,
  lineHeight: "18px",
  fontFamily: "inherit",
  boxSizing: "border-box",
  padding: 0,
};

export const entityCardCommentToolbarStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

export const entityCardCommentToolbarLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

export const entityCardCommentToolbarButtonStyle = {
  width: 18,
  height: 18,
  minWidth: 18,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  opacity: 0.82,
};

export const entityCardCommentSendButtonStyle = {
  width: 32,
  height: 32,
  minWidth: 32,
  border: "none",
  borderRadius: 9,
  background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  boxShadow: "0 8px 16px rgba(37, 99, 235, 0.28)",
};

export const entityCardCommentIconStyle = {
  width: 15,
  height: 15,
  objectFit: "contain",
  flexShrink: 0,
};
