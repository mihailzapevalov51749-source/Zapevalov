export default function BlockStyleToolbar({
  settings = {},
  appearance = {},
  onBackground,
  onBorder,
  onShadow,
  onDensityChange,
  onVariantChange,
}) {
  const backgroundActive =
    appearance.viewMode?.backgroundEnabled ??
    appearance.backgroundEnabled ??
    settings.showBackground !== false;

  const borderActive =
    appearance.viewMode?.borderEnabled ??
    appearance.borderEnabled ??
    settings.showBackground !== false;

  const shadowActive = appearance.shadowEnabled ?? false;

  return (
    <>
      <ToolbarButton active={backgroundActive} onClick={onBackground}>
        BG
      </ToolbarButton>

      <ToolbarButton active={borderActive} onClick={onBorder}>
        BR
      </ToolbarButton>

      <ToolbarButton active={shadowActive} onClick={onShadow}>
        SH
      </ToolbarButton>

      <select
        value={settings.density || "normal"}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => onDensityChange?.(event.target.value)}
        style={selectStyle}
      >
        <option value="compact">Плотно</option>
        <option value="normal">Нормально</option>
        <option value="spacious">Свободно</option>
      </select>

      <select
        value={settings.variant || "default"}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => onVariantChange?.(event.target.value)}
        style={selectStyle}
      >
        <option value="default">Обычный</option>
        <option value="clean">Чистый</option>
        <option value="card">Карточка</option>
        <option value="accent">Акцент</option>
        <option value="instruction">Инструкция</option>
        <option value="warning">Предупреждение</option>
        <option value="quote">Цитата</option>
      </select>
    </>
  );
}

function ToolbarButton({ children, active = false, onClick }) {
  return (
    <button
      type="button"
      data-inline-editor="true"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick?.();
      }}
      style={{
        minWidth: 28,
        height: 28,
        padding: "0 8px",
        borderRadius: 6,
        border: active ? "1px solid #2563eb" : "1px solid #cbd5e1",
        background: active ? "#dbeafe" : "#ffffff",
        color: active ? "#1d4ed8" : "#0f172a",
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {children}
    </button>
  );
}

const selectStyle = {
  height: 28,
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  fontSize: 12,
  color: "#0f172a",
  padding: "0 8px",
  cursor: "pointer",
};