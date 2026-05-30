import { entityCardTheme } from "../entityCardTheme";

export const entityCardSectionStyle = {
  width: "100%",
  border: entityCardTheme.section.border,
  borderRadius: 12,
  background: "#ffffff",
  overflow: "hidden",
  boxSizing: "border-box",
  flexShrink: 0,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

export const entityCardSectionPrimaryStyle = {
  ...entityCardSectionStyle,
  borderColor: entityCardTheme.colors.primaryBorder,
};

export const entityCardSectionTitleStyle = {
  margin: 0,
  padding: "12px 16px",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.03em",
  color: entityCardTheme.colors.text,
  borderBottom: `1px solid ${entityCardTheme.colors.borderSoft}`,
  background: entityCardTheme.colors.bg,
};

export const entityCardSectionTitleMutedStyle = {
  ...entityCardSectionTitleStyle,
  fontSize: 11,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: entityCardTheme.colors.textMuted,
  background: entityCardTheme.colors.pageBg,
};

export const entityCardFieldsStackStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: "14px 16px 16px",
  boxSizing: "border-box",
};

export const entityCardEmptyStateStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "40px 20px",
  textAlign: "center",
  boxSizing: "border-box",
};

export const entityCardEmptyStateTitleStyle = {
  margin: 0,
  fontSize: 15,
  fontWeight: 700,
  color: entityCardTheme.colors.text,
};

export const entityCardEmptyStateTextStyle = {
  margin: 0,
  maxWidth: 320,
  fontSize: 13,
  lineHeight: 1.45,
  color: entityCardTheme.colors.textMuted,
};

export const entityCardFieldRowStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
};

export const entityCardFieldLabelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: entityCardTheme.colors.textSoft,
};

export const entityCardSystemGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
  padding: "12px 14px 14px",
  boxSizing: "border-box",
};

export const entityCardSystemCellStyle = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

export const entityCardSystemValueStyle = {
  fontSize: 13,
  fontWeight: 500,
  color: entityCardTheme.colors.text,
  wordBreak: "break-word",
};

export const entityCardFooterStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 8,
  padding: "12px 14px 16px",
  borderTop: `1px solid ${entityCardTheme.colors.borderSoft}`,
  background: entityCardTheme.colors.bg,
  flexShrink: 0,
  position: "sticky",
  bottom: 0,
  zIndex: 5,
  boxShadow: "0 -4px 12px rgba(15, 23, 42, 0.06)",
};
