export const entityCardSubtasksStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
};

export const entityCardSubtasksEmptyStyle = {
  width: "100%",
  padding: "18px 4px",
  boxSizing: "border-box",

  fontSize: 13,
  fontWeight: 500,
  lineHeight: 1.4,
  color: "#64748B",
};

export const entityCardSubtasksListStyle = {
  width: "100%",
  display: "flex",
  flexDirection: "column",
};

export function getEntityCardRelatedRowStyle(gridTemplateColumns) {
  return {
    width: "100%",
    minHeight: 54,
    padding: "9px 6px",
    boxSizing: "border-box",

    display: "grid",
    gridTemplateColumns:
      gridTemplateColumns ||
      "minmax(150px, 1fr) 86px 96px minmax(110px, 140px)",
    alignItems: "center",
    gap: 10,

    background: "transparent",
    border: "none",
    borderBottom: "1px solid #EEF2F7",

    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.16s ease",
  };
}

export const entityCardSubtaskRowStyle =
  getEntityCardRelatedRowStyle();

export const entityCardSubtaskTitleStyle = {
  minWidth: 0,

  fontSize: 13,
  fontWeight: 700,
  lineHeight: 1.3,
  color: "#0F172A",

  whiteSpace: "normal",
  overflow: "hidden",
  overflowWrap: "anywhere",
  wordBreak: "break-word",
};

export const entityCardSubtaskMetaItemStyle = {
  minWidth: 0,

  fontSize: 12,
  fontWeight: 500,
  color: "#64748B",

  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const entityCardSubtaskStatusStyle = {
  width: "fit-content",
  maxWidth: 96,
  padding: "4px 8px",
  boxSizing: "border-box",

  borderRadius: 999,
  background: "#EEF2FF",

  color: "#1D4ED8",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.2,

  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export const entityCardSubtaskAssigneeStyle = {
  minWidth: 0,

  display: "flex",
  alignItems: "center",
  gap: 7,

  overflow: "hidden",
};

export const entityCardSubtaskAvatarStyle = {
  width: 24,
  height: 24,
  minWidth: 24,

  borderRadius: "50%",
  overflow: "hidden",

  background: "#E2E8F0",
  color: "#0F172A",

  display: "flex",
  alignItems: "center",
  justifyContent: "center",

  fontSize: 10,
  fontWeight: 800,
  lineHeight: 1,

  flexShrink: 0,
};

export const entityCardSubtaskAvatarImageStyle = {
  width: "100%",
  height: "100%",

  objectFit: "contain",
  display: "block",

  userSelect: "none",
  pointerEvents: "none",

  transformOrigin: "center center",
};

export const entityCardSubtaskAssigneeNameStyle = {
  minWidth: 0,

  fontSize: 12,
  fontWeight: 500,
  color: "#334155",

  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
