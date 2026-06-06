import { getColumnOptions, getOptionLabel } from "../../../fieldTypes/choice/choiceUtils.js";

function normalizeMatchToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

/**
 * @param {unknown} rawValue
 * @param {Record<string, unknown>} field
 */
export function resolveChoiceImportKey(rawValue, field) {
  const token = normalizeMatchToken(rawValue);

  if (!token) {
    return { ok: false, error: "Пустое значение" };
  }

  const options = getColumnOptions({ fieldDef: field, ...field });

  const matches = options.filter((option) => {
    const label = normalizeMatchToken(getOptionLabel(option));
    const key = normalizeMatchToken(option?.key ?? option?.value ?? option?.id ?? "");
    const name = normalizeMatchToken(option?.name ?? "");
    const title = normalizeMatchToken(option?.title ?? "");

    return (
      token === label ||
      token === key ||
      token === name ||
      token === title
    );
  });

  if (matches.length !== 1) {
    return { ok: false, error: "Вариант не найден" };
  }

  const matched = matches[0];
  const storedKey = String(
    matched?.key ?? matched?.value ?? matched?.id ?? getOptionLabel(matched) ?? "",
  ).trim();

  if (!storedKey) {
    return { ok: false, error: "Вариант не найден" };
  }

  return { ok: true, value: storedKey };
}
