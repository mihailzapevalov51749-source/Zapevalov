import { entityCardTheme } from "./entityCardTheme";

export const entityCardCommentsStyle = {
  width: "100%",
  height: "100%",

  display: "flex",
  flexDirection: "column",

  gap: 14,

  padding: "14px",

  boxSizing: "border-box",

  background: entityCardTheme.colors.bg,
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

  border: `1px solid ${entityCardTheme.colors.border}`,

  borderRadius: entityCardTheme.radius.md,

  background: entityCardTheme.colors.bg,

  padding: "10px",

  boxSizing: "border-box",

  display: "flex",
  flexDirection: "column",

  gap: 10,

  flexShrink: 0,
};

export const entityCardCommentTextareaStyle = {
  width: "100%",
  minHeight: 72,

  border: "none",

  resize: "none",

  outline: "none",

  background: "transparent",

  fontSize: 13,

  color: entityCardTheme.colors.text,

  lineHeight: 1.55,

  fontFamily: "inherit",

  boxSizing: "border-box",
};

export const entityCardCommentToolbarStyle = {
  width: "100%",

  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",

  gap: 12,
};

export const entityCardCommentToolbarLeftStyle = {
  display: "flex",
  alignItems: "center",

  gap: 6,
};

export const entityCardCommentToolbarButtonStyle = {
  width: 28,
  height: 28,
  minWidth: 28,

  border: "1px solid transparent",

  borderRadius: entityCardTheme.radius.sm,

  background: "transparent",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  cursor: "pointer",

  padding: 0,
};

export const entityCardCommentSendButtonStyle = {
  width: 32,
  height: 32,
  minWidth: 32,

  border: "none",

  borderRadius: entityCardTheme.radius.sm,

  background: "#4F46E5",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  cursor: "pointer",

  padding: 0,
};

export const entityCardCommentIconStyle = {
  width: 15,
  height: 15,

  objectFit: "contain",

  flexShrink: 0,
};