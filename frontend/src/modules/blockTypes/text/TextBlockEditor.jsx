import { useEffect, useState } from "react";

export default function TextBlockEditor({
  block,
  title,
  setTitle,
  showTitle,
  setShowTitle,
  onSave,
  onClose,
  styles,
}) {
  const { inputStyle, checkboxStyle, saveButtonStyle, smallButtonStyle } =
    styles;

  const [text, setText] = useState("");
  const [variant, setVariant] = useState("default");
  const [density, setDensity] = useState("normal");
  const [textWidth, setTextWidth] = useState("full");
  const [fontSize, setFontSize] = useState(16);
  const [textAlign, setTextAlign] = useState("left");

  useEffect(() => {
    if (!block) return;

    setText(block.content?.text || "");
    setVariant(block.settings?.variant || "default");
    setDensity(block.settings?.density || "normal");
    setTextWidth(block.settings?.textWidth || "full");
    setFontSize(block.settings?.fontSize || 16);
    setTextAlign(block.settings?.textAlign || "left");
  }, [block]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextSettings = {
      ...(block.settings || {}),
      show_title: showTitle,
      variant,
      density,
      textWidth,
      fontSize: Number(fontSize) || 16,
      textAlign,
    };

    delete nextSettings.image_height;
    delete nextSettings.image_fit;

    await onSave({
      title,
      content: {
        ...(block.content || {}),
        text,
      },
      settings: nextSettings,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>Редактирование текста</h3>

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

      <Field label="Текст">
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={7}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </Field>

      <Field label="Тип отображения">
        <select
          value={variant}
          onChange={(event) => setVariant(event.target.value)}
          style={inputStyle}
        >
          <option value="default">Обычный</option>
          <option value="clean">Чистый</option>
          <option value="card">Карточка</option>
          <option value="accent">Акцент</option>
          <option value="instruction">Инструкция</option>
          <option value="warning">Предупреждение</option>
          <option value="quote">Цитата</option>
        </select>
      </Field>

      <Field label="Плотность">
        <select
          value={density}
          onChange={(event) => setDensity(event.target.value)}
          style={inputStyle}
        >
          <option value="compact">Компактный</option>
          <option value="normal">Обычный</option>
          <option value="spacious">Просторный</option>
        </select>
      </Field>

      <Field label="Ширина текста">
        <select
          value={textWidth}
          onChange={(event) => setTextWidth(event.target.value)}
          style={inputStyle}
        >
          <option value="narrow">Узкий</option>
          <option value="medium">Средний</option>
          <option value="wide">Широкий</option>
          <option value="full">На всю ширину</option>
        </select>
      </Field>

      <Field label="Размер текста">
        <input
          type="number"
          min="10"
          max="72"
          value={fontSize}
          onChange={(event) => setFontSize(event.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="Выравнивание">
        <select
          value={textAlign}
          onChange={(event) => setTextAlign(event.target.value)}
          style={inputStyle}
        >
          <option value="left">Слева</option>
          <option value="center">По центру</option>
          <option value="right">Справа</option>
        </select>
      </Field>

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

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  color: "#e5f0ff",
};

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