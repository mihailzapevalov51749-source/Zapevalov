export const universalViewSettingsModalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 999999,
    background: "rgba(15, 23, 42, 0.18)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  modal: {
    width: 520,
    maxWidth: "calc(100vw - 40px)",
    borderRadius: 16,
    background: "#FFFFFF",
    border: "1px solid #E2E8F0",
    boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
    overflow: "hidden",
  },

  header: {
    padding: "10px 24px 8px",
    borderBottom: "1px solid #E2E8F0",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0F172A",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },

  closeButton: {
    width: 32,
    height: 32,
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "#64748B",
    fontSize: 24,
    lineHeight: "28px",
    cursor: "pointer",
  },

  body: {
    padding: "0px 20px 24px",
  },

  label: {
    display: "block",
    marginBottom: 6,
    marginTop: 12,
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
  },

  input: {
    width: "100%",
    height: 36,
    padding: "0 10px",
    border: "1px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  },

  select: {
    width: "100%",
    height: 36,
    padding: "0 10px",
    border: "1px solid #CBD5E1",
    borderRadius: 8,
    fontSize: 13,
    background: "#FFFFFF",
    outline: "none",
    boxSizing: "border-box",
  },

  footer: {
    padding: "14px 20px",
    borderTop: "1px solid #E2E8F0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  footerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },

  cancelButton: {
    height: 34,
    padding: "0 14px",
    border: "1px solid #CBD5E1",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#334155",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  saveButton: {
    height: 34,
    padding: "0 14px",
    border: "1px solid #2563EB",
    borderRadius: 8,
    background: "#2563EB",
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  deleteButton: {
    height: 34,
    padding: "0 14px",
    border: "1px solid #FCA5A5",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#DC2626",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
};