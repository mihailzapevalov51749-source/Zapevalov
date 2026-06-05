import { useRef, useState } from "react";
import { Eye, EyeOff, Trash2, X, Check } from "lucide-react";

import MenuColorPicker from "../../../shared/navigation/MenuColorPicker";
import { canShowNavigationDeleteAction } from "../utils/navigationDeletePolicy";

import { uploadIcon } from "../../../api/filesApi";

const PROTECTED_TITLES = ["главная страница", "мои задачи"];

const isProtectedMenuTitle = (title) => {
  return PROTECTED_TITLES.includes(String(title || "").trim().toLowerCase());
};

export default function MenuItemEditor({ item, onSave, onDelete, onClose }) {
  const fileInputRef = useRef(null);

  const isObjectTypeMenuItem =
    item?.type === "object_type" || Boolean(item?.object_type_id);

  const isProtectedTitle = isProtectedMenuTitle(item?.title);

  const isSystem =
    item?.isSystem ||
    item?.is_system === true ||
    item?.is_protected === true ||
    String(item?.id || "").startsWith("system-") ||
    isProtectedTitle;

  const canDelete = canShowNavigationDeleteAction(item);

  const [title, setTitle] = useState(
    item.display_title || item.title || "",
  );
  const [iconType, setIconType] = useState(
    item.display_icon_type || item.icon_type || null,
  );
  const [iconFileUrl, setIconFileUrl] = useState(
    item.display_icon_file_url || item.icon_file_url || null,
  );
  const [color, setColor] = useState(
    isObjectTypeMenuItem ? item.color || "" : item.display_color || item.color || "",
  );
  const [isBold, setIsBold] = useState(Boolean(item.is_bold));
  const [isItalic, setIsItalic] = useState(Boolean(item.is_italic));
  const resolveInitialVisibility = () => {
    const pageStatus = String(item?.page_status || "").trim().toLowerCase();
    if (pageStatus) {
      return pageStatus === "published";
    }
    return item.is_visible === undefined ? true : Boolean(item.is_visible);
  };
  const [isVisible, setIsVisible] = useState(resolveInitialVisibility);
  const [showIcon, setShowIcon] = useState(item.show_icon !== false);

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
    if (isObjectTypeMenuItem) {
      const trimmedColor = String(color || "").trim();
      await onSave({
        color: trimmedColor || null,
        is_bold: isBold,
        is_italic: isItalic,
        is_visible: isVisible,
        show_icon: showIcon,
        isSystem,
      });
      return;
    }

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
          readOnly={isObjectTypeMenuItem}
          disabled={isObjectTypeMenuItem}
          style={{
            ...titleInputStyle,
            color: color || "#0f172a",
            fontWeight: isBold ? 700 : 500,
            fontStyle: isItalic ? "italic" : "normal",
            ...(isObjectTypeMenuItem
              ? { background: "#f8fafc", cursor: "default" }
              : {}),
          }}
          title={
            isObjectTypeMenuItem
              ? "Название берётся из Object Type"
              : undefined
          }
        />

        <MenuColorPicker
          color={color}
          onChange={setColor}
          allowEmpty
          title="Выбрать цвет"
        />
      </div>

      <div
        style={{
          ...controlsRowStyle,
          ...(isObjectTypeMenuItem
            ? { gridTemplateColumns: "28px 28px auto" }
            : {}),
        }}
      >
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

        {isObjectTypeMenuItem ? (
          <label
            style={compactCheckboxLabelStyle}
            title="Показывать иконку Object Type в меню"
          >
            <input
              type="checkbox"
              checked={showIcon}
              onChange={(event) => setShowIcon(event.target.checked)}
            />
            <span>Иконка</span>
          </label>
        ) : (
          <>
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
          </>
        )}

        {!isObjectTypeMenuItem ? (
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.svg,.gif"
            onChange={handleUploadIcon}
            style={{ display: "none" }}
          />
        ) : null}
      </div>

      <div style={footerRowStyle}>
        {!isSystem && !isObjectTypeMenuItem && canDelete ? (
          <button type="button" onClick={onDelete} style={deleteButtonStyle}>
            <Trash2 size={14} />
          </button>
        ) : null}

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

const compactCheckboxLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
  fontSize: 12,
  lineHeight: 1.2,
  color: "#334155",
  cursor: "pointer",
  userSelect: "none",
};