import { useState } from "react";

export default function CreateMenuItemModal({ onCreate, onClose }) {
  const [type, setType] = useState("workspace");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  const handleCreate = async () => {
    if (!title.trim()) return;

    await onCreate({
      type,
      title: title.trim(),
      url: type === "external_link" ? url.trim() : null,
    });

    setTitle("");
    setUrl("");
  };

  const getTitlePlaceholder = () => {
    if (type === "document_library") return "Название библиотеки";
    if (type === "external_link") return "Название ссылки";
    if (type === "workspace") return "Название раздела";
    if (type === "page") return "Название страницы";

    return "Название";
  };

  return (
    <div
      style={{
        marginTop: 12,
        padding: 10,
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        background: "#ffffff",
        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
        display: "grid",
        gap: 8,
      }}
    >
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        style={fieldStyle}
      >
        <option value="workspace">Раздел</option>
        <option value="page">Страница</option>
        <option value="document_library">Библиотека документов</option>
        <option value="external_link">Внешняя ссылка</option>
      </select>

      <input
        placeholder={getTitlePlaceholder()}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={fieldStyle}
      />

      {type === "external_link" && (
        <input
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={fieldStyle}
        />
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={handleCreate} style={primaryButton}>
          Сохранить
        </button>

        <button type="button" onClick={onClose} style={secondaryButton}>
          Закрыть
        </button>
      </div>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
};

const primaryButton = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#ffffff",
  cursor: "pointer",
};

const secondaryButton = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  cursor: "pointer",
};