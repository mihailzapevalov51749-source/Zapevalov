export const chatModalStyles = {
  filters: {
    red: "invert(24%) sepia(96%) saturate(2834%) hue-rotate(344deg) brightness(91%) contrast(92%)",
  },

  popover: {
    position: "fixed",
    width: 520,
    background: "#FFFFFF",
    border: "1px solid #DDE5F0",
    borderRadius: 14,
    boxShadow: "0 14px 38px rgba(15, 23, 42, 0.18)",
    padding: "18px 22px",
    boxSizing: "border-box",
    zIndex: 4000,
  },

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  title: {
    fontSize: 17,
    fontWeight: 700,
    color: "#0F172A",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  iconButton: {
    width: 26,
    height: 26,
    border: "none",
    background: "transparent",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  headerIcon: {
    width: 16,
    height: 16,
    objectFit: "contain",
  },

  closeButton: {
    width: 26,
    height: 26,
    border: "none",
    background: "transparent",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 22,
    lineHeight: 1,
    color: "#475569",
  },

  contentRow: {
    display: "grid",
    gridTemplateColumns: "104px minmax(0, 1fr)",
    alignItems: "center",
    gap: 10,
  },

  titleInput: {
    width: "100%",
    height: 42,
    border: "1px solid #DCE3F1",
    borderRadius: 10,
    padding: "0 14px",
    fontSize: 15,
    fontWeight: 500,
    color: "#0F172A",
    outline: "none",
    boxSizing: "border-box",
  },

  avatarEditor: {
    width: 104,
    height: 74,
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },

  avatarCircle: {
    width: 74,
    height: 74,
    borderRadius: "50%",
    overflow: "hidden",
    background: "linear-gradient(135deg,#CBD5E1,#94A3B8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "grab",
    userSelect: "none",
    flexShrink: 0,
  },

  avatarViewport: {
    width: 74,
    height: 74,
    borderRadius: "50%",
    overflow: "hidden",
    background: "#E2E8F0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    flexShrink: 0,
    userSelect: "none",
    pointerEvents: "none",
    transformOrigin: "center center",
  },

  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1,
  },

  avatarActions: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  avatarIconButton: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "1px solid #DCE3F1",
    background: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    boxShadow: "0 4px 10px rgba(15,23,42,0.08)",
  },

  avatarIcon: {
    width: 14,
    height: 14,
    objectFit: "contain",
  },

  hiddenInput: {
    display: "none",
  },

  confirmBox: {
    marginTop: 16,
    padding: 14,
    border: "1px solid #FCA5A5",
    borderRadius: 12,
    background: "#FEF2F2",
  },

  confirmTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#991B1B",
    marginBottom: 6,
  },

  confirmText: {
    fontSize: 13,
    color: "#7F1D1D",
    marginBottom: 12,
  },

  confirmActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },

  confirmCancelButton: {
    height: 32,
    padding: "0 12px",
    border: "1px solid #CBD5E1",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#334155",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },

  confirmDeleteButton: {
    height: 32,
    padding: "0 12px",
    border: "1px solid #DC2626",
    borderRadius: 8,
    background: "#DC2626",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  chatModalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3000,
  },

  chatModal: {
    width: 520,
    background: "#FFFFFF",
    borderRadius: 14,
    border: "1px solid #DDE5F0",
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.20)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  chatModalHeader: {
    padding: "18px 20px 14px",
    borderBottom: "1px solid #E5E7EB",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  chatModalTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#0F172A",
  },

  chatModalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },

  chatModalCloseButton: {
    width: 28,
    height: 28,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 24,
    color: "#64748B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  chatModalBody: {
    padding: 20,
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },

  chatModalField: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  chatModalLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0F172A",
  },

  chatModalInput: {
    height: 42,
    border: "1px solid #DCE3F1",
    borderRadius: 10,
    padding: "0 14px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },

  chatModalSearchBox: {
    height: 42,
    border: "1px solid #DCE3F1",
    borderRadius: 10,
    padding: "0 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    boxSizing: "border-box",
  },

  chatModalSearchIcon: {
    width: 16,
    height: 16,
    objectFit: "contain",
    opacity: 0.7,
  },

  chatModalSearchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
  },

  chatModalUsersList: {
    maxHeight: 240,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  chatModalUserButton: {
    width: "100%",
    border: "1px solid transparent",
    borderRadius: 10,
    background: "#FFFFFF",
    padding: 10,
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    textAlign: "left",
  },

  chatModalUserButtonActive: {
    background: "#EEF2FF",
    border: "1px solid #C7D2FE",
  },

  chatModalUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#E0E7FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
    color: "#3730A3",
    flexShrink: 0,
  },

  chatModalUserInfo: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  chatModalUserName: {
    fontSize: 14,
    fontWeight: 600,
    color: "#111827",
  },

  chatModalUserEmail: {
    fontSize: 12,
    color: "#6B7280",
  },

  chatModalFooter: {
    padding: "14px 20px",
    borderTop: "1px solid #E5E7EB",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },

  chatModalCancelButton: {
    height: 38,
    padding: "0 16px",
    border: "1px solid #CBD5E1",
    borderRadius: 10,
    background: "#FFFFFF",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },

  chatModalCreateButton: {
    height: 38,
    padding: "0 16px",
    border: "none",
    borderRadius: 10,
    background: "#4F46E5",
    color: "#FFFFFF",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
  },
};