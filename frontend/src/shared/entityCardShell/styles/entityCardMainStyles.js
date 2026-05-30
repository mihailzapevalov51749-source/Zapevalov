import { entityCardTheme } from "../entityCardTheme";

export const entityCardMainStyle = {
  minHeight: 104,

  border: entityCardTheme.section.border,
  borderRadius: 10,

  background: entityCardTheme.section.background,

  padding: "12px 16px",
  boxSizing: "border-box",

  display: "grid",
  gridTemplateColumns: "38px minmax(0, 1fr) auto",
  gap: 12,

  alignItems: "flex-start",

  flexShrink: 0,
};

export const entityCardMainIconBoxStyle = {
  width: 38,
  height: 38,

  borderRadius: 10,

  background: entityCardTheme.colors.primarySoft,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  flexShrink: 0,
};

export const entityCardMainIconStyle = {
  width: 18,
  height: 18,
  objectFit: "contain",
  opacity: 0.82,
};

export const entityCardMainContentStyle = {
  minWidth: 0,
};

export const entityCardMainLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.02em",

  color: "#2563EB",

  textTransform: "uppercase",

  marginBottom: 4,
  lineHeight: 1.2,
};

export const entityCardMainTitleStyle = {
  fontSize: 13,
  lineHeight: 1.35,
  fontWeight: 700,

  color: "#0F172A",

  marginBottom: 10,

  maxWidth: 720,

  textTransform: "uppercase",
};

export const entityCardMainDescriptionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.02em",

  color: "#2563EB",

  textTransform: "uppercase",

  marginBottom: 4,
  lineHeight: 1.2,
};

export const entityCardMainDescriptionStyle = {
  fontSize: 13,
  lineHeight: 1.45,

  color: "#64748B",

  maxWidth: 760,
};

export const entityCardMainEmptyDescriptionStyle = {
  fontSize: 13,
  lineHeight: 1.45,

  color: "#94A3B8",

  maxWidth: 760,
};

export const entityCardMainFinishButtonStyle = {
  height: 34,
  minWidth: 96,

  padding: "0 16px",

  border: "none",
  borderRadius: 12,

  background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",

  color: "#FFFFFF",

  fontSize: 14,
  fontWeight: 600,

  cursor: "pointer",

  whiteSpace: "nowrap",

  boxShadow: "0 4px 14px rgba(34, 197, 94, 0.22)",

  marginTop: 0,
};
