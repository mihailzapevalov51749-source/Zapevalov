import { fieldEditorInputStyle } from "../fieldEditorStyles";

function normalizeOptions(column) {
  const rawOptions = column?.options || column?.settings?.options || [];

  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions
    .map((option, index) => {
      if (typeof option === "string") {
        return {
          key: option,
          label: option,
        };
      }

      const key = String(
        option?.key ?? option?.id ?? option?.value ?? `option-${index}`,
      );

      return {
        key,
        label: String(option?.label ?? option?.name ?? option?.title ?? key),
      };
    })
    .filter((option) => option.key.trim());
}

export default function ChoiceFieldEditor({
  column,
  value,
  onChange,
  readOnly = false,
  autoFocus = false,
}) {
  const options = normalizeOptions(column);
  const isMultiple = Boolean(column?.multiple);

  if (isMultiple) {
    const selected = Array.isArray(value) ? value.map(String) : [];

    const handleToggle = (optionKey) => {
      const normalizedKey = String(optionKey);

      if (selected.includes(normalizedKey)) {
        onChange?.(selected.filter((item) => item !== normalizedKey));
        return;
      }

      onChange?.([...selected, normalizedKey]);
    };

    return (
      <div
        className="field-editor-choice-multi"
        style={{ display: "flex", flexDirection: "column", gap: 6 }}
      >
        {options.length === 0 ? (
          <span style={{ fontSize: 13, color: "#64748b" }}>Нет вариантов</span>
        ) : (
          options.map((option) => (
            <label
              key={option.key}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}
            >
              <input
                type="checkbox"
                checked={selected.includes(option.key)}
                disabled={readOnly}
                onChange={() => handleToggle(option.key)}
              />
              {option.label}
            </label>
          ))
        )}
      </div>
    );
  }

  return (
    <select
      className="field-editor-input"
      value={value != null && value !== "" ? String(value) : ""}
      disabled={readOnly}
      autoFocus={autoFocus}
      onChange={(event) => {
        const next = event.target.value;
        onChange?.(next === "" ? "" : next);
      }}
      style={fieldEditorInputStyle}
    >
      <option value="">—</option>
      {options.map((option) => (
        <option key={option.key} value={option.key}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
