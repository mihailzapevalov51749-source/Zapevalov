export default function PageCanvasErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      style={{
        marginBottom: 10,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #FECACA",
        background: "#FEF2F2",
        color: "#991B1B",
        fontSize: 13,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        boxSizing: "border-box",
      }}
    >
      <span style={{ lineHeight: 1.45 }}>{message}</span>

      <button
        type="button"
        onClick={onDismiss}
        title="Закрыть"
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          border: "none",
          borderRadius: 6,
          background: "transparent",
          color: "#991B1B",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
