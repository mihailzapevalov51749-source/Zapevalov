import { useEffect, useState } from "react";

import { updateBlock } from "../../blocks/services/blockService";

export default function LinkBlockView({ block, isEditMode, onBlockUpdated }) {
  const content = block?.content || {};
  const settings = block?.settings || {};

  const initialLabel =
    content.label || block?.title || settings.label || "Перейти";
  const initialUrl = content.url || settings.url || "";

  const [label, setLabel] = useState(initialLabel);
  const [url, setUrl] = useState(initialUrl);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLabel(initialLabel);
    setUrl(initialUrl);
  }, [initialLabel, initialUrl]);

  const saveLink = async () => {
    if (!block?.id || isSaving) return;

    const nextLabel = label.trim() || "Перейти";
    const nextUrl = url.trim();

    try {
      setIsSaving(true);

      const savedBlock = await updateBlock(block.id, {
        title: nextLabel,
        content: {
          ...(block.content || {}),
          label: nextLabel,
          url: nextUrl,
        },
        settings: {
          ...(block.settings || {}),
          show_title: settings.show_title !== false,
        },
      });

      const updatedBlock = {
        ...block,
        ...savedBlock,
        title: nextLabel,
        content: {
          ...(block.content || {}),
          ...(savedBlock?.content || {}),
          label: nextLabel,
          url: nextUrl,
        },
      };

      setLabel(nextLabel);
      setUrl(nextUrl);
      onBlockUpdated?.(updatedBlock, { alreadyPersisted: true });
      setIsEditing(false);
    } catch (error) {
      console.error("Ошибка сохранения ссылки", error);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setLabel(initialLabel);
    setUrl(initialUrl);
    setIsEditing(false);
  };

  if (isEditMode && isEditing) {
    return (
      <div
        data-inline-editor="true"
        data-link-block-content="true"
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          display: "grid",
          gap: 8,
          padding: 8,
          boxSizing: "border-box",
        }}
      >
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Текст ссылки"
          style={fieldStyle}
        />
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
          style={fieldStyle}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={saveLink} style={primaryButtonStyle}>
            {isSaving ? "Сохранение..." : "Сохранить"}
          </button>
          <button type="button" onClick={cancelEdit} style={secondaryButtonStyle}>
            Отмена
          </button>
        </div>
      </div>
    );
  }

  const href = normalizeUrl(url);

  return (
    <div
      data-link-block-content="true"
      style={{
        width: "100%",
        padding: isEditMode ? "8px 8px 8px 16px" : 0,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {isEditMode && <DragHandle />}

      <a
        href={isEditMode ? undefined : href}
        target={isEditMode ? undefined : "_blank"}
        rel={isEditMode ? undefined : "noreferrer"}
        onClick={(event) => {
          if (!isEditMode) return;

          event.preventDefault();
          event.stopPropagation();
          setIsEditing(true);
        }}
        style={{
          color: "#2563eb",
          fontSize: 15,
          fontWeight: 700,
          textDecoration: "underline",
          wordBreak: "break-word",
          cursor: isEditMode ? "text" : "pointer",
        }}
      >
        {label || "Перейти"}
      </a>

      {isEditMode && url ? (
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: "#64748b",
            wordBreak: "break-all",
          }}
        >
          {url}
        </div>
      ) : null}
    </div>
  );
}

function DragHandle() {
  return (
    <div
      data-block-drag-handle="true"
      title="Переместить"
      style={{
        position: "absolute",
        left: 0,
        top: 10,
        width: 10,
        height: 18,
        display: "grid",
        gridTemplateColumns: "repeat(2, 2px)",
        gridTemplateRows: "repeat(3, 2px)",
        gap: 2,
        alignItems: "center",
        justifyContent: "center",
        cursor: "grab",
        opacity: 0.5,
        zIndex: 5,
      }}
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <span
          key={index}
          style={{
            width: 2,
            height: 2,
            borderRadius: "50%",
            background: "#64748b",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}

function normalizeUrl(url) {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return url;
  return `https://${url}`;
}

const fieldStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #CBD5E1",
  borderRadius: 8,
  fontSize: 13,
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #2563EB",
  background: "#2563EB",
  color: "#FFFFFF",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
};

const secondaryButtonStyle = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #CBD5E1",
  background: "#FFFFFF",
  color: "#334155",
  cursor: "pointer",
  fontSize: 12,
};
