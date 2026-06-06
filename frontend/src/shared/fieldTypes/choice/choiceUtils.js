function readChoiceOptionsSource(column) {
  const fieldDef =
    column?.fieldDef && typeof column.fieldDef === "object" ? column.fieldDef : null;
  const settings =
    fieldDef?.settings && typeof fieldDef.settings === "object"
      ? fieldDef.settings
      : column?.settings && typeof column.settings === "object"
        ? column.settings
        : fieldDef?.settings_json && typeof fieldDef.settings_json === "object"
          ? fieldDef.settings_json
          : column?.settings_json && typeof column.settings_json === "object"
            ? column.settings_json
            : {};

  return (
    column?.options ||
    fieldDef?.options ||
    settings?.options ||
    column?.settings?.options ||
    column?.config?.options ||
    settings?.choices ||
    settings?.status_options ||
    settings?.statusOptions ||
    []
  );
}

export function getColumnOptions(column) {
  const rawOptions = readChoiceOptionsSource(column);

  if (!Array.isArray(rawOptions)) {
    return [];
  }

  return rawOptions;
}

export function getOptionLabel(option) {
  if (!option) {
    return "";
  }

  if (typeof option === "string") {
    return option;
  }

  return (
    option.label ||
    option.name ||
    option.title ||
    option.value ||
    option.key ||
    ""
  );
}

export function getOptionColor(option) {
  if (
    !option ||
    typeof option !== "object"
  ) {
    return "";
  }

  return (
    option.color ||
    option.background ||
    option.bg ||
    option.backgroundColor ||
    option.background_color ||
    ""
  );
}

export function normalizeChoiceValue(
  value,
  column
) {
  if (!value) {
    return {
      label: "—",
      color: "",
    };
  }

  if (Array.isArray(value)) {
    return normalizeChoiceValue(
      value[0],
      column
    );
  }

  const options =
    getColumnOptions(column);

  if (typeof value === "object") {
    const rawLabel =
      value.label ||
      value.title ||
      value.name ||
      value.displayValue ||
      value.display_value ||
      value.value ||
      "—";

    const valueId =
      value.id ||
      value.key ||
      value.value ||
      rawLabel;

    const matchedOption =
      options.find((option) => {
        const optionLabel = getOptionLabel(option);

        const optionId =
          option?.key ??
          option?.value ??
          option?.id ??
          optionLabel;

        return (
          String(optionId) === String(valueId) ||
          String(optionLabel) === String(rawLabel)
        );
      }) || null;

    return {
      label: matchedOption ? getOptionLabel(matchedOption) : rawLabel,

      color:
        getOptionColor(value) ||
        getOptionColor(matchedOption),
    };
  }

  const storedValue = String(value);

  const matchedOption =
    options.find((option) => {
      const optionLabel = getOptionLabel(option);

      const optionId =
        option?.key ??
        option?.value ??
        option?.id ??
        optionLabel;

      return (
        String(optionId) === storedValue ||
        String(optionLabel) === storedValue
      );
    }) || null;

  return {
    label: matchedOption ? getOptionLabel(matchedOption) : storedValue,

    color: getOptionColor(matchedOption),
  };
}