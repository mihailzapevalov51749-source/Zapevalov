export default function PropertiesPanel({
  title,
  children,
  footer,
  onClose,
  className = "",
  closeVariant = "text",
}) {
  const panelClassName = ["designer-properties-panel", className].filter(Boolean).join(" ");

  return (
    <aside className={panelClassName}>
      <div className="designer-properties-panel__header">
        <span className="designer-properties-panel__title">{title}</span>
        {onClose ? (
          closeVariant === "icon" ? (
            <button
              type="button"
              className="designer-properties-panel__close"
              onClick={onClose}
              aria-label="Закрыть"
              title="Закрыть"
            >
              ×
            </button>
          ) : (
            <button type="button" className="designer-btn" onClick={onClose}>
              Закрыть
            </button>
          )
        ) : null}
      </div>
      <div className="designer-properties-panel__body">{children}</div>
      {footer ? (
        <div className="designer-properties-panel__footer">{footer}</div>
      ) : null}
    </aside>
  );
}
