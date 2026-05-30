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
    const label =
      value.label ||
      value.title ||
      value.name ||
      value.value ||
      "—";

    const valueId =
      value.id ||
      value.key ||
      value.value ||
      label;

    const matchedOption =
      options.find((option) => {
        const optionLabel =
          getOptionLabel(option);

        const optionId =
          option?.id ||
          option?.key ||
          option?.value ||
          optionLabel;

        return (
          String(optionId) ===
            String(valueId) ||
          String(optionLabel) ===
            String(label)
        );
      }) || null;

    return {
      label,

      color:
        getOptionColor(value) ||
        getOptionColor(
          matchedOption
        ),
    };
  }

  const label = String(value);

  const matchedOption =
    options.find((option) => {
      const optionLabel =
        getOptionLabel(option);

      const optionId =
        option?.id ||
        option?.key ||
        option?.value ||
        optionLabel;

      return (
        String(optionId) ===
          label ||
        String(optionLabel) ===
          label
      );
    }) || null;

  return {
    label,

    color:
      getOptionColor(
        matchedOption
      ),
  };
}