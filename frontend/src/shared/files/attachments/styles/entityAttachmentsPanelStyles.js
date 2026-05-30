import { entityCardTheme } from "../../../entityCardShell/entityCardTheme";

export const entityAttachmentsPanelStyle = {
  width: "100%",
  border: entityCardTheme.section.border,
  borderRadius: entityCardTheme.section.radius,
  background: entityCardTheme.section.background,
  padding: "10px 14px 18px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  flexShrink: 0,
  marginBottom: 10,
};

export const entityAttachmentsHeaderStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

export const entityAttachmentsTitleStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: entityCardTheme.colors.textMuted,
  lineHeight: 1.2,
  textTransform: "uppercase",
};

export const entityAttachmentsListStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 8,
  maxHeight: "none",
  overflowY: "visible",
  overflowX: "hidden",
  paddingRight: 4,
  boxSizing: "border-box",
};

export const entityAttachmentsMetaStyle = {
  fontSize: 9,
  color: entityCardTheme.colors.textMuted,
  lineHeight: 1.2,
};

export const entityAttachmentsUploadButtonStyle = {
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

export const entityAttachmentsIconStyle = {
  width: 22,
  height: 22,
  objectFit: "contain",
  flexShrink: 0,
};
