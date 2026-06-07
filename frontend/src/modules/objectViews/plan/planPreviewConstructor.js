/**
 * Reorder infoFieldKeys array (Info tab field order).
 *
 * @param {string[]} infoFieldKeys
 * @param {string} sourceKey
 * @param {string} targetKey
 * @param {"before" | "after"} [position]
 */
export function reorderPlanInfoFieldKeys(
  infoFieldKeys = [],
  sourceKey,
  targetKey,
  position = "before",
) {
  const normalizedSource = String(sourceKey || "").trim();
  const normalizedTarget = String(targetKey || "").trim();

  if (!normalizedSource || !normalizedTarget || normalizedSource === normalizedTarget) {
    return [...infoFieldKeys];
  }

  const list = [...infoFieldKeys];
  const fromIndex = list.indexOf(normalizedSource);
  const targetIndex = list.indexOf(normalizedTarget);

  if (fromIndex < 0 || targetIndex < 0) {
    return list;
  }

  list.splice(fromIndex, 1);

  let insertIndex = list.indexOf(normalizedTarget);

  if (insertIndex < 0) {
    return list;
  }

  if (position === "after") {
    insertIndex += 1;
  }

  list.splice(insertIndex, 0, normalizedSource);

  return list;
}

/**
 * Resolved info-field keys for Studio draft projection (snake_case).
 *
 * @param {Record<string, unknown> | null | undefined} projection
 */
export function resolveStudioDraftInfoFieldKeys(projection) {
  if (!projection || typeof projection !== "object") {
    return [];
  }

  const visible = (projection.visible_fields || [])
    .map((key) => String(key || "").trim())
    .filter(Boolean);
  const visibleSet = new Set(visible);

  if (Array.isArray(projection.info_field_keys)) {
    return projection.info_field_keys
      .map((key) => String(key || "").trim())
      .filter((key) => key && visibleSet.has(key));
  }

  const titleField = String(projection.title_field || "").trim();

  return visible.filter((key) => key !== titleField);
}

/**
 * @param {Record<string, unknown>} projection
 * @param {string} fieldKey
 */
export function hideStudioDraftProjectionField(projection, fieldKey) {
  const normalizedKey = String(fieldKey || "").trim();

  if (!normalizedKey) {
    return projection;
  }

  const visible = new Set(
    (projection.visible_fields || []).map((key) => String(key || "").trim()).filter(Boolean),
  );

  if (!visible.has(normalizedKey)) {
    return projection;
  }

  visible.delete(normalizedKey);

  return {
    ...projection,
    visible_fields: [...visible],
    field_order: (projection.field_order || [])
      .map((key) => String(key || "").trim())
      .filter((key) => key && visible.has(key)),
    info_field_keys: resolveStudioDraftInfoFieldKeys(projection).filter(
      (key) => key !== normalizedKey,
    ),
  };
}

/**
 * @param {Record<string, unknown>} projection
 * @param {string} fieldKey
 */
export function toggleStudioDraftProjectionInfoField(projection, fieldKey) {
  const normalizedKey = String(fieldKey || "").trim();

  if (!normalizedKey) {
    return projection;
  }

  const visibleSet = new Set(
    (projection.visible_fields || []).map((key) => String(key || "").trim()).filter(Boolean),
  );

  if (!visibleSet.has(normalizedKey)) {
    return projection;
  }

  const currentInfoKeys = resolveStudioDraftInfoFieldKeys(projection);

  if (currentInfoKeys.includes(normalizedKey)) {
    return {
      ...projection,
      info_field_keys: currentInfoKeys.filter((key) => key !== normalizedKey),
    };
  }

  return {
    ...projection,
    info_field_keys: [...currentInfoKeys, normalizedKey],
  };
}

/**
 * @param {Record<string, unknown>} projection
 * @param {string} sourceKey
 * @param {string} targetKey
 * @param {"before" | "after"} [position]
 */
export function reorderStudioDraftProjectionInfoFieldKeys(
  projection,
  sourceKey,
  targetKey,
  position = "before",
) {
  const currentInfoKeys = resolveStudioDraftInfoFieldKeys(projection);

  return {
    ...projection,
    info_field_keys: reorderPlanInfoFieldKeys(
      currentInfoKeys,
      sourceKey,
      targetKey,
      position,
    ),
  };
}

/**
 * @deprecated Prefer reorderPlanInfoFieldKeys — kept for legacy callers.
 */
export function reorderPlanInfoFieldsInFieldOrder(
  fieldOrder = [],
  infoFieldKeys = [],
  sourceKey,
  targetKey,
  position = "before",
) {
  const normalizedSource = String(sourceKey || "").trim();
  const normalizedTarget = String(targetKey || "").trim();

  if (!normalizedSource || !normalizedTarget || normalizedSource === normalizedTarget) {
    return [...fieldOrder];
  }

  const infoSet = new Set(
    (infoFieldKeys || []).map((key) => String(key || "").trim()).filter(Boolean),
  );

  if (!infoSet.has(normalizedSource) || !infoSet.has(normalizedTarget)) {
    return [...fieldOrder];
  }

  const infoSequence = fieldOrder.filter((key) => infoSet.has(key));
  const fromIndex = infoSequence.indexOf(normalizedSource);
  const targetIndex = infoSequence.indexOf(normalizedTarget);

  if (fromIndex < 0 || targetIndex < 0) {
    return [...fieldOrder];
  }

  const nextInfoSequence = [...infoSequence];
  nextInfoSequence.splice(fromIndex, 1);

  let insertIndex = nextInfoSequence.indexOf(normalizedTarget);

  if (insertIndex < 0) {
    return [...fieldOrder];
  }

  if (position === "after") {
    insertIndex += 1;
  }

  nextInfoSequence.splice(insertIndex, 0, normalizedSource);

  const infoIterator = nextInfoSequence[Symbol.iterator]();

  return fieldOrder.map((key) => (infoSet.has(key) ? infoIterator.next().value : key));
}

/**
 * @param {{
 *   fieldKey: string,
 *   fieldLabel?: string,
 *   isInfoField?: boolean,
 * }} params
 */
export function buildPlanInfoFieldContextMenuActions({
  fieldKey,
  fieldLabel = "",
  isInfoField = false,
}) {
  const label = String(fieldLabel || fieldKey).trim() || fieldKey;

  return [
    {
      id: "rename-field",
      label: "Переименовать поле",
    },
    {
      id: "hide-field",
      label: "Скрыть поле",
    },
    {
      id: "toggle-info-field",
      label: isInfoField ? "Скрыть из вкладки Инфо" : "Показать во вкладке Инфо",
    },
  ].filter((action) => {
    if (action.id === "toggle-info-field") {
      return Boolean(fieldKey);
    }

    return true;
  });
}

/**
 * @param {{
 *   tabKey: string,
 *   tabLabel?: string,
 *   showInInfo?: boolean,
 *   canHide?: boolean,
 * }} params
 */
export function buildPlanTabContextMenuActions({
  tabKey,
  tabLabel = "",
  showInInfo = false,
  canHide = true,
}) {
  const label = String(tabLabel || tabKey).trim() || tabKey;

  return [
    {
      id: "rename-tab",
      label: "Переименовать вкладку",
    },
    {
      id: "hide-tab",
      label: "Скрыть вкладку",
      disabled: !canHide,
    },
    tabKey !== "info"
      ? {
          id: "toggle-show-in-info",
          label: showInInfo ? "Не показывать внутри Инфо" : "Показывать внутри Инфо",
        }
      : null,
  ].filter(Boolean);
}
