export default function PropertiesPanel({
  title,
  children,
  footer,
  onClose,
}) {
  return (
    <aside className="designer-properties-panel">
      <div className="designer-properties-panel__header">
        <span>{title}</span>
        {onClose ? (
          <button type="button" className="designer-btn" onClick={onClose}>
            Закрыть
          </button>
        ) : null}
      </div>
      <div className="designer-properties-panel__body">{children}</div>
      {footer ? (
        <div className="designer-properties-panel__footer">{footer}</div>
      ) : null}
    </aside>
  );
}
