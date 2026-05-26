import { useEffect, useState } from "react";

import ButtonBlockEditor from "../../blockTypes/button/ButtonBlockEditor";
import DocumentsBlockEditor from "../../blockTypes/documents/DocumentsBlockEditor";
import ImageBlockEditor from "../../blockTypes/image/ImageBlockEditor";
import TextBlockEditor from "../../blockTypes/text/TextBlockEditor";
import CardsBlockEditor from "../../blockTypes/cards/CardsBlockEditor";
export default function BlockEditorModal({
  block,
  onSave,
  onClose,
  onPatchBlock,
  onRemoveFromSection,
}) {
  const [title, setTitle] = useState("");
  const [showTitle, setShowTitle] = useState(true);

  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  const [itemsText, setItemsText] = useState("");

  useEffect(() => {
    if (!block) return;

    setTitle(block.title || "");
    setShowTitle(block.settings?.show_title !== false);

    setLabel(block.content?.label || "");
    setUrl(block.content?.url || "");

    setItemsText(
      Array.isArray(block.content?.items) ? block.content.items.join("\n") : ""
    );
  }, [block]);

  if (!block) {
    return (
      <div style={{ color: "#94a3b8", fontSize: 13 }}>
        Выберите блок для редактирования
      </div>
    );
  }

  if (block.type === "universal_table") {
    return (
      <div style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.5 }}>
        Настройки таблицы на canvas доступны в заголовке блока: иконка глаза и
        удаление.
      </div>
    );
  }

  if (block.type === "button") {
    return (
      <ButtonBlockEditor
        block={block}
        title={title}
        setTitle={setTitle}
        showTitle={showTitle}
        setShowTitle={setShowTitle}
        onSave={onSave}
        onClose={onClose}
        uploadFile={uploadFile}
        styles={{
          inputStyle,
          colorInputStyle,
          checkboxStyle,
          saveButtonStyle,
          smallButtonStyle,
          dangerSmallButtonStyle,
        }}
      />
    );
  }

  if (block.type === "document" || block.type === "documents") {
    return (
      <DocumentsBlockEditor
        block={block}
        title={title}
        setTitle={setTitle}
        showTitle={showTitle}
        setShowTitle={setShowTitle}
        onSave={onSave}
        onClose={onClose}
        uploadFile={uploadFile}
        styles={{
          inputStyle,
          checkboxStyle,
          saveButtonStyle,
          smallButtonStyle,
          dangerSmallButtonStyle,
        }}
      />
    );
  }

  if (block.type === "image") {
    return (
      <ImageBlockEditor
        block={block}
        title={title}
        setTitle={setTitle}
        showTitle={showTitle}
        setShowTitle={setShowTitle}
        onSave={onSave}
        onClose={onClose}
        uploadFile={uploadFile}
        styles={{
          inputStyle,
          checkboxStyle,
          saveButtonStyle,
          smallButtonStyle,
          dangerSmallButtonStyle,
        }}
      />
    );
  }

  if (block.type === "text") {
    return (
      <TextBlockEditor
        block={block}
        title={title}
        setTitle={setTitle}
        showTitle={showTitle}
        setShowTitle={setShowTitle}
        onSave={onSave}
        onClose={onClose}
        styles={{
          inputStyle,
          checkboxStyle,
          saveButtonStyle,
          smallButtonStyle,
        }}
      />
    );
  }

  if (block.type === "cards") {
    return (
      <CardsBlockEditor
        block={block}
        title={title}
        setTitle={setTitle}
        showTitle={showTitle}
        setShowTitle={setShowTitle}
        onSave={onSave}
        onClose={onClose}
        styles={{
          inputStyle,
          checkboxStyle,
          saveButtonStyle,
          smallButtonStyle,
        }}
      />
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const content = buildContent();

    const nextSettings = {
      ...(block.settings || {}),
      show_title: showTitle,
    };

    delete nextSettings.image_height;
    delete nextSettings.image_fit;

    await onSave({
      title,
      content,
      settings: nextSettings,
    });
  };

  const buildContent = () => {
    if (block.type === "link") {
      return {
        ...(block.content || {}),
        label,
        url,
      };
    }

    if (block.type === "steps") {
      return {
        ...(block.content || {}),
        items: itemsText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      };
    }

    return block.content || {};
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        color: "#e5f0ff",
      }}
    >
      <div style={headerStyle}>
        <h3 style={titleStyle}>Редактирование блока</h3>

        {onClose && (
          <button type="button" onClick={onClose} style={smallButtonStyle}>
            ×
          </button>
        )}
      </div>

      <Field label="Название">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          style={inputStyle}
        />
      </Field>

      <label style={checkboxStyle}>
        <input
          type="checkbox"
          checked={showTitle}
          onChange={(event) => setShowTitle(event.target.checked)}
        />
        Показывать название
      </label>

      {block.type === "link" && (
        <>
          <Field label="Текст ссылки">
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="URL">
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </Field>
        </>
      )}

      {block.type === "steps" && (
        <Field label="Элементы, каждый с новой строки">
          <textarea
            value={itemsText}
            onChange={(event) => setItemsText(event.target.value)}
            rows={7}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </Field>
      )}

      <button type="submit" style={saveButtonStyle}>
        Сохранить
      </button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#cbd5e1" }}>{label}</span>
      {children}
    </label>
  );
}

async function uploadFile(file, type) {
  const formData = new FormData();
  formData.append("file", file);

  const endpoint =
    type === "image"
      ? "http://127.0.0.1:8010/files/upload-image"
      : "http://127.0.0.1:8010/files/upload-document";

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Ошибка загрузки файла");
  }

  const data = await response.json();
  return data.file_url;
}

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const titleStyle = {
  margin: 0,
  fontSize: 14,
  fontWeight: 700,
  color: "#ffffff",
};

const inputStyle = {
  padding: "8px 10px",
  border: "1px solid #334155",
  borderRadius: 8,
  background: "#0f1b2d",
  color: "#ffffff",
  boxSizing: "border-box",
  width: "100%",
  fontSize: 13,
};

const colorInputStyle = {
  width: 44,
  height: 36,
  padding: 2,
  border: "1px solid #334155",
  borderRadius: 8,
  background: "#0f1b2d",
  cursor: "pointer",
};

const checkboxStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#cbd5e1",
};

const saveButtonStyle = {
  marginTop: 4,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #3b82f6",
  background: "#2563eb",
  color: "#ffffff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};

const smallButtonStyle = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0f1b2d",
  color: "#ffffff",
  cursor: "pointer",
};

const dangerSmallButtonStyle = {
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #7f1d1d",
  background: "#450a0a",
  color: "#fecaca",
  cursor: "pointer",
  fontSize: 12,
};