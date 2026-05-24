export const styles = {
  page: {
    minHeight: "100%",
    background: "#f8fafc",
    boxSizing: "border-box",
  },

   header: {
  width: "100%",

  display: "flex",
  justifyContent: "flex-start",
  alignItems: "center",

  background: "transparent",
  border: "none",
  boxShadow: "none",

  padding: "0",
  marginBottom: 12,
},

  headerActions: {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 8,
},

  headerIconButton: {
    width: 36,
    height: 36,

    padding: 0,

    borderRadius: 10,
    border: "1px solid #CBD5E1",

    background: "#FFFFFF",

    cursor: "pointer",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    flexShrink: 0,

    transition:
      "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
  },

  headerIcon: {
    width: 16,
    height: 16,
    objectFit: "contain",
    display: "block",
    pointerEvents: "none",
  },

  workspace: {
    display: "grid",
    gridTemplateColumns: "minmax(620px, 1fr) minmax(430px, 500px)",
    gap: 18,
    alignItems: "start",
  },

  listPanel: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
    minWidth: 0,
  },

  toolbar: {
    padding: 12,
    borderBottom: "1px solid #e2e8f0",
  },

  searchInput: {
    width: "100%",
    height: 44,

    border: "1px solid #CBD5E1",
    borderRadius: 12,

    padding: "0 14px",

    fontSize: 14,

    boxSizing: "border-box",

    outline: "none",

    background: "#FFFFFF",
  },

  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.5fr 120px 110px 1fr",
    gap: 10,

    padding: "12px 16px",

    background: "#f8fafc",

    color: "#64748b",

    fontSize: 12,
    fontWeight: 700,

    borderBottom: "1px solid #e2e8f0",
  },

  userList: {
    display: "flex",
    flexDirection: "column",
  },

  userRow: {
    display: "grid",
    gridTemplateColumns: "1.5fr 120px 110px 1fr",
    gap: 10,

    alignItems: "center",

    padding: "14px 16px",

    borderBottom: "1px solid #f1f5f9",

    background: "#ffffff",

    cursor: "pointer",

    textAlign: "left",

    transition: "background 140ms ease",
  },

  userRowActive: {
    background: "#eff6ff",
  },

  userCell: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },

  userName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  userEmail: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748b",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  mutedText: {
    fontSize: 13,
    color: "#64748b",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  avatar: {
    borderRadius: "50%",
    background: "#e0f2fe",
    color: "#0369a1",

    display: "flex",
    alignItems: "center",
    justifyContent: "center",

    fontWeight: 900,

    overflow: "hidden",

    border: "1px solid #bae6fd",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },

  roleBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",

    padding: "6px 10px",

    borderRadius: 999,

    background: "#eef2ff",
    color: "#3730a3",

    fontSize: 12,
    fontWeight: 700,
  },

  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",

    padding: "4px 8px",

    borderRadius: 999,

    fontSize: 12,
    fontWeight: 700,
  },

  statusActive: {
    background: "#dcfce7",
    color: "#166534",
  },

  statusInactive: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  editorPanel: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.05)",
    minWidth: 0,
  },

  field: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    minWidth: 0,
  },

  label: {
    fontSize: 12,
    fontWeight: 700,
    color: "#475569",
  },

  input: {
    width: "100%",
    minWidth: 0,
    height: 36,

    border: "1px solid #cbd5e1",
    borderRadius: 10,

    padding: "0 10px",

    fontSize: 14,

    boxSizing: "border-box",

    background: "#ffffff",
    color: "#0f172a",

    outline: "none",
  },

  inputDisabled: {
    background: "#f8fafc",
    color: "#64748b",
  },

  roleDescription: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    background: "#f8fafc",
    color: "#64748b",
    fontSize: 13,
    lineHeight: 1.4,
  },

  actions: {
    display: "flex",
    gap: 10,
    marginTop: 12,
  },

  primaryButton: {
    height: 38,

    padding: "0 16px",

    border: "1px solid #0ea5e9",
    borderRadius: 10,

    background: "#0ea5e9",
    color: "#ffffff",

    fontWeight: 700,

    cursor: "pointer",
  },

  secondaryButton: {
    height: 36,

    padding: "0 14px",

    border: "1px solid #cbd5e1",
    borderRadius: 10,

    background: "#ffffff",
    color: "#0f172a",

    fontSize: 13,
    fontWeight: 700,

    cursor: "pointer",
  },

  errorBox: {
    marginBottom: 14,

    padding: 10,

    borderRadius: 12,

    border: "1px solid #fecaca",

    background: "#fef2f2",
    color: "#991b1b",

    fontSize: 14,
  },

  emptyState: {
    padding: 20,
    color: "#64748b",
    fontSize: 14,
  },

  emptyEditor: {
    padding: 20,
    borderRadius: 14,
    background: "#f8fafc",
    textAlign: "center",
  },

  emptyEditorTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
  },

  emptyEditorText: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748b",
  },
};