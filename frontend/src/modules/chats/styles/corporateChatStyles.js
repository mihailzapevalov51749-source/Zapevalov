import { chatHeaderStyles } from "./chatHeaderStyles";
import { chatModalStyles } from "./chatModalStyles";
import { chatSidebarStyles } from "./chatSidebarStyles";

export const chatLayoutStyles = {
  page: {
    width: "100%",
    height: "100%",
    minHeight: 0,

    display: "grid",
    gridTemplateColumns: "320px minmax(0, 1fr)",

    background: "#F4F7FB",
    overflow: "hidden",
  },

  workspace: {
    height: "100%",
    minHeight: 0,

    display: "flex",
    flexDirection: "column",

    background: "#FFFFFF",
    overflow: "hidden",
  },

  ...chatSidebarStyles,
  ...chatHeaderStyles,
  ...chatModalStyles,

  workspaceBody: {
    flex: 1,
    minHeight: 0,

    display: "flex",
    flexDirection: "column",

    background: "#F5F5F5",
    overflow: "hidden",
  },

  messagesContainer: {
    flex: 1,
    minHeight: 0,

    overflowY: "auto",

    padding: "18px 28px 24px",
    boxSizing: "border-box",

    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  composerContainer: {
    flexShrink: 0,
    minHeight: 0,

    padding: "4px 12px 6px",

    borderTop: "1px solid #E5E7EB",

    background: "#FFFFFF",

    boxSizing: "border-box",
  },

  title: {
    fontSize: 14,
    fontWeight: 700,

    color: "#111827",

    lineHeight: 1.2,
  },

  subtitle: {
    marginTop: 2,

    fontSize: 11,

    color: "#6B7280",

    lineHeight: 1.35,
  },

  empty: {
    flex: 1,

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    color: "#9CA3AF",

    fontSize: 13,
  },
};