import { entityCardTheme } from "./entityCardTheme";

export const entityCardMainStyle = {
  minHeight: 148,

  border: entityCardTheme.section.border,
  borderRadius: entityCardTheme.section.radius,

  background: entityCardTheme.section.background,

  padding: "18px 20px",
  boxSizing: "border-box",

  display: "grid",
  gridTemplateColumns: "52px minmax(0, 1fr) auto",
  gap: 18,

  alignItems: "flex-start",

  flexShrink: 0,
};

export const entityCardMainIconBoxStyle = {
  width: 52,
  height: 52,

  borderRadius: entityCardTheme.radius.md,

  background: entityCardTheme.colors.primarySoft,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  flexShrink: 0,
};

export const entityCardMainIconStyle = {
  width: 28,
  height: 28,
  objectFit: "contain",
};

export const entityCardMainContentStyle = {
  minWidth: 0,
};

export const entityCardMainLabelStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: entityCardTheme.colors.primary,

  textTransform: "uppercase",

  marginBottom: 8,
  lineHeight: 1.2,
};

export const entityCardMainTitleStyle = {
  fontSize: 22,
  lineHeight: 1.25,
  fontWeight: 800,
  color: entityCardTheme.colors.text,

  marginBottom: 16,

  maxWidth: 720,
};

export const entityCardMainDescriptionLabelStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: entityCardTheme.colors.primary,

  textTransform: "uppercase",

  marginBottom: 6,
  lineHeight: 1.2,
};

export const entityCardMainDescriptionStyle = {
  fontSize: 12,
  lineHeight: 1.55,

  color: entityCardTheme.colors.textSoft,

  maxWidth: 760,
};

export const entityCardMainEmptyDescriptionStyle = {
  fontSize: 12,
  lineHeight: 1.55,

  color: entityCardTheme.colors.textLight,

  maxWidth: 760,
};

export const entityCardMainStatusButtonStyle = {
  height: 38,
  minWidth: 112,

  padding: "0 16px",

  border: "none",
  borderRadius: entityCardTheme.radius.sm,

  background: entityCardTheme.colors.success,

  color: "#FFFFFF",

  fontSize: 13,
  fontWeight: 700,

  cursor: "pointer",

  whiteSpace: "nowrap",

  boxShadow: `0 8px 18px ${entityCardTheme.colors.successShadow}`,

  marginTop: 8,
};