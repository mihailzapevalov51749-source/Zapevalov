const DEFAULT_THEME = {
  headerColor: "#ffffff",
  leftMenuColor: "#f8fafc",
  rightMenuColor: "#f8fafc",
  pageBackgroundColor: "#ffffff",
};

export default function ThemeEditor({ theme = DEFAULT_THEME, onChangeTheme }) {
  const currentTheme = {
    ...DEFAULT_THEME,
    ...theme,
  };

  const updateTheme = (key, value) => {
    onChangeTheme?.({
      ...currentTheme,
      [key]: value,
    });
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ThemeField
        label="Цвет шапки"
        value={currentTheme.headerColor}
        onChange={(value) => updateTheme("headerColor", value)}
      />

      <ThemeField
        label="Цвет левого меню"
        value={currentTheme.leftMenuColor}
        onChange={(value) => updateTheme("leftMenuColor", value)}
      />

      <ThemeField
        label="Цвет правого меню"
        value={currentTheme.rightMenuColor}
        onChange={(value) => updateTheme("rightMenuColor", value)}
      />

      <ThemeField
        label="Цвет фона страницы"
        value={currentTheme.pageBackgroundColor}
        onChange={(value) => updateTheme("pageBackgroundColor", value)}
      />
    </div>
  );
}

function ThemeField({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "grid",
        gap: 6,
        fontSize: 12,
        color: "#64748b",
      }}
    >
      {label}

      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 34,
          padding: 0,
          border: "1px solid #cbd5e1",
          borderRadius: 8,
          background: "#ffffff",
          cursor: "pointer",
        }}
      />
    </label>
  );
}