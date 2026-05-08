import { useEffect, useState } from "react";

export default function ButtonBlockEditor({
  block,
  title,
  setTitle,
  showTitle,
  setShowTitle,
  onSave,
  onClose,
  styles,
  uploadFile,
}) {
  const {
    inputStyle,
    colorInputStyle,
    checkboxStyle,
    saveButtonStyle,
    smallButtonStyle,
    dangerSmallButtonStyle,
  } = styles;

  const [url, setUrl] = useState("");
  const [buttonVariant, setButtonVariant] = useState("primary");
  const [buttonSize, setButtonSize] = useState("md");
  const [buttonAlign, setButtonAlign] = useState("left");
  const [buttonFullWidth, setButtonFullWidth] = useState(false);
  const [buttonTarget, setButtonTarget] = useState("_self");

  const [backgroundColor, setBackgroundColor] = useState("");
  const [textColor, setTextColor] = useState("");
  const [borderColor, setBorderColor] = useState("");
  const [borderWidth, setBorderWidth] = useState(1);
  const [borderRadius, setBorderRadius] = useState(10);
  const [fontWeight, setFontWeight] = useState(700);
  const [padding, setPadding] = useState("");

  const [icon, setIcon] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [iconName, setIconName] = useState("");
  const [selectedIconFile, setSelectedIconFile] = useState(null);
  const [iconPosition, setIconPosition] = useState("left");
  const [tooltip, setTooltip] = useState("");

  useEffect(() => {
    if (!block) return;

    setUrl(block.content?.url || "");
    setButtonTarget(block.content?.target || "_self");

    setButtonVariant(
      block.settings?.buttonVariant || block.settings?.variant || "primary"
    );
    setButtonSize(block.settings?.size || "md");
    setButtonAlign(block.settings?.align || "left");
    setButtonFullWidth(block.settings?.fullWidth === true);

    setBackgroundColor(block.settings?.backgroundColor || "");
    setTextColor(block.settings?.textColor || "");
    setBorderColor(block.settings?.borderColor || "");
    setBorderWidth(block.settings?.borderWidth ?? 1);
    setBorderRadius(block.settings?.borderRadius ?? 10);
    setFontWeight(block.settings?.fontWeight ?? 700);
    setPadding(block.settings?.padding || "");

    setIcon(block.settings?.icon || "");
    setIconUrl(block.settings?.iconUrl || "");
    setIconName(block.settings?.iconName || "");
    setSelectedIconFile(null);
    setIconPosition(block.settings?.iconPosition || "left");
    setTooltip(block.settings?.tooltip || "");
  }, [block]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    let finalIconUrl = iconUrl;
    let finalIconName = iconName;

    if (selectedIconFile) {
      finalIconUrl = await uploadFile(selectedIconFile, "image");
      finalIconName = selectedIconFile.name;
    }

    const nextSettings = {
      ...(block.settings || {}),
      show_title: showTitle,

      buttonVariant,
      size: buttonSize,
      align: buttonAlign,
      fullWidth: buttonFullWidth,

      backgroundColor,
      textColor,
      borderColor,
      borderWidth: Number(borderWidth) || 0,
      borderRadius: Number(borderRadius) || 0,
      fontWeight: Number(fontWeight) || 700,
      padding,

      icon,
      iconUrl: finalIconUrl,
      iconName: finalIconName,
      iconPosition,
      tooltip,
    };

    delete nextSettings.image_height;
    delete nextSettings.image_fit;

    await onSave({
      title,
      content: {
        ...(block.content || {}),
        url,
        target: buttonTarget,
      },
      settings: nextSettings,
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
      <div style={headerStyle}>
        <h3 style={titleStyle}>Редактирование кнопки</h3>

        {onClose && (
          <button type="button" onClick={onClose} style={smallButtonStyle}>
            ×
          </button>
        )}
      </div>

      <Field label="Название кнопки">
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
        Показывать название кнопки
      </label>

      <Field label="URL">
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://..."
          style={inputStyle}
        />
      </Field>

      <Field label="Открытие">
        <select
          value={buttonTarget}
          onChange={(event) => setButtonTarget(event.target.value)}
          style={inputStyle}
        >
          <option value="_self">В этой вкладке</option>
          <option value="_blank">В новой вкладке</option>
        </select>
      </Field>

      <Field label="Стиль кнопки">
        <select
          value={buttonVariant}
          onChange={(event) => setButtonVariant(event.target.value)}
          style={inputStyle}
        >
          <option value="primary">Основная</option>
          <option value="secondary">Вторичная</option>
          <option value="outline">Контурная</option>
          <option value="ghost">Прозрачная</option>
        </select>
      </Field>

      <Field label="Размер кнопки">
        <select
          value={buttonSize}
          onChange={(event) => setButtonSize(event.target.value)}
          style={inputStyle}
        >
          <option value="sm">Маленькая</option>
          <option value="md">Средняя</option>
          <option value="lg">Большая</option>
        </select>
      </Field>

      <Field label="Выравнивание">
        <select
          value={buttonAlign}
          onChange={(event) => setButtonAlign(event.target.value)}
          style={inputStyle}
        >
          <option value="left">Слева</option>
          <option value="center">По центру</option>
          <option value="right">Справа</option>
        </select>
      </Field>

      <label style={checkboxStyle}>
        <input
          type="checkbox"
          checked={buttonFullWidth}
          onChange={(event) => setButtonFullWidth(event.target.checked)}
        />
        На всю ширину блока
      </label>

      <Divider title="Внешний вид" />

      <ColorField
        label="Цвет фона"
        value={backgroundColor}
        fallback="#2563eb"
        onChange={setBackgroundColor}
        inputStyle={inputStyle}
        colorInputStyle={colorInputStyle}
      />

      <ColorField
        label="Цвет текста"
        value={textColor}
        fallback="#ffffff"
        onChange={setTextColor}
        inputStyle={inputStyle}
        colorInputStyle={colorInputStyle}
      />

      <ColorField
        label="Цвет рамки"
        value={borderColor}
        fallback="#2563eb"
        onChange={setBorderColor}
        inputStyle={inputStyle}
        colorInputStyle={colorInputStyle}
      />

      <Field label="Толщина рамки">
        <input
          type="number"
          min="0"
          max="10"
          value={borderWidth}
          onChange={(event) => setBorderWidth(event.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="Радиус скругления">
        <input
          type="number"
          min="0"
          max="60"
          value={borderRadius}
          onChange={(event) => setBorderRadius(event.target.value)}
          style={inputStyle}
        />
      </Field>

      <Field label="Жирность текста">
        <select
          value={fontWeight}
          onChange={(event) => setFontWeight(event.target.value)}
          style={inputStyle}
        >
          <option value={400}>Обычный</option>
          <option value={500}>Средний</option>
          <option value={600}>Полужирный</option>
          <option value={700}>Жирный</option>
          <option value={800}>Очень жирный</option>
        </select>
      </Field>

      <Field label="Внутренние отступы">
        <input
          value={padding}
          onChange={(event) => setPadding(event.target.value)}
          placeholder="например: 10px 18px"
          style={inputStyle}
        />
      </Field>

      <Divider title="Иконка и подсказка" />

      <Field label="Иконка из файла">
        <input
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.gif,image/png,image/jpeg,image/svg+xml,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            setSelectedIconFile(file);
            setIconName(file.name);
          }}
          style={{ color: "#cbd5e1", fontSize: 12 }}
        />
      </Field>

      {(iconUrl || iconName || selectedIconFile) && (
        <div style={iconPreviewBoxStyle}>
          {iconUrl && !selectedIconFile ? (
            <img
              src={normalizePreviewUrl(iconUrl)}
              alt=""
              style={iconPreviewImageStyle}
            />
          ) : (
            <div style={iconPreviewPlaceholderStyle} />
          )}

          <div style={iconPreviewTextStyle}>
            {selectedIconFile?.name || iconName || iconUrl}
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedIconFile(null);
              setIconUrl("");
              setIconName("");
            }}
            style={dangerSmallButtonStyle}
          >
            Удалить
          </button>
        </div>
      )}

      <Field label="Текстовая иконка, если файл не загружен">
        <input
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
          placeholder="например: → или ↗"
          style={inputStyle}
        />
      </Field>

      <Field label="Положение иконки">
        <select
          value={iconPosition}
          onChange={(event) => setIconPosition(event.target.value)}
          style={inputStyle}
        >
          <option value="left">Слева</option>
          <option value="right">Справа</option>
        </select>
      </Field>

      <Field label="Подсказка при наведении">
        <input
          value={tooltip}
          onChange={(event) => setTooltip(event.target.value)}
          placeholder="Текст при наведении"
          style={inputStyle}
        />
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

function Divider({ title }) {
  return (
    <div
      style={{
        marginTop: 4,
        paddingTop: 10,
        borderTop: "1px solid #24364f",
        color: "#93c5fd",
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {title}
    </div>
  );
}

function ColorField({
  label,
  value,
  fallback,
  onChange,
  inputStyle,
  colorInputStyle,
}) {
  return (
    <Field label={label}>
      <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 8 }}>
        <input
          type="color"
          value={value || fallback}
          onChange={(event) => onChange(event.target.value)}
          style={colorInputStyle}
        />

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={fallback}
          style={inputStyle}
        />
      </div>
    </Field>
  );
}

function normalizePreviewUrl(url) {
  const API_BASE_URL = "http://127.0.0.1:8010";

  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}

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

const iconPreviewBoxStyle = {
  display: "grid",
  gridTemplateColumns: "32px 1fr auto",
  alignItems: "center",
  gap: 8,
  padding: 10,
  borderRadius: 8,
  background: "#0f1b2d",
  border: "1px solid #24364f",
};

const iconPreviewImageStyle = {
  width: 24,
  height: 24,
  objectFit: "contain",
};

const iconPreviewPlaceholderStyle = {
  width: 24,
  height: 24,
  borderRadius: 6,
  background: "#1e293b",
};

const iconPreviewTextStyle = {
  color: "#94a3b8",
  fontSize: 12,
  overflowWrap: "anywhere",
};