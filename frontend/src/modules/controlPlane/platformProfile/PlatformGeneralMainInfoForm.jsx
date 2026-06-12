import { useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../../designer/api/platformApiClient.js";
import { showPlatformNotification } from "../../../shared/platformNotification/PlatformNotification.js";
import {
  PLATFORM_DATE_FORMAT_OPTIONS,
  PLATFORM_LANGUAGE_OPTIONS,
  PLATFORM_TIME_FORMAT_OPTIONS,
  PLATFORM_TIMEZONE_OPTIONS,
  PLATFORM_WEEK_START_OPTIONS,
} from "../../../shared/platformSettings/platformSettingsConstants.js";
import {
  fieldsColumnStyle,
  fieldLabelStyle,
  fieldWrapperStyle,
  inputStyle,
  saveButtonStyle,
  textareaStyle,
  twoColumnsStyle,
} from "../../admin/system/systemSettingsUi.jsx";
import { mapPlatformSettingsToForm } from "./platformProfileSettingsMappers.js";
import { usePlatformSettings } from "./PlatformSettingsProvider.jsx";

const REQUIRED_FIELDS = [
  ["platformName", "Название платформы"],
  ["platformShortName", "Краткое название"],
  ["timezone", "Часовой пояс"],
  ["dateFormat", "Формат даты"],
  ["timeFormat", "Формат времени"],
  ["weekStartDay", "Первый день недели"],
  ["defaultLanguage", "Язык системы по умолчанию"],
];

function SelectField({ label, value, onChange, options, hasError }) {
  return (
    <div style={fieldWrapperStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          ...inputStyle,
          ...(hasError ? { borderColor: "#DC2626" } : null),
        }}
      >
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function EditableField({ label, value, onChange, hasError, multiline = false }) {
  const sharedProps = {
    value,
    onChange: (event) => onChange(event.target.value),
    style: {
      ...(multiline ? textareaStyle : inputStyle),
      ...(hasError ? { borderColor: "#DC2626" } : null),
    },
  };

  return (
    <div style={fieldWrapperStyle}>
      <div style={fieldLabelStyle}>{label}</div>
      {multiline ? <textarea {...sharedProps} /> : <input {...sharedProps} />}
    </div>
  );
}

function validateForm(form) {
  const errors = {};

  REQUIRED_FIELDS.forEach(([key, label]) => {
    if (!String(form[key] || "").trim()) {
      errors[key] = `Заполните поле «${label}»`;
    }
  });

  return errors;
}

export default function PlatformGeneralMainInfoForm() {
  const { settings, isSaving, saveGeneralSettings } = usePlatformSettings();
  const initialForm = useMemo(() => mapPlatformSettingsToForm(settings), [settings]);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setForm(mapPlatformSettingsToForm(settings));
    setFieldErrors({});
    setSaveError("");
  }, [settings]);

  const updateField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setFieldErrors((previous) => {
      if (!previous[key]) {
        return previous;
      }
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    const errors = validateForm(form);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSaveError("Проверьте обязательные поля");
      return;
    }

    setSaveError("");

    try {
      await saveGeneralSettings(form);
      showPlatformNotification({
        message: "Общие настройки платформы сохранены",
        variant: "info",
      });
    } catch (error) {
      setSaveError(getApiErrorMessage(error, "Не удалось сохранить настройки"));
    }
  };

  return (
    <div style={fieldsColumnStyle}>
      <EditableField
        label="Название платформы"
        value={form.platformName}
        onChange={(value) => updateField("platformName", value)}
        hasError={Boolean(fieldErrors.platformName)}
      />
      <EditableField
        label="Краткое название"
        value={form.platformShortName}
        onChange={(value) => updateField("platformShortName", value)}
        hasError={Boolean(fieldErrors.platformShortName)}
      />
      <EditableField
        label="Описание"
        value={form.description}
        onChange={(value) => updateField("description", value)}
        multiline
      />
      <SelectField
        label="Часовой пояс"
        value={form.timezone}
        onChange={(value) => updateField("timezone", value)}
        options={PLATFORM_TIMEZONE_OPTIONS}
        hasError={Boolean(fieldErrors.timezone)}
      />
      <div style={twoColumnsStyle}>
        <SelectField
          label="Формат даты"
          value={form.dateFormat}
          onChange={(value) => updateField("dateFormat", value)}
          options={PLATFORM_DATE_FORMAT_OPTIONS}
          hasError={Boolean(fieldErrors.dateFormat)}
        />
        <SelectField
          label="Формат времени"
          value={form.timeFormat}
          onChange={(value) => updateField("timeFormat", value)}
          options={PLATFORM_TIME_FORMAT_OPTIONS}
          hasError={Boolean(fieldErrors.timeFormat)}
        />
      </div>
      <div style={twoColumnsStyle}>
        <SelectField
          label="Первый день недели"
          value={form.weekStartDay}
          onChange={(value) => updateField("weekStartDay", value)}
          options={PLATFORM_WEEK_START_OPTIONS}
          hasError={Boolean(fieldErrors.weekStartDay)}
        />
        <SelectField
          label="Язык системы по умолчанию"
          value={form.defaultLanguage}
          onChange={(value) => updateField("defaultLanguage", value)}
          options={PLATFORM_LANGUAGE_OPTIONS}
          hasError={Boolean(fieldErrors.defaultLanguage)}
        />
      </div>

      {saveError ? (
        <div style={{ fontSize: 12, color: "#DC2626" }}>{saveError}</div>
      ) : null}

      <button
        type="button"
        style={{
          ...saveButtonStyle,
          opacity: isSaving ? 0.7 : 1,
          cursor: isSaving ? "wait" : "pointer",
        }}
        disabled={isSaving}
        onClick={handleSave}
      >
        {isSaving ? "Сохранение..." : "Сохранить изменения"}
      </button>
    </div>
  );
}
