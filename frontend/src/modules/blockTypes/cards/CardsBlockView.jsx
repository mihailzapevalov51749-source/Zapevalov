const API_BASE_URL = "http://127.0.0.1:8010";

export default function CardsBlockView({ block, isEditMode, onEdit }) {
  const settings = block.settings || {};
  const content = block.content || {};

  const showTitle = settings.show_title !== false;
  const title = block.title || "Карточки";

  const cards = Array.isArray(content.items) ? content.items : [];
  const columns = Number(settings.columns || 3);
  const variant = settings.cardVariant || "default";

  const handleEdit = (event) => {
    if (!isEditMode) return;

    event.preventDefault();
    event.stopPropagation();

    onEdit?.(block);
  };

  return (
    <div
      data-cards-block-content="true"
      onClick={handleEdit}
      style={{
        width: "100%",
        height: "100%",
        cursor: isEditMode ? "pointer" : "default",
        boxSizing: "border-box",
      }}
    >
      {showTitle && (
        <h3
          style={{
            margin: "0 0 12px",
            fontSize: 16,
            fontWeight: 700,
            color: "#0f172a",
          }}
        >
          {title}
        </h3>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: 12,
        }}
      >
        {cards.map((card, index) => (
          <CardItem
            key={index}
            card={card}
            variant={variant}
            isEditMode={isEditMode}
          />
        ))}
      </div>
    </div>
  );
}

function CardItem({ card, variant, isEditMode }) {
  const url = card.url || "";
  const isClickable = Boolean(url) && !isEditMode;

  const content = (
    <div style={getCardStyle(variant, isClickable)}>
      {card.icon && (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: getIconBackground(variant),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            marginBottom: 10,
            flex: "0 0 auto",
          }}
        >
          {card.icon}
        </div>
      )}

      {card.title && (
        <div
          style={{
            fontSize: variant === "compact" ? 13 : 14,
            fontWeight: 700,
            color: getTitleColor(variant),
            marginBottom: card.description ? 6 : 0,
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {card.title}
        </div>
      )}

      {card.description && (
        <div
          style={{
            fontSize: 12,
            color: getDescriptionColor(variant),
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: variant === "compact" ? 2 : 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {card.description}
        </div>
      )}
    </div>
  );

  if (isClickable) {
    return (
      <a
        href={normalizeUrl(url)}
        target={url.startsWith("http") ? "_blank" : "_self"}
        rel={url.startsWith("http") ? "noreferrer" : undefined}
        draggable={false}
        style={{
          textDecoration: "none",
          color: "inherit",
          minWidth: 0,
        }}
      >
        {content}
      </a>
    );
  }

  return content;
}

function getCardStyle(variant, isClickable) {
  const base = {
    minHeight: variant === "compact" ? 92 : 128,
    padding: variant === "compact" ? 12 : 16,
    borderRadius: 14,
    boxSizing: "border-box",
    transition:
      "transform 0.15s ease, box-shadow 0.15s ease, border 0.15s ease",
    cursor: isClickable ? "pointer" : "default",
    overflow: "hidden",
  };

  const variants = {
    default: {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
    },
    compact: {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      boxShadow: "none",
    },
    accent: {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      boxShadow: "0 4px 12px rgba(37, 99, 235, 0.10)",
    },
  };

  return {
    ...base,
    ...(variants[variant] || variants.default),
  };
}

function getIconBackground(variant) {
  if (variant === "accent") return "#dbeafe";
  return "#f1f5f9";
}

function getTitleColor(variant) {
  if (variant === "accent") return "#1d4ed8";
  return "#0f172a";
}

function getDescriptionColor() {
  return "#64748b";
}

function normalizeUrl(url) {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}