export const page = {
  padding: "24px 32px 24px",
  maxWidth: 1280,
  height: "calc(100vh - 72px)",
  margin: "0 auto",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

export const documentsScrollArea = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "hidden",
  paddingRight: 4,
};

export const workspaceSplit = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  gap: 16,
  overflow: "hidden",
};

export const workspaceListPane = {
  flex: "0 0 380px",
  minWidth: 280,
  maxWidth: "42%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

export const workspaceListPaneFull = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

export const workspaceViewerPanel = {
  flex: 1,
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#ffffff",
  overflow: "hidden",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
};

export const workspaceViewerHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "10px 14px",
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
  flexShrink: 0,
};

export const workspaceViewerTitle = {
  fontSize: 14,
  fontWeight: 700,
  color: "#0f172a",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

export const workspaceViewerClose = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  fontSize: 22,
  lineHeight: 1,
  cursor: "pointer",
  padding: "0 4px",
};

export const workspaceViewerBody = {
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  background: "#ffffff",
};

export const header = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "flex-start",
  marginBottom: 18,
};

export const headerTitleRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 8,
};

export const headerBackButton = {
  border: "none",
  background: "transparent",
  fontSize: 20,
  fontWeight: 700,
  cursor: "pointer",
  padding: "2px 6px",
  lineHeight: 1,
};

export const titleStyle = {
  margin: 0,
  fontSize: 28,
  fontWeight: 800,
  color: "#0f172a",
};

export const breadcrumbs = {
  marginTop: 6,
  fontSize: 13,
  color: "#64748b",
};

export const breadcrumbLink = {
  cursor: "pointer",
  color: "#0284c7",
  fontWeight: 600,
};

export const folderBadge = {
  display: "none",
};

export const toolbar = {
  padding: 10,
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#ffffff",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 16,
  boxSizing: "border-box",
};

export const leftActions = {
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

export const rightActions = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

export const newDocumentGroup = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 6,
  width: 275,
  alignItems: "stretch",
};

export const newDocumentInput = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

export const selectStyle = {
  width: "100%",
  height: 34,
  padding: "0 8px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#ffffff",
  fontSize: 13,
  boxSizing: "border-box",
};

export const primaryButton = {
  height: 34,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const secondaryButton = {
  height: 34,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const ghostButton = {
  height: 34,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid transparent",
  background: "transparent",
  color: "#475569",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const dangerButton = {
  height: 34,
  padding: "0 12px",
  borderRadius: 8,
  border: "1px solid #dc2626",
  background: "#dc2626",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

export const searchInput = {
  width: 240,
  height: 34,
  padding: "0 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

export const viewButton = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: 13,
};

export const viewButtonActive = {
  ...viewButton,
  background: "#e0f2fe",
  border: "1px solid #bae6fd",
  color: "#0284c7",
};

export const tableShell = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#ffffff",
  overflow: "visible",
  boxShadow: "0 8px 18px rgba(15, 23, 42, 0.03)",
};

export const tableHeader = {
  display: "grid",
  gridTemplateColumns: "44px 1fr 200px 140px 110px 100px",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
  background: "#f8fafc",
};

export const tableRow = {
  display: "grid",
  gridTemplateColumns: "44px 1fr 200px 140px 110px 100px",
  alignItems: "center",
  padding: "11px 16px",
  borderBottom: "1px solid #f1f5f9",
  minHeight: 52,
  position: "relative",
  fontSize: 13,
  color: "#0f172a",
  transition: "background 0.15s ease",
};

export const tableRowHover = {
  background: "#f8fafc",
};

export const checkboxCell = {
  display: "flex",
  alignItems: "center",
};

export const nameCell = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
  color: "#0f172a",
  textDecoration: "none",
};

export const folderNameCell = {
  ...nameCell,
  width: "100%",
  border: "none",
  background: "transparent",
  padding: 0,
  textAlign: "left",
  cursor: "pointer",
  font: "inherit",
};

export const fileIcon = {
  width: 26,
  height: 26,
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 9,
  fontWeight: 800,
  flexShrink: 0,
};

export const fileName = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: 650,
};

export const mutedText = {
  color: "#64748b",
};

export const actionsCell = {
  position: "relative",
  display: "flex",
  justifyContent: "flex-end",
};

export const dotsButton = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: 20,
  color: "#475569",
  transition: "background 0.15s",
};

export const dotsButtonHover = {
  background: "#f1f5f9",
};

export const menu = {
  position: "absolute",
  right: 0,
  top: 36,
  width: 160,
  padding: 7,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#ffffff",
  boxShadow: "0 14px 32px rgba(15, 23, 42, 0.15)",
  zIndex: 30,
  display: "grid",
  gap: 4,
};

export const menuItem = {
  padding: "8px 9px",
  borderRadius: 8,
  color: "#0f172a",
  textDecoration: "none",
  fontSize: 13,
};

export const menuButton = {
  padding: "8px 9px",
  borderRadius: 8,
  border: "none",
  background: "transparent",
  color: "#0f172a",
  textAlign: "left",
  fontSize: 13,
  cursor: "pointer",
};

export const errorBox = {
  marginBottom: 12,
  padding: "9px 11px",
  borderRadius: 9,
  background: "#fee2e2",
  color: "#991b1b",
  fontSize: 13,
};

export const emptyState = {
  padding: 24,
  color: "#64748b",
  fontSize: 13,
  textAlign: "center",
};

export const pagination = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  marginTop: 16,
  flexShrink: 0,
};

export const pageButton = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
};

export const pageInfo = {
  fontSize: 13,
  color: "#475569",
  fontWeight: 600,
};

export const gridShell = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
  gap: 14,
};

export const gridCard = {
  position: "relative",
  minHeight: 165,
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  cursor: "pointer",
  boxSizing: "border-box",
  transition: "box-shadow 0.15s ease, transform 0.15s ease",
};

export const gridCardSelected = {
  border: "1px solid #0ea5e9",
  background: "#f0f9ff",
};

export const gridCardTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 14,
};

export const gridCardActions = {
  position: "relative",
};

export const gridCardIcon = {
  width: 48,
  height: 48,
  borderRadius: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 800,
  marginBottom: 12,
};

export const gridCardTitle = {
  fontSize: 13,
  fontWeight: 700,
  color: "#0f172a",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  marginBottom: 7,
};

export const gridCardMeta = {
  fontSize: 11,
  color: "#64748b",
  lineHeight: 1.4,
};