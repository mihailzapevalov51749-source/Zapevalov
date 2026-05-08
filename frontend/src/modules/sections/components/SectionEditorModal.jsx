import { useEffect, useState } from "react";
import SectionLayoutSelector from "./SectionLayoutSelector";

export default function SectionEditorModal({ section, onSave, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [layout, setLayout] = useState("one_column");
  const [showTitle, setShowTitle] = useState(true);

  useEffect(() => {
    if (!section) return;

    setTitle(section.title || "");
    setDescription(section.description || "");
    setLayout(section.layout || "one_column");

    setShowTitle(section.settings?.show_title !== false);
  }, [section]);

  if (!section) {
    return (
      <div style={{ color: "#94a3b8", fontSize: 13 }}>
        Выберите раздел для редактирования
      </div>
    );
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    await onSave({
      title,
      description,
      layout,
      settings: {
        ...(section.settings || {}),
        show_title: showTitle,
      },
    });
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: "#ffffff",
          }}
        >
          Редактирование раздела
        </h3>

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

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "#e5f0ff",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={showTitle}
          onChange={(event) => setShowTitle(event.target.checked)}
        />
        Показывать название раздела
      </label>

      <Field label="Описание">
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={5}
          style={{
            ...inputStyle,
            resize: "vertical",
          }}
        />
      </Field>

      <div
        style={{
          padding: 10,
          borderRadius: 10,
          background: "#0f1b2d",
          border: "1px solid #24364f",
        }}
      >
        <SectionLayoutSelector value={layout} onChange={setLayout} />
      </div>

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