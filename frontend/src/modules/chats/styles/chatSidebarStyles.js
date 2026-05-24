export const chatSidebarStyles = {
  sidebar: {
    height: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    background: "#FFFFFF",
    borderRight: "1px solid #E5E7EB",
    overflow: "hidden",
  },

  sidebarHeader: {
    flexShrink: 0,
    padding: "14px 14px 10px",
    borderBottom: "1px solid #E5E7EB",
    background: "#FFFFFF",
  },

  sidebarTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  sidebarAddButton: {
    width: 30,
    height: 30,
    border: "1px solid #E5E7EB",
    borderRadius: 6,
    background: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 500,
    color: "#4F46E5",
  },

  sidebarSearchBox: {
    marginTop: 12,
    height: 34,
    padding: "0 10px",
    borderRadius: 6,
    border: "1px solid #E5E7EB",
    background: "#F9FAFB",
    display: "flex",
    alignItems: "center",
    gap: 8,
    boxSizing: "border-box",
  },

  sidebarSearchIconImage: {
    width: 16,
    height: 16,
    objectFit: "contain",
    opacity: 0.72,
    flexShrink: 0,
  },

  sidebarSearchInput: {
    width: "100%",
    height: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 13,
    color: "#111827",
    boxSizing: "border-box",
  },

  sidebarTabs: {
    marginTop: 12,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },

  sidebarTab: {
    height: 28,
    padding: "0 9px",
    border: "none",
    borderRadius: 999,
    background: "transparent",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    color: "#6B7280",
  },

  activeSidebarTab: {
    background: "#EEF2FF",
    color: "#1D4ED8",
  },

  sidebarBody: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "6px 6px 12px",
    boxSizing: "border-box",
  },

  chatButton: {
    width: "100%",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    padding: "8px 10px",
    cursor: "pointer",
    textAlign: "left",
    display: "grid",
    gridTemplateColumns: "36px minmax(0, 1fr) auto",
    gap: 8,
    alignItems: "center",
  },

  activeChatButton: {
    background: "#F3F4F6",
  },

  chatAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "#E0E7FF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#3730A3",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    overflow: "hidden",
  },

  chatAvatarImageClip: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    overflow: "hidden",
    background: "#E2E8F0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  chatAvatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    userSelect: "none",
    pointerEvents: "none",
    transformOrigin: "center center",
  },

  chatMain: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },

  chatTitleRow: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  chatTitle: {
    minWidth: 0,
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  chatPreview: {
    fontSize: 11,
    lineHeight: 1.3,
    color: "#6B7280",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  chatMeta: {
    alignSelf: "stretch",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 5,
  },

  chatTime: {
    fontSize: 10,
    color: "#6B7280",
    whiteSpace: "nowrap",
  },

  unreadBadge: {
    minWidth: 18,
    height: 18,
    padding: "0 6px",
    boxSizing: "border-box",
    borderRadius: 999,
    background: "#2563EB",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: 700,
  },
};