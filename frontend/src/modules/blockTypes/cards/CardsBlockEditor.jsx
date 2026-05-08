import { useEffect, useState } from "react";

const EMPTY_CARD = {
  title: "",
  description: "",
  url: "",
  icon: "",
};

export default function CardsBlockEditor({
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

  const [cards, setCards] = useState([EMPTY_CARD]);
  const [columns, setColumns] = useState(3);
  const [variant, setVariant] = useState("default");

  useEffect(() => {
    if (!block) return;

    const items = Array.isArray(block.content?.items)
      ? block.content.items
      : [];

    setCards(items.length ? items : [EMPTY_CARD]);
    setColumns(block.settings?.columns || 3);
    setVariant(block.settings?.cardVariant || "default");
  }, [block]);

  const updateCard = (index, field, value) => {
    setCards((current) =>
      current.map((card, cardIndex) =>
        cardIndex === index ? { ...card, [field]: value } : card
      )
    );
  };

  const addCard = () => {
    setCards((current) => [...current, { ...EMPTY_CARD }]);
  };

  const removeCard = (index) => {
    setCards((current) => current.filter((_, cardIndex) => cardIndex !== index));
  };

  const moveCard = (index, direction) => {
    setCards((current) => {
      const next = [...current];
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= next.length) return current;

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    await onSave({
      title,
      content: {
        ...(block.content || {}),
        items: cards
          .map((card) => ({
            title: card.title?.trim() || "",
            description: card.description?.trim() || "",
            url: card.url?.trim() || "",
            icon: card.icon?.trim() || "",
          }))
          .filter((card) => card.title || card.description || card.url || card.icon),
      },
      settings: {
        ...(block.settings || {}),
        show_title: showTitle,
        columns: Number(columns) || 3,
        cardVariant: variant,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>Редактирование карточек</h3>

        {onClose && (
          <button type="button" onClick={onClose} style={smallButtonStyle}>
            ×
          </button>
        )}
      </div>

      <Field label="Название блока">
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

      <Field label="Количество колонок">
        <select
          value={columns}
          onChange={(event) => setColumns(event.target.value)}
          style={inputStyle}
        >
          <option value={1}>1 колонка</option>
          <option value={2}>2 колонки</option>
          <option value={3}>3 колонки</option>
          <option value={4}>4 колонки</option>
        </select>
      </Field>

      <Field label="Стиль карточек">
        <select
          value={variant}
          onChange={(event) => setVariant(event.target.value)}
          style={inputStyle}
        >
          <option value="default">Обычные</option>
          <option value="compact">Компактные</option>
          <option value="accent">Акцентные</option>
        </select>
      </Field>

      <div style={cardsListStyle}>
        {cards.map((card, index) => (
          <div key={index} style={cardEditorStyle}>
            <div style={cardHeaderStyle}>
              <strong style={{ fontSize: 13 }}>Карточка {index + 1}</strong>

              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => moveCard(index, -1)}
                  style={miniButtonStyle}
                >
                  ↑
                </button>

                <button
                  type="button"
                  onClick={() => moveCard(index, 1)}
                  style={miniButtonStyle}
                >
                  ↓
                </button>

                <button
                  type="button"
                  onClick={() => removeCard(index)}
                  style={dangerButtonStyle}
                >
                  Удалить
                </button>
              </div>
            </div>

            <Field label="Иконка">
              <input
                value={card.icon}
                onChange={(event) => updateCard(index, "icon", event.target.value)}
                placeholder="например: 📄 или →"
                style={inputStyle}
              />
            </Field>

            <Field label="Заголовок">
              <input
                value={card.title}
                onChange={(event) => updateCard(index, "title", event.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Описание">
              <textarea
                value={card.description}
                onChange={(event) =>
                  updateCard(index, "description", event.target.value)
                }
                rows={3}
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </Field>

            <Field label="URL">
              <input
                value={card.url}
                onChange={(event) => updateCard(index, "url", event.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
            </Field>
          </div>
        ))}
      </div>

      <button type="button" onClick={addCard} style={addButtonStyle}>
        Добавить карточку
      </button>

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

const cardsListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const cardEditorStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  padding: 12,
  borderRadius: 10,
  background: "#0f1b2d",
  border: "1px solid #24364f",
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
};

const miniButtonStyle = {
  padding: "4px 7px",
  borderRadius: 6,
  border: "1px solid #334155",
  background: "#132238",
  color: "#e5f0ff",
  cursor: "pointer",
  fontSize: 12,
};

const dangerButtonStyle = {
  padding: "4px 7px",
  borderRadius: 6,
  border: "1px solid #7f1d1d",
  background: "#450a0a",
  color: "#fecaca",
  cursor: "pointer",
  fontSize: 12,
};

const addButtonStyle = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "#0f1b2d",
  color: "#e5f0ff",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
};