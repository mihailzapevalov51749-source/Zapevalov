import { useEffect, useState } from "react";

import {
  popoverOverlayStyle,
  popoverStyle,
} from "../../modules/comments/styles/commentPopoverStyles";

import { clampMenuPosition } from "../utils/pageCanvasContextMenuUtils";

const PANEL_WIDTH = 300;

export default function PageSettingsPopover({
  anchor,
  page,
  navigationItem,
  onSavePage,
  onClose,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [position, setPosition] = useState({ top: 12, left: 12 });

  useEffect(() => {
    if (!page) return;

    setTitle(page.title || "");
    setDescription(page.description || "");
    setIsVisible(
      navigationItem?.is_visible === undefined
        ? true
        : Boolean(navigationItem.is_visible)
    );
  }, [page, navigationItem]);

  useEffect(() => {
    if (!anchor) return;

    setPosition(
      clampMenuPosition(anchor.x, anchor.y, PANEL_WIDTH, 260)
    );
  }, [anchor]);

  if (!anchor || !page) return null;

  return (
    <>
      <div style={popoverOverlayStyle} onMouseDown={onClose} />

      <form
        onSubmit={async (event) => {
          event.preventDefault();

          await onSavePage({
            title: title.trim(),
            description: description.trim(),
            is_visible: isVisible,
          });

          onClose();
        }}
        style={{
          ...popoverStyle,
          top: position.y,
          left: position.x,
          width: PANEL_WIDTH,
          padding: 14,
          zIndex: 10051,
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "#0F172A",
            marginBottom: 12,
          }}
        >
          Настройки страницы
        </div>

        <label style={labelStyle}>
          Название
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          Описание
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </label>

        <label style={checkboxStyle}>
          <input
            type="checkbox"
            checked={isVisible}
            onChange={(event) => setIsVisible(event.target.checked)}
          />
          Страница видна в меню
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button type="submit" style={primaryButtonStyle}>
            Сохранить
          </button>
          <button type="button" onClick={onClose} style={secondaryButtonStyle}>
            Отмена
          </button>
        </div>
      </form>
    </>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  color: "#334155",
  marginBottom: 10,
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  fontSize: 13,
  boxSizing: "border-box",
};

const checkboxStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#334155",
};

const primaryButtonStyle = {
  flex: 1,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #2563EB",
  background: "#2563EB",
  color: "#FFFFFF",
  fontWeight: 700,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#334155",
  cursor: "pointer",
};
