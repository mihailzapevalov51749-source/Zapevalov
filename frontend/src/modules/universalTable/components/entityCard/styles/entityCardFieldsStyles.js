import { entityCardTheme } from "./entityCardTheme";

export const entityCardFieldsStyle = {
  width: "100%",

  border: entityCardTheme.section.border,
  borderRadius: entityCardTheme.section.radius,
  background: entityCardTheme.section.background,

  overflow: "hidden",
  boxSizing: "border-box",
  flexShrink: 0,
};

export const entityCardFieldsGridStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  boxSizing: "border-box",
};

export const entityCardFieldCellStyle = {
  minWidth: 0,
  height: 74,

  display: "grid",
  gridTemplateColumns: "38px minmax(0, 1fr)",
  alignItems: "center",
  columnGap: 12,

  padding: "10px 18px",
  boxSizing: "border-box",

  borderRight: `1px solid ${entityCardTheme.colors.borderSoft}`,
  borderBottom: `1px solid ${entityCardTheme.colors.borderSoft}`,
};

export const entityCardFieldCellNoRightBorderStyle = {
  borderRight: "none",
};

export const entityCardFieldCellNoBottomBorderStyle = {
  borderBottom: "none",
};

export const entityCardFieldIconBoxStyle = {
  width: 36,
  height: 36,

  borderRadius: 9,
  background: entityCardTheme.colors.primarySoft,

  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export const entityCardFieldIconStyle = {
  width: 18,
  height: 18,
  objectFit: "contain",
  opacity: 0.9,
};

export const entityCardFieldTextBoxStyle = {
  minWidth: 0,
};

export const entityCardFieldLabelStyle = {
  fontSize: 10,
  lineHeight: 1.2,
  fontWeight: 800,
  color: entityCardTheme.colors.textMuted,
  textTransform: "uppercase",
  marginBottom: 5,
};

export const entityCardFieldValueStyle = {
  fontSize: 14,
  lineHeight: 1.3,
  fontWeight: 700,
  color: entityCardTheme.colors.text,

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};