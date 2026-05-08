const API_BASE_URL = "http://127.0.0.1:8010";

export default function ButtonBlockView({ block, isEditMode, onEdit }) {
  const settings = block.settings || {};

  const showTitle = settings.show_title !== false;
  const label = showTitle ? block.title || "Кнопка" : "Кнопка";

  const url = block.content?.url || "#";
  const target = block.content?.target || "_self";

  const variant = settings.buttonVariant || settings.variant || "primary";
  const align = settings.align || "left";
  const fullWidth = settings.fullWidth === true;
  const size = settings.size || "md";

  const icon = settings.icon || "";
  const iconUrl = settings.iconUrl || "";
  const iconPosition = settings.iconPosition || "left";
  const tooltip = settings.tooltip || "";

  const customStyle = getCustomStyle(settings, variant);

  const handleEdit = (event) => {
    if (!isEditMode) return;

    event.preventDefault();
    event.stopPropagation();

    onEdit?.(block);
  };

  const handleViewClick = (event) => {
    if (isEditMode) {
      handleEdit(event);
      return;
    }

    if (!url || url === "#") {
      event.preventDefault();
    }
  };

  return (
    <div
      data-button-block-content="true"
      onClick={handleEdit}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: getAlignValue(align),
        position: "relative",
        paddingLeft: isEditMode ? 16 : 0,
        boxSizing: "border-box",
        cursor: isEditMode ? "pointer" : "default",
      }}
    >
      {isEditMode && <DragHandle />}

      <a
        href={isEditMode ? undefined : normalizeUrl(url)}
        target={isEditMode ? undefined : target}
        rel={target === "_blank" ? "noreferrer" : undefined}
        title={tooltip || undefined}
        onClick={handleViewClick}
        draggable={false}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          width: fullWidth ? "100%" : "auto",
          maxWidth: "100%",
          minWidth: 96,
          minHeight: getSizeStyle(size).minHeight,
          padding: settings.padding || getSizeStyle(size).padding,
          borderRadius: Number(settings.borderRadius ?? 10),
          fontSize: getSizeStyle(size).fontSize,
          fontWeight: Number(settings.fontWeight ?? 700),
          lineHeight: 1.2,
          textDecoration: "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          userSelect: "none",
          boxSizing: "border-box",
          cursor: "pointer",
          transition:
            "background 0.15s ease, color 0.15s ease, border 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease",
          ...getVariantStyle(variant),
          ...customStyle,
        }}
      >
        {iconPosition === "left" && (
          <ButtonIcon icon={icon} iconUrl={iconUrl} />
        )}

        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {label}
        </span>

        {iconPosition === "right" && (
          <ButtonIcon icon={icon} iconUrl={iconUrl} />
        )}
      </a>
    </div>
  );
}

function ButtonIcon({ icon, iconUrl }) {
  if (iconUrl) {
    return (
      <img
        src={normalizeUrl(iconUrl)}
        alt=""
        draggable={false}
        style={{
          width: 18,
          height: 18,
          objectFit: "contain",
          flex: "0 0 auto",
          display: "block",
        }}
      />
    );
  }

  if (icon) {
    return (
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1em",
          lineHeight: 1,
        }}
      >
        {icon}
      </span>
    );
  }

  return null;
}

function DragHandle() {
  return (
    <div
      data-block-drag-handle="true"
      title="Переместить кнопку"
      style={{
        position: "absolute",
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
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

function getCustomStyle(settings, variant) {
  const style = {};

  if (settings.backgroundColor) {
    style.background = settings.backgroundColor;
    style.boxShadow = "none";
  }

  if (settings.textColor) {
    style.color = settings.textColor;
  }

  if (settings.borderColor || settings.borderWidth !== undefined) {
    const borderWidth = Number(settings.borderWidth ?? 1);
    const borderColor =
      settings.borderColor || getVariantStyle(variant).borderColor || "#cbd5e1";

    style.border = `${borderWidth}px solid ${borderColor}`;
  }

  return style;
}

function getAlignValue(align) {
  if (align === "center") return "center";
  if (align === "right") return "flex-end";
  return "flex-start";
}

function getSizeStyle(size) {
  const sizes = {
    sm: { minHeight: 32, padding: "7px 14px", fontSize: 13 },
    md: { minHeight: 40, padding: "10px 18px", fontSize: 14 },
    lg: { minHeight: 48, padding: "13px 24px", fontSize: 16 },
  };

  return sizes[size] || sizes.md;
}

function getVariantStyle(variant) {
  const variants = {
    primary: {
      background: "#2563eb",
      color: "#ffffff",
      border: "1px solid #2563eb",
      boxShadow: "0 4px 10px rgba(37, 99, 235, 0.22)",
    },
    secondary: {
      background: "#e2e8f0",
      color: "#0f172a",
      border: "1px solid #cbd5e1",
      boxShadow: "none",
    },
    outline: {
      background: "#ffffff",
      color: "#0f172a",
      border: "1px solid #cbd5e1",
      boxShadow: "none",
    },
    ghost: {
      background: "transparent",
      color: "#2563eb",
      border: "1px solid transparent",
      boxShadow: "none",
    },
  };

  return variants[variant] || variants.primary;
}

function normalizeUrl(url) {
  if (!url) return "#";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}