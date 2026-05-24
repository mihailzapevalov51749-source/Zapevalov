import { entityCardTheme } from "./entityCardTheme";

export const entityCardFieldsStyle = {
  width: "100%",
  border: entityCardTheme.section.border,
  borderRadius: 12,
  background: "#ffffff",
  overflow: "hidden",
  boxSizing: "border-box",
  flexShrink: 0,
};

export const entityCardFieldsGridStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",

  columnGap: 6,
  rowGap: 2,

  padding: "8px 12px",

  boxSizing: "border-box",
};

export const entityCardFieldCellStyle = {
  minWidth: 0,
  minHeight: 48,

  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr)",
  alignItems: "center",

  columnGap: 10,

  padding: "6px 8px",
  boxSizing: "border-box",

  border: "none",
  borderRadius: 8,

  background: "#ffffff",
};

export const entityCardUserFieldCellStyle = {
  gridTemplateColumns: "minmax(0, 1fr)",
  columnGap: 0,
};

export const entityCardFieldCellNoRightBorderStyle = {
  borderRight: "none",
};

export const entityCardFieldCellNoBottomBorderStyle = {
  borderBottom: "none",
};

export const entityCardFieldIconBoxStyle = {
  width: 28,
  height: 28,

  borderRadius: 8,
  background: "#EEF6FF",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  flexShrink: 0,
};

export const entityCardFieldIconStyle = {
  width: 16,
  height: 16,

  objectFit: "contain",
  opacity: 1,

  filter:
    "brightness(0) saturate(100%) invert(39%) sepia(95%) saturate(1964%) hue-rotate(207deg) brightness(101%) contrast(101%)",
};

export const entityCardFieldTextBoxStyle = {
  minWidth: 0,
  maxWidth: "100%",
};

export const entityCardFieldLabelStyle = {
  fontSize: 10,
  lineHeight: 1.1,

  fontWeight: 600,
  letterSpacing: "0.01em",

  color: "#64748B",

  textTransform: "uppercase",

  marginBottom: 4,
};

export const entityCardFieldValueStyle = {
  minWidth: 0,
  maxWidth: "100%",

  fontSize: 13,
  lineHeight: "18px",
  fontWeight: 500,

  color: "#0F172A",

  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const entityCardInlineFieldStyle = {
  width: "100%",

  border: "none",
  padding: 0,
  margin: 0,

  background: "transparent",

  fontSize: 13,
  lineHeight: "18px",
  fontWeight: 500,
  color: "#0F172A",
};

export const entityCardInlineDateFieldStyle = {
  ...entityCardInlineFieldStyle,

  minHeight: 24,

  fontSize: 13,
  lineHeight: "18px",
};

export const entityCardInlineChoiceFieldStyle = {
  ...entityCardInlineFieldStyle,

  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",

  minHeight: 24,
};