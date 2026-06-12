import {
  addButtonStyle as utAddButtonStyle,
  bodyStyle,
  closeButtonStyle,
  conditionRowStyle,
  conditionsListStyle,
  conditionsTableHeaderStyle,
  dangerButtonStyle as utDangerButtonStyle,
  filterNameLineStyle,
  footerStyle,
  headerStyle,
  primaryButtonStyle as utPrimaryButtonStyle,
  secondaryButtonStyle as utSecondaryButtonStyle,
  sectionHeaderStyle,
  textBase,
  topLineStyle,
} from "../../../../shared/viewEngine/filterModalStyles";

export {
  bodyStyle,
  closeButtonStyle,
  conditionRowStyle,
  conditionsListStyle,
  conditionsTableHeaderStyle,
  footerStyle,
  headerStyle,
  sectionHeaderStyle,
};

export const nameAndDefaultLineStyle = {
  ...topLineStyle,
  alignItems: "center",
  gap: 10,
};

export const filterNameShortLineStyle = {
  ...filterNameLineStyle,
  flex: "0 0 420px",
  maxWidth: 420,
};

export const checkboxGroupStyle = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  paddingTop: 18,
};

export const checkboxLineStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  fontSize: 14,
  fontWeight: 500,
  color: "#334155",
  cursor: "pointer",
  userSelect: "none",
  whiteSpace: "nowrap",
};

export const checkboxInputStyle = {
  width: 14,
  height: 14,
  margin: 0,
  cursor: "pointer",
  accentColor: "#2563ff",
};

export const titleStyle = {
  ...textBase,
  fontSize: 22,
  fontWeight: 700,
  lineHeight: 1.2,
};

export const subtitleStyle = {
  ...textBase,
  marginTop: 4,
  fontSize: 14,
  fontWeight: 400,
  color: "var(--text-secondary)",
};

export const fieldLabelInlineStyle = {
  ...textBase,
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-secondary)",
};

export const sectionTitleCompactStyle = {
  ...textBase,
  fontSize: 18,
  fontWeight: 700,
  lineHeight: 1.25,
};

export const conditionHeaderTextStyle = {
  ...textBase,
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-secondary)",
};

const controlBase = {
  ...textBase,
  height: 38,
  fontSize: 14,
  borderRadius: 10,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  padding: "0 10px",
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  minWidth: 0,
};

export const quickFilterInputCompactStyle = {
  ...controlBase,
  width: "100%",
};

export const savedFiltersSelectStyle = {
  ...controlBase,
  width: 190,
  fontWeight: 600,
  cursor: "pointer",
};

export const selectStyle = {
  ...controlBase,
};

export const operatorSelectStyle = {
  ...controlBase,
};

export const inputStyle = {
  ...controlBase,
};

export const removeButtonStyle = {
  ...textBase,
  width: 38,
  height: 38,
  borderRadius: 10,
  border: "1px solid #dbe3ef",
  background: "#ffffff",
  color: "#94a3b8",
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  fontWeight: 700,
};

export const addButtonStyle = {
  ...utAddButtonStyle,
  height: 38,
  fontSize: 14,
  fontWeight: 600,
  padding: "0 18px",
  borderRadius: 10,
};

const footerButtonBase = {
  height: 40,
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 10,
};

export const secondaryButtonStyle = {
  ...utSecondaryButtonStyle,
  ...footerButtonBase,
  padding: "0 18px",
};

export const primaryButtonStyle = {
  ...utPrimaryButtonStyle,
  ...footerButtonBase,
  padding: "0 20px",
};

export const dangerButtonStyle = {
  ...utDangerButtonStyle,
  ...footerButtonBase,
  padding: "0 18px",
};
