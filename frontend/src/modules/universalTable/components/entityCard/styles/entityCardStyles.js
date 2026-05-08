import { entityCardTheme } from "./entityCardTheme";

export const entityCardViewStyle = {
  position: "fixed",
  inset: 0,

  width: "100vw",
  height: "100vh",

  background: entityCardTheme.colors.bg,

  zIndex: 9999,

  display: "flex",
  flexDirection: "column",

  overflow: "hidden",
};

export const entityCardSectionStyle = {
  width: "100%",

  display: "flex",
  flexDirection: "column",

  gap: entityCardTheme.spacing.md,

  marginBottom: 0,
};

export const entityCardBlockStyle = {
  width: "100%",

  background: entityCardTheme.section.background,

  border: entityCardTheme.section.border,

  borderRadius: entityCardTheme.section.radius,

  padding: entityCardTheme.spacing.lg,

  boxSizing: "border-box",
};

export const entityCardTitleStyle = {
  fontSize: entityCardTheme.typography.labelSize,

  fontWeight: entityCardTheme.typography.labelWeight,

  color: entityCardTheme.colors.textMuted,

  textTransform: "uppercase",

  letterSpacing: "0.02em",

  marginBottom: entityCardTheme.spacing.sm,
};

export const entityCardMutedTextStyle = {
  fontSize: 13,

  color: entityCardTheme.colors.textMuted,

  lineHeight: 1.5,
};

export const entityCardDividerStyle = {
  width: "100%",
  height: 1,

  background: entityCardTheme.colors.borderSoft,

  margin: "4px 0",
};

export const entityCardScrollableStyle = {
  overflowY: "auto",
  overflowX: "hidden",

  minHeight: 0,
};

export const entityCardRowStyle = {
  display: "flex",
  alignItems: "center",

  gap: entityCardTheme.spacing.md,
};

export const entityCardColumnStyle = {
  display: "flex",
  flexDirection: "column",

  gap: entityCardTheme.spacing.md,
};

export const entityCardIconButtonStyle = {
  width: 32,
  height: 32,
  minWidth: 32,

  border: "1px solid transparent",

  borderRadius: entityCardTheme.radius.sm,

  background: "transparent",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  cursor: "pointer",

  transition: "all 0.15s ease",
};

export const entityCardIconStyle = {
  width: 18,
  height: 18,

  objectFit: "contain",

  opacity: 0.85,
};

export const entityCardInputStyle = {
  width: "100%",

  height: 38,

  border: `1px solid ${entityCardTheme.colors.border}`,

  borderRadius: entityCardTheme.radius.sm,

  padding: "0 12px",

  fontSize: 14,

  outline: "none",

  background: entityCardTheme.colors.bg,

  color: entityCardTheme.colors.text,

  boxSizing: "border-box",
};

export const entityCardTextareaStyle = {
  width: "100%",

  minHeight: 120,

  border: `1px solid ${entityCardTheme.colors.border}`,

  borderRadius: entityCardTheme.radius.sm,

  padding: "12px 14px",

  fontSize: 14,

  outline: "none",

  resize: "vertical",

  background: entityCardTheme.colors.bg,

  color: entityCardTheme.colors.text,

  lineHeight: 1.55,

  boxSizing: "border-box",
};

export const entityCardTabButtonStyle = {
  height: 56,

  padding: "0",

  border: "none",

  borderBottom: "2px solid transparent",

  background: "transparent",

  display: "inline-flex",
  alignItems: "center",

  gap: 8,

  cursor: "pointer",

  fontSize: 13,
  fontWeight: 600,

  color: entityCardTheme.colors.textMuted,

  transition: "all 0.15s ease",

  whiteSpace: "nowrap",
};

export const entityCardActiveTabButtonStyle = {
  color: entityCardTheme.colors.primary,

  borderBottom: `2px solid ${entityCardTheme.colors.primary}`,
};

export const entityCardBadgeStyle = {
  height: 24,

  padding: "0 10px",

  borderRadius: 999,

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  fontSize: 11,
  fontWeight: 700,

  background: entityCardTheme.colors.primarySoft,

  color: entityCardTheme.colors.primary,
};

export const entityCardShadowStyle = {
  boxShadow:
    "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.08)",
};