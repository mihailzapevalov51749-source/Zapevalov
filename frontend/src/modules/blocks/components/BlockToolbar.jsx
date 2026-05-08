export default function BlockToolbar({ onDelete }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        right: 10,
        zIndex: 20,
      }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onDelete}
        title="Удалить блок"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "1px solid #fecaca",
          background: "#ffffff",
          color: "#dc2626",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
        }}
      >
        🗑
      </button>
    </div>
  );
}