export function getColumnOptions(column) {
  const rawOptions =
    column?.options ||
    column?.settings?.options ||
    column?.config?.options ||
    [];

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
    option.title ||
    option.name ||
    option.value ||
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
          option?.id ||
          option?.key ||
          option?.value ||
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
        option?.id ||
        option?.key ||
        option?.value ||
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