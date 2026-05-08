import { entityCardTheme } from "./entityCardTheme";

export const entityCardAttachmentsStyle = {
  width: "100%",

  border: entityCardTheme.section.border,
  borderRadius: entityCardTheme.section.radius,

  background: entityCardTheme.section.background,

  padding: "10px 14px",

  boxSizing: "border-box",

  display: "flex",
  flexDirection: "column",

  gap: 8,

  flexShrink: 0,
};

export const entityCardAttachmentsHeaderStyle = {
  width: "100%",

  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",

  gap: 12,
};

export const entityCardAttachmentsTitleStyle = {
  fontSize: 10,
  fontWeight: 800,

  color: entityCardTheme.colors.textMuted,

  lineHeight: 1.2,

  textTransform: "uppercase",
};

export const entityCardAttachmentsListStyle = {
  width: "100%",

  display: "flex",
  alignItems: "center",

  gap: 10,

  overflow: "hidden",

  paddingBottom: 2,

  boxSizing: "border-box",
};

export const entityCardAttachmentCardStyle = {
  width: 152,
  minWidth: 152,

  height: 42,

  border: `1px solid ${entityCardTheme.colors.borderSoft}`,

  borderRadius: entityCardTheme.radius.sm,

  background: entityCardTheme.colors.bg,

  padding: "6px 8px",

  boxSizing: "border-box",

  display: "flex",
  alignItems: "center",

  gap: 8,

  cursor: "pointer",

  flexShrink: 0,
};

export const entityCardAttachmentLeftStyle = {
  display: "flex",
  alignItems: "center",

  gap: 8,

  minWidth: 0,
  flex: 1,
};

export const entityCardAttachmentIconStyle = {
  width: 22,
  height: 22,

  objectFit: "contain",

  flexShrink: 0,
};

export const entityCardAttachmentInfoStyle = {
  display: "flex",
  flexDirection: "column",

  gap: 2,

  minWidth: 0,
};

export const entityCardAttachmentNameStyle = {
  fontSize: 10,
  fontWeight: 700,

  color: entityCardTheme.colors.text,

  lineHeight: 1.2,

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const entityCardAttachmentMetaStyle = {
  fontSize: 9,

  color: entityCardTheme.colors.textMuted,

  lineHeight: 1.2,
};

export const entityCardUploadButtonStyle = {
  width: 112,
  minWidth: 112,

  height: 30,

  borderRadius: entityCardTheme.radius.sm,

  border: `1px dashed ${entityCardTheme.colors.primaryBorder}`,

  background: entityCardTheme.colors.bg,

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  gap: 6,

  cursor: "pointer",

  fontSize: 10,
  fontWeight: 700,

  color: entityCardTheme.colors.primary,

  flexShrink: 0,
};