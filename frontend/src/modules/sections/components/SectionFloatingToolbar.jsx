export default function SectionFloatingToolbar({
  visible,
  onEdit,
  onDelete,
}) {
  return (
    <div
      data-section-floating-toolbar="true"
      style={{
        position: "absolute",
        top: -42,
        right: 0,
        display: "flex",
        gap: 8,
        zIndex: 8,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 120ms ease",
      }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button type="button" onClick={onEdit} style={editButtonStyle}>
        Раздел
      </button>

      <button type="button" onClick={onDelete} style={deleteButtonStyle}>
        Удалить
      </button>
    </div>
  );
}

const baseButtonStyle = {
  padding: "6px 10px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  border: "1px solid",
  background: "#ffffff",
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
};

const editButtonStyle = {
  ...baseButtonStyle,
  borderColor: "#cbd5e1",
  color: "#0f172a",
};

const deleteButtonStyle = {
  ...baseButtonStyle,
  borderColor: "#fecaca",
  color: "#dc2626",
};
