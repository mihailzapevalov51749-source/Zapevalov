export const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 2000,
    background: "rgba(15, 23, 42, 0.28)",
    display: "flex",
    justifyContent: "flex-end",
    fontFamily:
      "Inter, Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },

  panel: {
    width: 880,
    maxWidth: "94vw",
    height: "100vh",
    background: "#f8fafc",
    padding: 14,
    boxSizing: "border-box",
    overflowY: "auto",
    boxShadow: "-12px 0 36px rgba(15, 23, 42, 0.14)",
  },

  headerCard: {
    minHeight: 68,
    background: "#ffffff",
    border: "1px solid #edf2f7",
    borderRadius: 12,
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
    padding: "12px 16px",
    boxSizing: "border-box",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  title: {
    margin: 0,
    fontSize: 18,
    lineHeight: 1.2,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },

  subtitle: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: 400,
    color: "#64748b",
  },

  headerActions: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },

  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 9,
    border: "1px solid #dbe4ef",
    background: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 9,
    border: "1px solid #dbe4ef",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: 22,
    fontWeight: 400,
    lineHeight: 1,
    color: "#0f172a",
  },

  actionIcon: {
    width: 19,
    height: 19,
    objectFit: "contain",
  },

  contentGrid: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: 14,
    alignItems: "start",
  },

  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  avatarCard: {
    background: "#ffffff",
    border: "1px solid #edf2f7",
    borderRadius: 12,
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.035)",
    padding: 14,
    minHeight: 220,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarCircle: {
    width: 132,
    height: 132,
    borderRadius: "50%",
    background: "#dbeafe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
    flex: "0 0 auto",
    touchAction: "none",
  },

  avatarViewport: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    overflow: "hidden",
    position: "relative",
    background: "#dbeafe",
  },

  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    borderRadius: 0,
    userSelect: "none",
    pointerEvents: "none",
  },

  avatarLetter: {
    fontSize: 54,
    fontWeight: 700,
    color: "#1d4ed8",
    letterSpacing: "-0.03em",
  },

  avatarOnlineDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#16a34a",
    border: "3px solid #ffffff",
    zIndex: 2,
    boxSizing: "border-box",
  },

  avatarEditableHint: {
    marginTop: 8,
    maxWidth: 210,
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 1.3,
  },

  avatarResetButton: {
    height: 26,
    marginTop: 8,
    padding: "0 10px",
    borderRadius: 7,
    border: "1px solid #dbe4ef",
    background: "#ffffff",
    color: "#334155",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },

  onlineRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    color: "#15803d",
    fontSize: 13,
    fontWeight: 500,
  },

  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: "#16a34a",
    display: "inline-block",
    flex: "0 0 auto",
  },

  avatarActionsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },

  uploadButton: {
    height: 30,
    padding: "0 14px",
    borderRadius: 7,
    border: "1px solid #2563eb",
    background: "#ffffff",
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },

  deleteAvatarIconButton: {
    width: 30,
    height: 30,
    borderRadius: 7,
    border: "1px solid #dbe4ef",
    background: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },

  deleteAvatarIcon: {
    width: 16,
    height: 16,
    objectFit: "contain",
  },

  accountCard: {
    background: "#ffffff",
    border: "1px solid #edf2f7",
    borderRadius: 12,
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.035)",
    padding: 14,
    boxSizing: "border-box",
  },

  accountTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
    textTransform: "uppercase",
    marginBottom: 12,
    letterSpacing: "-0.01em",
  },

  accountRow: {
    display: "grid",
    gridTemplateColumns: "82px 1fr",
    alignItems: "center",
    minHeight: 25,
    gap: 8,
  },

  accountLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 400,
  },

  accountValue: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 500,
  },

  statusValue: {
    color: "#15803d",
    fontSize: 13,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },

  accountDivider: {
    height: 1,
    background: "#edf2f7",
    margin: "9px 0 12px",
  },

  accessTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 8,
  },

  accessList: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
  },

  accessChip: {
    minHeight: 25,
    padding: "0 9px",
    borderRadius: 7,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
  },

  accessChipActive: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
  },

  accessChipInactive: {
    background: "#f8fafc",
    color: "#64748b",
    border: "1px solid #e2e8f0",
  },

  passwordButton: {
    width: "100%",
    height: 30,
    marginTop: 12,
    borderRadius: 7,
    border: "1px solid #dbe4ef",
    background: "#ffffff",
    color: "#334155",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },

  mainCard: {
    background: "#ffffff",
    border: "1px solid #edf2f7",
    borderRadius: 12,
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.035)",
    padding: 20,
    minHeight: 380,
    boxSizing: "border-box",
  },

  profileHeader: {
    marginBottom: 16,
  },

  employeeName: {
    margin: 0,
    fontSize: 23,
    lineHeight: 1.15,
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.03em",
  },

  employeeRole: {
    marginTop: 6,
    fontSize: 15,
    color: "#64748b",
    fontWeight: 400,
  },

  mainDivider: {
    height: 1,
    background: "#e5edf7",
    margin: "0 -20px 16px",
  },

  tabs: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    fontSize: 14,
    fontWeight: 600,
  },

  tabActive: {
    color: "#2563eb",
    paddingBottom: 10,
    borderBottom: "2px solid #2563eb",
  },

  tab: {
    color: "#475569",
    paddingBottom: 10,
  },

  tabDivider: {
    height: 1,
    background: "#e5edf7",
    marginBottom: 20,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "22px 34px",
  },

  infoTile: {
    display: "grid",
    gridTemplateColumns: "36px 1fr",
    gap: 10,
    alignItems: "center",
  },

  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#f8fafc",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 15,
    fontWeight: 500,
  },

  infoContent: {
    minWidth: 0,
  },

  infoTileLabel: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 3,
  },

  infoTileValue: {
    color: "#475569",
    fontSize: 14,
    fontWeight: 400,
  },

  infoTileInput: {
    width: "100%",
    height: 30,
    padding: "0 8px",
    border: "1px solid #dbe4ef",
    borderRadius: 7,
    outline: "none",
    color: "#0f172a",
    fontSize: 13,
    fontWeight: 400,
    boxSizing: "border-box",
  },

  inlineInput: {
    width: "100%",
    padding: "0 8px",
    border: "1px solid #dbe4ef",
    borderRadius: 7,
    outline: "none",
    color: "#0f172a",
    background: "#ffffff",
    boxSizing: "border-box",
    fontFamily:
      "Inter, Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  logoutWrap: {
    display: "flex",
    justifyContent: "center",
    marginTop: 14,
    paddingBottom: 6,
  },

  logoutButton: {
    height: 34,
    padding: "0 18px",
    borderRadius: 8,
    border: "1px solid #ef4444",
    background: "#ffffff",
    color: "#ef4444",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  message: {
    padding: 10,
    color: "#64748b",
    fontWeight: 400,
  },

  errorMessage: {
    padding: 10,
    borderRadius: 8,
    background: "#fef2f2",
    color: "#dc2626",
    marginBottom: 10,
    fontWeight: 400,
  },

  confirmOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 3000,
    background: "transparent",
    pointerEvents: "none",
  },

  confirmBox: {
    position: "absolute",
    top: 70,
    right: 76,
    width: 310,
    background: "#ffffff",
    borderRadius: 10,
    padding: 12,
    boxShadow: "0 14px 38px rgba(15, 23, 42, 0.18)",
    border: "1px solid #e2e8f0",
    pointerEvents: "auto",
  },

  confirmTitle: {
    margin: "0 0 7px",
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
  },

  confirmText: {
    margin: "0 0 12px",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 400,
  },

  confirmActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 7,
  },

  confirmPrimaryButton: {
    height: 28,
    padding: "0 10px",
    borderRadius: 7,
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },

  confirmSecondaryButton: {
    height: 28,
    padding: "0 10px",
    borderRadius: 7,
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },

  confirmGhostButton: {
    height: 28,
    padding: "0 10px",
    borderRadius: 7,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#64748b",
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
  },
};