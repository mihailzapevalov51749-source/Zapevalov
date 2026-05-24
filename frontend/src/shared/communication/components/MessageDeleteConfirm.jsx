import { createPortal } from "react-dom";

const confirmOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.42)",
  backdropFilter: "blur(2px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 500000,
};

const confirmModalStyle = {
  width: 360,
  background: "#FFFFFF",
  borderRadius: 18,
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
  padding: 20,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

const confirmTitleStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: "#0F172A",
  lineHeight: 1.3,
};

const confirmTextStyle = {
  fontSize: 13,
  color: "#64748B",
  lineHeight: 1.45,
};

const confirmActionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
};

const confirmCancelButtonStyle = {
  height: 36,
  border: "none",
  borderRadius: 10,
  padding: "0 14px",
  background: "#F1F5F9",
  color: "#475569",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const confirmDeleteButtonStyle = {
  height: 36,
  border: "none",
  borderRadius: 10,
  padding: "0 14px",
  background: "#DC2626",
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

export default function MessageDeleteConfirm({
  isOpen,
  title = "Удалить сообщение?",
  text = "Сообщение будет удалено без возможности восстановления.",
  confirmLabel = "Удалить",

  onCancel,
  onConfirm,
}) {
  if (!isOpen) return null;

  return createPortal(
    <div style={confirmOverlayStyle} onMouseDown={onCancel}>
      <div
        style={confirmModalStyle}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div style={confirmTitleStyle}>
          {title}
        </div>

        <div style={confirmTextStyle}>
          {text}
        </div>

        <div style={confirmActionsStyle}>
          <button
            type="button"
            style={confirmCancelButtonStyle}
            onClick={onCancel}
          >
            Отмена
          </button>

          <button
            type="button"
            style={confirmDeleteButtonStyle}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}