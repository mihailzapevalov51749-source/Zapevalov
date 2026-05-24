export const universalViewsBarStyles = {
  wrapper: {
    height: 38,
    padding: "0 20px",

    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",

    gap: 20,

    background: "transparent",

    position: "relative",

    boxSizing: "border-box",
  },

  tabs: {
    minWidth: 0,
    height: "100%",

    display: "flex",
    alignItems: "center",

    gap: 26,

    overflowX: "auto",
    overflowY: "hidden",
  },

  tab: {
    height: "100%",

    padding: "0",

    display: "inline-flex",
    alignItems: "center",

    border: "none",
    borderBottom: "2px solid transparent",

    borderRadius: 0,

    background: "transparent",

    color: "#475569",

    fontSize: 13,
    fontWeight: 600,

    cursor: "grab",

    whiteSpace: "nowrap",

    outline: "none",
    boxShadow: "none",

    appearance: "none",

    transform: "translateY(-2px)",

    transition:
      "color 0.15s ease, border-color 0.15s ease, opacity 0.15s ease",

    userSelect: "none",
  },

  tabActive: {
    color: "#2563EB",
    borderBottom: "2px solid #2563EB",
  },

  tabDragging: {
    opacity: 0.35,
    cursor: "grabbing",
  },

  tabName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    userSelect: "none",
  },

  empty: {
    height: "100%",

    display: "flex",
    alignItems: "center",

    fontSize: 13,

    color: "#94A3B8",
  },

  createWrapper: {
    position: "relative",

    flexShrink: 0,

    height: "100%",

    display: "flex",
    alignItems: "center",

    gap: 10,

    paddingTop: 0,
  },

  manageButton: {
    width: 32,
    height: 32,

    border: "1px solid #D7DFEA",
    borderRadius: 10,

    background: "#FFFFFF",

    color: "#475569",

    fontSize: 18,
    fontWeight: 700,

    cursor: "pointer",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  createButton: {
    height: 28,

    padding: 0,

    border: "none",
    borderRadius: 0,

    background: "transparent",

    color: "#2563EB",

    fontSize: 13,
    fontWeight: 700,

    cursor: "pointer",

    whiteSpace: "nowrap",

    outline: "none",
    boxShadow: "none",

    appearance: "none",

    transform: "translateY(-2px)",
  },

  overlay: {
    position: "fixed",
    inset: 0,

    zIndex: 999998,

    background: "transparent",
  },

  popover: {
    position: "fixed",

    zIndex: 999999,

    width: 300,

    padding: 14,

    border: "1px solid #E5E7EB",
    borderRadius: 12,

    background: "#FFFFFF",

    boxShadow: "0 18px 40px rgba(15, 23, 42, 0.16)",
  },

  popoverTitle: {
    marginBottom: 12,

    fontSize: 15,
    fontWeight: 800,

    color: "#111827",
  },

  label: {
    display: "block",

    marginBottom: 6,
    marginTop: 10,

    fontSize: 12,
    fontWeight: 700,

    color: "#334155",
  },

  input: {
    width: "100%",
    height: 34,

    padding: "0 10px",

    border: "1px solid #CBD5E1",
    borderRadius: 8,

    fontSize: 13,

    outline: "none",

    boxSizing: "border-box",
  },

  select: {
    width: "100%",
    height: 34,

    padding: "0 10px",

    border: "1px solid #CBD5E1",
    borderRadius: 8,

    fontSize: 13,

    outline: "none",

    boxSizing: "border-box",

    background: "#FFFFFF",
  },

  actions: {
    marginTop: 14,

    display: "flex",
    justifyContent: "flex-end",

    gap: 8,
  },

  cancelButton: {
    height: 32,

    padding: "0 12px",

    border: "1px solid #CBD5E1",
    borderRadius: 8,

    background: "#FFFFFF",

    color: "#334155",

    fontSize: 13,
    fontWeight: 700,

    cursor: "pointer",
  },

  saveButton: {
    height: 32,

    padding: "0 12px",

    border: "1px solid #2563EB",
    borderRadius: 8,

    background: "#2563EB",

    color: "#FFFFFF",

    fontSize: 13,
    fontWeight: 700,

    cursor: "pointer",
  },
};