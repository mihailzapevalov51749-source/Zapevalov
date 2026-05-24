export const chatHeaderStyles = {
  chatHeader: {
    flexShrink: 0,
    height: 50,
    padding: "0 18px",
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid #E5E7EB",
    background: "#FFFFFF",
  },

  chatHeaderTop: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    gap: 18,
  },

  chatHeaderInfo: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexShrink: 0,
  },

  chatHeaderAvatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    overflow: "hidden",
    background: "#E8EEF9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#1F3A8A",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
  },

  chatHeaderAvatarClip: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    overflow: "hidden",
    background: "#E2E8F0",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  chatHeaderAvatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    userSelect: "none",
    pointerEvents: "none",
    transformOrigin: "center center",
  },

  chatHeaderTitle: {
    minWidth: 0,
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  chatHeaderTabs: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    gap: 18,
    marginLeft: 10,
  },

  chatHeaderTab: {
    height: "100%",
    padding: "0 2px",
    border: "none",
    borderBottom: "2px solid transparent",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
  },

  activeChatHeaderTab: {
    color: "#111827",
    borderBottom: "2px solid #4F46E5",
  },

  chatHeaderAddButton: {
    height: "100%",
    padding: "0 4px",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: 22,
    fontWeight: 300,
    color: "#6B7280",
    lineHeight: 1,
  },

  chatHeaderActions: {
    marginLeft: "auto",
    height: "100%",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  chatHeaderActionButton: {
    width: 30,
    height: 30,
    border: "1px solid #E5E7EB",
    borderRadius: 8,
    background: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    transition: "all 0.15s ease",
    flexShrink: 0,
  },

  chatHeaderActionButtonHover: {
    background: "#F9FAFB",
    border: "1px solid #D1D5DB",
  },

  chatHeaderActionIcon: {
    width: 16,
    height: 16,
    objectFit: "contain",
    opacity: 0.9,
    pointerEvents: "none",
  },
};