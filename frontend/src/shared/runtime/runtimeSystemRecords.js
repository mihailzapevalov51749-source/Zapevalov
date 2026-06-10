import { SYSTEM_ENTITY_FIELD_KEYS } from "./systemEntityFields.js";

export function isRuntimeSystemEntity(entity) {
  if (!entity || typeof entity !== "object") {
    return false;
  }

  if (entity.is_system === true || entity.isSystem === true) {
    return true;
  }

  const values = entity.values && typeof entity.values === "object" ? entity.values : null;

  if (values) {
    const systemFlag =
      values[SYSTEM_ENTITY_FIELD_KEYS.isSystem] ??
      values.__system_is_system ??
      values.is_system;

    if (systemFlag === true) {
      return true;
    }
  }

  return false;
}

export function filterUserVisibleRuntimeEntities(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter((item) => !isRuntimeSystemEntity(item));
}
