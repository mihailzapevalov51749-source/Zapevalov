import DateFieldEditor from "../../../../shared/fieldEditors/editors/DateFieldEditor";
import UserFieldEditor from "../../../../shared/fieldEditors/editors/UserFieldEditor";
import { normalizeUserFieldId } from "../../../../shared/fieldEditors/userFieldValueUtils";

/**
 * @typedef {Object} TableFilterFieldOption
 * @property {string} key
 * @property {string} label
 * @property {string} fieldType
 * @property {string} [rawFieldType]
 * @property {Array<{ key: string, label: string }>} [options]
 * @property {boolean} [multiple]
 */

const BOOLEAN_FILTER_OPTIONS = [
  { key: "true", label: "Да" },
  { key: "false", label: "Нет" },
];

function normalizeChoiceOptions(fieldOption) {
  const rawOptions = fieldOption?.options || [];

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

function isChoiceLikeFieldType(fieldType, rawFieldType) {
  const normalizedType = String(fieldType || "").trim().toLowerCase();
  const normalizedRaw = String(rawFieldType || "").trim().toLowerCase();

  return (
    normalizedType === "choice" ||
    ["choice", "select", "status", "option"].includes(normalizedRaw)
  );
}

function renderTextInput({ value, onChange, placeholder, className, style, disabled }) {
  return (
    <input
      className={className}
      style={style}
      disabled={disabled}
      value={String(value ?? "")}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
    />
  );
}

export default function ObjectTableFilterValueEditor({
  fieldOption = null,
  operator = "eq",
  value,
  onChange,
  className = "designer-input",
  style = null,
  disabled = false,
}) {
  const controlStyle = style || undefined;
  const controlClassName = style ? undefined : className;
  const isListOperator = operator === "in" || operator === "not_in";
  const placeholder = isListOperator
    ? 'значение или "a,b,c"'
    : "Значение";

  if (isListOperator) {
    return renderTextInput({
      value,
      onChange,
      placeholder,
      className: controlClassName,
      style: controlStyle,
      disabled,
    });
  }

  const fieldType = String(fieldOption?.fieldType || "text").trim().toLowerCase();
  const choiceOptions = normalizeChoiceOptions(fieldOption);

  if (fieldType === "number") {
    return (
      <input
        type="number"
        className={controlClassName}
        style={controlStyle}
        disabled={disabled}
        value={value === null || value === undefined ? "" : String(value)}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
      />
    );
  }

  if (fieldType === "date") {
    return (
      <div className="ot-filters-value-editor">
        <DateFieldEditor
          inline
          includeTime={false}
          disabled={disabled}
          value={value}
          onChange={onChange}
        />
      </div>
    );
  }

  if (fieldType === "datetime") {
    return (
      <div className="ot-filters-value-editor">
        <DateFieldEditor
          inline
          includeTime
          disabled={disabled}
          value={value}
          onChange={onChange}
        />
      </div>
    );
  }

  if (fieldType === "user") {
    return (
      <div className="ot-filters-value-editor ot-filters-value-editor--user">
        <UserFieldEditor
          inline
          disabled={disabled}
          value={normalizeUserFieldId(value)}
          onChange={(nextValue) => {
            if (nextValue === null || nextValue === undefined || nextValue === "") {
              onChange?.("");
              return;
            }

            onChange?.(String(nextValue));
          }}
        />
      </div>
    );
  }

  if (fieldType === "boolean") {
    return (
      <select
        className={controlClassName}
        style={controlStyle}
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) => onChange?.(event.target.value)}
      >
        <option value="">—</option>
        {BOOLEAN_FILTER_OPTIONS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (isChoiceLikeFieldType(fieldType, fieldOption?.rawFieldType) && choiceOptions.length > 0) {
    return (
      <select
        className={controlClassName}
        style={controlStyle}
        disabled={disabled}
        value={String(value ?? "")}
        onChange={(event) => onChange?.(event.target.value)}
      >
        <option value="">—</option>
        {choiceOptions.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return renderTextInput({
    value,
    onChange,
    placeholder,
    className: controlClassName,
    style: controlStyle,
    disabled,
  });
}
