import { getColumnOptions, getOptionLabel } from "../../../../fieldTypes/choice/choiceUtils.js";
import { normalizeUser } from "../../../../fieldTypes/user/userUtils.js";
import { IMPORT_VALUE_SKIP_OPTION } from "./importValueMappingConstants.js";

/**
 * @param {Record<string, unknown>} field
 */
export function getChoiceMappingOptions(field) {
  const options = getColumnOptions({ fieldDef: field, ...field });

  return (Array.isArray(options) ? options : [])
    .map((option) => {
      const value = String(
        option?.key ?? option?.value ?? option?.id ?? getOptionLabel(option) ?? "",
      ).trim();
      const label = String(getOptionLabel(option) || value).trim();

      if (!value) {
        return null;
      }

      return { value, label };
    })
    .filter(Boolean);
}

/**
 * @param {Array<Record<string, unknown>> | { items?: Array<Record<string, unknown>> }} usersList
 */
export function getUserMappingOptions(usersList) {
  const items = Array.isArray(usersList)
    ? usersList
    : Array.isArray(usersList?.items)
      ? usersList.items
      : [];

  return items
    .map((item) => {
      const normalized = normalizeUser(item);
      const userId = Number(
        normalized.userId ?? item?.user_id ?? item?.id ?? NaN,
      );

      if (!Number.isFinite(userId) || userId <= 0) {
        return null;
      }

      const label =
        normalized.name && normalized.name !== "—"
          ? normalized.name
          : String(item?.email || normalized.email || `Пользователь ${userId}`).trim();

      return {
        value: userId,
        label,
      };
    })
    .filter(Boolean);
}

/**
 * @param {Array<{ value: string | number, label: string }>} options
 */
export function withSkipMappingOption(options) {
  return [
    ...(Array.isArray(options) ? options : []),
    {
      value: IMPORT_VALUE_SKIP_OPTION,
      label: "Не импортировать значение",
    },
  ];
}
