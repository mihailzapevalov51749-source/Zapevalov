import { useRef, useState } from "react";
import { Eye, EyeOff, Trash2, X, Check, Ban } from "lucide-react";

import { uploadIcon } from "../../../api/filesApi";

const PROTECTED_TITLES = ["главная страница", "мои задачи"];

const MENU_COLORS = [
  "",
  "#ffffff",

  "#0f172a",
  "#334155",
  "#475569",
  "#64748b",

  "#2563eb",
  "#3b82f6",
  "#0ea5e9",
  "#06b6d4",

  "#16a34a",
  "#22c55e",
  "#84cc16",

  "#f59e0b",
  "#f97316",

  "#ef4444",
  "#ec4899",
  "#a855f7",
];

const isProtectedMenuTitle = (title) => {
  return PROTECTED_TITLES.includes(String(title || "").trim().toLowerCase());
};

const getColorTitle = (color) => {
  if (color === "") return "Без цвета";
  if (color === "#ffffff") return "Белый";
  return color;
};

export default function MenuItemEditor({ item, onSave, onDelete, onClose }) {
  const fileInputRef = useRef(null);

  const isProtectedTitle = isProtectedMenuTitle(item?.title);

  const isSystem =
    item?.isSystem ||
    item?.is_system === true ||
    item?.is_protected === true ||
    String(item?.id || "").startsWith("system-") ||
    isProtectedTitle;

  const [title, setTitle] = useState(item.title || "");
  const [iconType, setIconType] = useState(item.icon_type || null);
  const [iconFileUrl, setIconFileUrl] = useState(item.icon_file_url || null);
  const [color, setColor] = useState(item.color || "");
  const [isBold, setIsBold] = useState(Boolean(item.is_bold));
  const [isItalic, setIsItalic] = useState(Boolean(item.is_italic));
  const [isVisible, setIsVisible] = useState(
    item.is_visible === undefined ? true : Boolean(item.is_visible)
  );
  const [isColorPaletteOpen, setIsColorPaletteOpen] = useState(false);

  const handleUploadIcon = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const uploaded = await uploadIcon(file);
      setIconType("upload");
      setIconFileUrl(uploaded.file_url);
    } catch (e) {
      console.error(e);
      alert("Не удалось загрузить иконку. Разрешены: JPG, JPEG, PNG, SVG, GIF");
    }
  };

  const handleRemoveIcon = () => {
    setIconType(null);
    setIconFileUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    await onSave({
      title: title.trim(),
      icon: null,
      icon_type: iconType,
      icon_file_url: iconFileUrl,
      color,
      is_bold: isBold,
      is_italic: isItalic,
      is_visible: isVisible,
      isSystem,
    });
  };

  return (
    <div style={cardStyle}>
      <div style={headerRowStyle}>
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          style={{
            ...smallIconButtonStyle,
            background: isVisible ? "#f8fafc" : "#fef2f2",
          }}
          title={isVisible ? "Скрыть" : "Показать"}
        >
          {isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название"
          style={{
            ...titleInputStyle,
            color: color || "#0f172a",
            fontWeight: isBold ? 700 : 500,
            fontStyle: isItalic ? "italic" : "normal",
          }}
        />

        <div style={colorPickerWrapperStyle}>
          <button
            type="button"
            onClick={() => setIsColorPaletteOpen((prev) => !prev)}
            style={{
              ...colorCurrentButtonStyle,
              background: color || "#ffffff",
              border: color ? "2px solid #ffffff" : "1px dashed #94a3b8",
            }}
            title="Выбрать цвет"
          >
            {!color && <Ban size={12} color="#64748b" />}
          </button>

          {isColorPaletteOpen && (
            <div style={colorPaletteStyle}>
              {MENU_COLORS.map((paletteColor) => {
                const isActive = paletteColor === color;
                const isNoColor = paletteColor === "";
                const isWhite = paletteColor === "#ffffff";

                return (
                  <button
                    key={paletteColor || "no-color"}
                    type="button"
                    onClick={() => {
                      setColor(paletteColor);
                      setIsColorPaletteOpen(false);
                    }}
                    style={{
                      ...colorButtonStyle,
                      background: paletteColor || "#ffffff",
                      border: isNoColor
                        ? "1px dashed #94a3b8"
                        : isWhite
                          ? "1px solid #cbd5e1"
                          : "none",
                      boxShadow: isActive
                        ? "0 0 0 2px #ffffff, 0 0 0 4px rgba(37,99,235,0.45)"
                        : "none",
                    }}
                    title={getColorTitle(paletteColor)}
                  >
                    {isNoColor && <Ban size={11} color="#64748b" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={controlsRowStyle}>
        <button
          type="button"
          onClick={() => setIsBold((prev) => !prev)}
          style={{
            ...formatButtonStyle,
            background: isBold ? "#dbeafe" : "#ffffff",
          }}
          title="Жирный"
        >
          Ж
        </button>

        <button
          type="button"
          onClick={() => setIsItalic((prev) => !prev)}
          style={{
            ...formatButtonStyle,
            background: isItalic ? "#dbeafe" : "#ffffff",
            fontStyle: "italic",
          }}
          title="Курсив"
        >
          К
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={iconButtonTextStyle}
          title={iconFileUrl ? "Заменить иконку" : "Добавить иконку"}
        >
          Иконка
        </button>

        <button
          type="button"
          onClick={handleRemoveIcon}
          disabled={!iconFileUrl}
          style={{
            ...smallIconButtonStyle,
            opacity: iconFileUrl ? 1 : 0.35,
            cursor: iconFileUrl ? "pointer" : "default",
          }}
          title="Удалить иконку"
        >
          <Trash2 size={14} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.svg,.gif"
          onChange={handleUploadIcon}
          style={{ display: "none" }}
        />
      </div>

      <div style={footerRowStyle}>
        {!isSystem && (
          <button type="button" onClick={onDelete} style={deleteButtonStyle}>
            <Trash2 size={14} />
          </button>
        )}

        <div style={footerActionsStyle}>
          <button type="button" onClick={onClose} style={closeButtonStyle}>
            <X size={14} />
          </button>

          <button type="button" onClick={handleSave} style={saveButtonStyle}>
            <Check size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  marginTop: 5,
  marginLeft: 6,
  marginRight: 0,
  padding: 8,
  border: "1px solid rgba(226,232,240,0.9)",
  borderRadius: 10,
  background: "#ffffff",
  boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
  display: "grid",
  gap: 8,
  boxSizing: "border-box",
  width: "calc(100% - 12px)",
  maxWidth: "100%",
  overflow: "visible",
};

const headerRowStyle = {
  display: "grid",
  gridTemplateColumns: "28px minmax(0, 1fr) 28px",
  gap: 6,
  alignItems: "center",
  minWidth: 0,
};

const titleInputStyle = {
  width: "100%",
  minWidth: 0,
  height: 30,
  padding: "0 9px",
  borderRadius: 8,
  border: "1px solid rgba(203,213,225,0.9)",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const colorPickerWrapperStyle = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  height: 28,
};

const colorCurrentButtonStyle = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  boxShadow: "0 0 0 1px rgba(203,213,225,0.9)",
  cursor: "pointer",
  flexShrink: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const colorPaletteStyle = {
  position: "absolute",
  top: 34,
  right: 0,
  zIndex: 50,
  display: "grid",
  gridTemplateColumns: "repeat(4, 18px)",
  gap: 7,
  padding: 8,
  borderRadius: 10,
  border: "1px solid rgba(203,213,225,0.9)",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgba(15,23,42,0.18)",
};

const colorButtonStyle = {
  width: 18,
  height: 18,
  borderRadius: "50%",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const controlsRowStyle = {
  display: "grid",
  gridTemplateColumns: "28px 28px minmax(0, 1fr) 28px",
  gap: 6,
  alignItems: "center",
  minWidth: 0,
};

const formatButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 7,
  border: "1px solid rgba(203,213,225,0.9)",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  color: "#0f172a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const smallIconButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 7,
  border: "1px solid rgba(203,213,225,0.9)",
  background: "#ffffff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#475569",
  flexShrink: 0,
};

const iconButtonTextStyle = {
  minWidth: 0,
  height: 28,
  padding: "0 8px",
  borderRadius: 7,
  border: "1px solid rgba(203,213,225,0.9)",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: 12,
  color: "#334155",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const footerRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  minWidth: 0,
};

const footerActionsStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginLeft: "auto",
};

const saveButtonStyle = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "none",
  background: "#0ea5e9",
  color: "#ffffff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const closeButtonStyle = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid rgba(203,213,225,0.9)",
  background: "#ffffff",
  color: "#475569",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const deleteButtonStyle = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid rgba(239,68,68,0.25)",
  background: "#fff5f5",
  color: "#ef4444",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};