import { useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../designer/api/platformApiClient.js";
import { showPlatformNotification } from "../../shared/platformNotification/PlatformNotification.js";
import {
  PLATFORM_DATE_FORMAT_OPTIONS,
  PLATFORM_LANGUAGE_OPTIONS,
  PLATFORM_TIME_FORMAT_OPTIONS,
  PLATFORM_TIMEZONE_OPTIONS,
  PLATFORM_WEEK_START_OPTIONS,
} from "../../shared/platformSettings/platformSettingsConstants.js";
import {
  fieldsColumnStyle,
  fieldLabelStyle,
  fieldWrapperStyle,
  inputStyle,
  saveButtonStyle,
  textareaStyle,
  twoColumnsStyle,
} from "../admin/system/systemSettingsUi.jsx";
import { mapPlatformSettingsToForm } from "../controlPlane/platformProfile/platformProfileSettingsMappers.js";
import { useProfile } from "./ProfileContext.jsx";
import { isProfileModePlatform } from "./profileMode.js";
import {
  buildPublicCompanyUrl,
} from "../../shared/tenantContext/publicSlug.js";
import { applyProfileGeneralSlugSync } from "./profileGeneralSlugSync.js";

function buildRequiredFields(labels) {
  return [
    ["platformName", labels.platformName],
    ["platformShortName", labels.shortName],
    ["publicSlug", labels.publicSlug],
    ["timezone", "Часовой пояс"],
    ["dateFormat", "Формат даты"],
    ["timeFormat", "Формат времени"],
    ["weekStartDay", "Первый день недели"],
    ["defaultLanguage", "Язык системы по умолчанию"],
  ];
}

function SelectField({ label, value, onChange, options, hasError, readOnly = false }) {
  if (readOnly) {
    return (
      <div style={fieldWrapperStyle}>
        <div style={fieldLabelStyle}>{label}</div>
        <input value={value} readOnly style={inputStyle} />
      </div>
    );
  }

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

function EditableField({
  label,
  value,
  onChange,
  hasError,
  multiline = false,
  readOnly = false,
}) {
  const sharedProps = {
    value,
    readOnly,
    onChange: readOnly ? undefined : (event) => onChange(event.target.value),
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

function validateForm(form, labels) {
  const errors = {};

  buildRequiredFields(labels).forEach(([key, label]) => {
    if (!String(form[key] || "").trim()) {
      errors[key] = `Заполните поле «${label}»`;
    }
  });

  return errors;
}

export default function ProfileGeneralMainInfoForm() {
  const {
    mode,
    labels,
    settings,
    profileSettings,
    isSaving,
    canEditGeneral,
    saveGeneralSettings,
  } = useProfile();
  const isPlatform = isProfileModePlatform(mode);
  const initialForm = useMemo(() => {
    if (isPlatform) {
      return mapPlatformSettingsToForm(settings);
    }

    return {
      platformName: profileSettings?.general?.name || "",
      platformShortName: profileSettings?.general?.shortName || "",
      publicSlug: profileSettings?.general?.publicSlug || "",
      publicSlugLocked: Boolean(profileSettings?.general?.publicSlugLocked),
      description: profileSettings?.general?.description || "",
      timezone: profileSettings?.general?.timezone || "",
      dateFormat: profileSettings?.general?.dateFormat || "",
      timeFormat: profileSettings?.general?.timeFormat || "",
      weekStartDay: profileSettings?.general?.weekStart || "",
      defaultLanguage: profileSettings?.general?.language || "",
    };
  }, [isPlatform, profileSettings, settings]);

  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const readOnly = !canEditGeneral;

  useEffect(() => {
    setForm(initialForm);
    setFieldErrors({});
    setSaveError("");
  }, [initialForm]);

  const updateField = (key, value) => {
    setForm((previous) => applyProfileGeneralSlugSync(previous, key, value));
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
    const errors = validateForm(form, labels);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSaveError("Проверьте обязательные поля");
      return;
    }

    setSaveError("");

    try {
      await saveGeneralSettings(form);
      showPlatformNotification({
        message: isPlatform
          ? "Общие настройки платформы сохранены"
          : "Общие настройки компании сохранены",
        variant: "info",
      });
    } catch (error) {
      setSaveError(getApiErrorMessage(error, "Не удалось сохранить настройки"));
    }
  };

  return (
    <div style={fieldsColumnStyle}>
      <EditableField
        label={labels.platformName}
        value={form.platformName}
        onChange={(value) => updateField("platformName", value)}
        hasError={Boolean(fieldErrors.platformName)}
        readOnly={readOnly}
      />
      <EditableField
        label={labels.shortName}
        value={form.platformShortName}
        onChange={(value) => updateField("platformShortName", value)}
        hasError={Boolean(fieldErrors.platformShortName)}
        readOnly={readOnly}
      />
      <EditableField
        label={labels.publicSlug}
        value={form.publicSlug}
        onChange={(value) => updateField("publicSlug", value)}
        hasError={Boolean(fieldErrors.publicSlug)}
        readOnly={readOnly}
      />
      <EditableField
        label={labels.publicUrl}
        value={buildPublicCompanyUrl(form.publicSlug)}
        readOnly
      />
      <EditableField
        label={labels.description}
        value={form.description}
        onChange={(value) => updateField("description", value)}
        multiline
        readOnly={readOnly}
      />
      <SelectField
        label="Часовой пояс"
        value={form.timezone}
        onChange={(value) => updateField("timezone", value)}
        options={PLATFORM_TIMEZONE_OPTIONS}
        hasError={Boolean(fieldErrors.timezone)}
        readOnly={readOnly}
      />
      <div style={twoColumnsStyle}>
        <SelectField
          label="Формат даты"
          value={form.dateFormat}
          onChange={(value) => updateField("dateFormat", value)}
          options={PLATFORM_DATE_FORMAT_OPTIONS}
          hasError={Boolean(fieldErrors.dateFormat)}
          readOnly={readOnly}
        />
        <SelectField
          label="Формат времени"
          value={form.timeFormat}
          onChange={(value) => updateField("timeFormat", value)}
          options={PLATFORM_TIME_FORMAT_OPTIONS}
          hasError={Boolean(fieldErrors.timeFormat)}
          readOnly={readOnly}
        />
      </div>
      <div style={twoColumnsStyle}>
        <SelectField
          label="Первый день недели"
          value={form.weekStartDay}
          onChange={(value) => updateField("weekStartDay", value)}
          options={PLATFORM_WEEK_START_OPTIONS}
          hasError={Boolean(fieldErrors.weekStartDay)}
          readOnly={readOnly}
        />
        <SelectField
          label="Язык системы по умолчанию"
          value={form.defaultLanguage}
          onChange={(value) => updateField("defaultLanguage", value)}
          options={PLATFORM_LANGUAGE_OPTIONS}
          hasError={Boolean(fieldErrors.defaultLanguage)}
          readOnly={readOnly}
        />
      </div>

      {saveError ? (
        <div style={{ fontSize: 12, color: "#DC2626" }}>{saveError}</div>
      ) : null}

      {!readOnly ? (
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
          {isSaving ? "Сохранение..." : labels.saveChanges}
        </button>
      ) : null}
    </div>
  );
}
