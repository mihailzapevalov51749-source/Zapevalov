import { entityCardTheme } from "../entityCardTheme";

export const entityCardCommentsShellStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  background: entityCardTheme.colors.pageBg,
  borderLeft: `1px solid ${entityCardTheme.colors.border}`,
};

export const entityCardCommentsHeaderStyle = {
  flexShrink: 0,
  padding: "16px 16px 12px",
  borderBottom: `1px solid ${entityCardTheme.colors.borderSoft}`,
  fontSize: 13,
  fontWeight: 800,
  letterSpacing: "0.02em",
  color: entityCardTheme.colors.text,
  background: entityCardTheme.colors.pageBg,
};

export const entityCardCommentsBodyStyle = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
  overflowX: "hidden",
  display: "flex",
  flexDirection: "column",
  padding: "10px 12px 14px",
  boxSizing: "border-box",
};
