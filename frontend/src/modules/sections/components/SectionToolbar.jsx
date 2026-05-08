export default function SectionToolbar({ onEdit, onDelete }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        display: "flex",
        gap: 8,
        zIndex: 10,
      }}
    >
      <button onClick={onEdit} style={editButton}>
        Редактировать
      </button>

      <button onClick={onDelete} style={deleteButton}>
        Удалить
      </button>
    </div>
  );
}

const baseButton = {
  padding: "6px 10px",
  borderRadius: 8,
  fontSize: 12,
  cursor: "pointer",
  border: "1px solid",
  background: "#ffffff",
  transition: "all 120ms ease",
};

const editButton = {
  ...baseButton,
  borderColor: "#cbd5e1",
  color: "#0f172a",
};

const deleteButton = {
  ...baseButton,
  borderColor: "#fecaca",
  color: "#dc2626",
};