const WIDGETS = [
  { type: "section", title: "Раздел", icon: "▦" },
  { type: "text", title: "Текст", icon: "T" },
  { type: "image", title: "Изображение", icon: "▧" },
  { type: "document", title: "Документ", icon: "▤" },
  { type: "link", title: "Ссылка", icon: "↗" },
  { type: "button", title: "Кнопка", icon: "●" },
  { type: "cards", title: "Карточки", icon: "▦" },
  { type: "table", title: "Таблица", icon: "▦" },
];

export default function WidgetLibrary({ onAddSection }) {
  const handleDragStart = (event, widgetType) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("widget/type", widgetType);
  };

  const handleClick = (widgetType) => {
    if (widgetType === "section") {
      onAddSection?.();
    }
  };

  return (
    <div>
      <h3
        style={{
          margin: "2px 0 14px",
          color: "#ffffff",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        Виджеты
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 10,
        }}
      >
        {WIDGETS.map((widget, index) => (
          <WidgetCard
            key={widget.type}
            widget={widget}
            active={index === 0}
            onClick={() => handleClick(widget.type)}
            onDragStart={(event) => handleDragStart(event, widget.type)}
          />
        ))}
      </div>
    </div>
  );
}

function WidgetCard({ widget, active, onClick, onDragStart }) {
  return (
    <button
      type="button"
      draggable
      onClick={onClick}
      onDragStart={onDragStart}
      style={{
        aspectRatio: "1 / 1",
        width: "100%",
        minWidth: 0,
        borderRadius: 12,
        border: active ? "1px solid #3b82f6" : "1px solid #28405f",
        background: active ? "#1e3a5f" : "#14233a",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        cursor: "grab",
        fontWeight: 600,
        boxSizing: "border-box",
        padding: 8,
        overflow: "hidden",
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "rgba(226, 232, 240, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        {widget.icon}
      </span>

      <span
        style={{
          fontSize: 8.5,
          lineHeight: 1.1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "100%",
        }}
      >
        {widget.title}
      </span>
    </button>
  );
}