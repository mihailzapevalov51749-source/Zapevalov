import { entityCardTheme } from "../entityCardTheme";

export const entityCardHeroHeaderStyle = {
  width: "100%",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 16,
  padding: "18px 20px 14px",
  boxSizing: "border-box",
  background: `linear-gradient(180deg, ${entityCardTheme.colors.pageBg} 0%, ${entityCardTheme.colors.bg} 100%)`,
  borderBottom: `1px solid ${entityCardTheme.colors.borderSoft}`,
  flexShrink: 0,
  minHeight: 0,
};

export const entityCardHeroMainStyle = {
  minWidth: 0,
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

export const entityCardHeroTitleStyle = {
  margin: 0,
  fontSize: entityCardTheme.typography.heroTitleSize,
  fontWeight: entityCardTheme.typography.heroTitleWeight,
  lineHeight: 1.2,
  color: entityCardTheme.colors.text,
  wordBreak: "break-word",
  overflowWrap: "anywhere",
};

export const entityCardHeroTitleFieldWrapStyle = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

export const entityCardHeroContextStripStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 4,
  minWidth: 0,
  fontSize: 12,
  fontWeight: 600,
  color: entityCardTheme.colors.textSoft,
  lineHeight: 1.35,
};

export const entityCardHeroContextSeparatorStyle = {
  margin: "0 6px",
  color: entityCardTheme.colors.textLight,
  userSelect: "none",
};

export const entityCardHeroContextSegmentStyle = {
  border: "none",
  background: "transparent",
  padding: 0,
  margin: 0,
  font: "inherit",
  color: "inherit",
  cursor: "pointer",
  textDecoration: "none",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const entityCardHeroMetaGroupStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

export const entityCardHeroMetaGroupMutedStyle = {
  ...entityCardHeroMetaGroupStyle,
  fontSize: 12,
  color: entityCardTheme.colors.textMuted,
};

export const entityCardHeroMetaRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 500,
  color: entityCardTheme.colors.textSoft,
  lineHeight: 1.35,
};

export const entityCardHeroMetaItemStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
};

export const entityCardHeroMetaDividerStyle = {
  width: 4,
  height: 4,
  borderRadius: "50%",
  background: entityCardTheme.colors.textLight,
  flexShrink: 0,
};

export const entityCardHeroStatusBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 700,
  background: entityCardTheme.colors.primarySoft,
  color: entityCardTheme.colors.primary,
  border: `1px solid ${entityCardTheme.colors.primaryBorder}`,
};

export const entityCardHeroActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  flexShrink: 0,
  paddingTop: 2,
};

export const entityCardHeroSaveButtonStyle = {
  height: 36,
  padding: "0 16px",
  border: "none",
  borderRadius: entityCardTheme.radius.sm,
  background: entityCardTheme.colors.primary,
  color: "#fff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.24)",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

export const entityCardHeroUnsavedDotStyle = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "#f59e0b",
  flexShrink: 0,
  boxShadow: "0 0 0 2px rgba(245, 158, 11, 0.35)",
};

export const entityCardHeroSaveButtonDisabledStyle = {
  ...entityCardHeroSaveButtonStyle,
  opacity: 0.55,
  cursor: "not-allowed",
  boxShadow: "none",
};

export const entityCardHeroSettingsButtonStyle = {
  width: 36,
  height: 36,
  border: `1px solid ${entityCardTheme.colors.border}`,
  borderRadius: entityCardTheme.radius.sm,
  background: entityCardTheme.colors.bg,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  color: entityCardTheme.colors.textMuted,
  fontSize: 16,
  lineHeight: 1,
};

export const entityCardHeroCloseButtonStyle = {
  width: 34,
  height: 34,
  border: "none",
  borderRadius: entityCardTheme.radius.sm,
  background: "transparent",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  padding: 0,
  color: entityCardTheme.colors.textLight,
  fontSize: 24,
  lineHeight: 1,
};

export const entityCardHeroErrorStyle = {
  margin: 0,
  fontSize: 13,
  fontWeight: 600,
  color: "#dc2626",
};

export const entityCardSystemInfoToggleStyle = {
  border: "none",
  background: "transparent",
  padding: 0,
  margin: 0,
  fontSize: 12,
  fontWeight: 600,
  color: entityCardTheme.colors.textMuted,
  cursor: "pointer",
  textAlign: "left",
};

export const entityCardSystemInfoPanelStyle = {
  marginTop: 8,
  padding: "10px 12px",
  borderRadius: entityCardTheme.radius.md,
  border: `1px solid ${entityCardTheme.colors.borderSoft}`,
  background: entityCardTheme.colors.pageBg,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

export const entityCardSystemInfoRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(88px, 110px) 1fr",
  gap: 8,
  alignItems: "start",
  fontSize: 12,
  lineHeight: 1.4,
};

export const entityCardSystemInfoRowLabelStyle = {
  color: entityCardTheme.colors.textMuted,
  fontWeight: 600,
};

export const entityCardSystemInfoRowValueStyle = {
  color: entityCardTheme.colors.textSoft,
  fontWeight: 500,
  wordBreak: "break-all",
};
