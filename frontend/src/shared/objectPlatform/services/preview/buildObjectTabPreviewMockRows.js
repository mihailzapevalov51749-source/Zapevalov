import { buildObjectPreviewMockValue } from "./buildObjectPreviewMockValue.js";

export const OBJECT_TAB_PREVIEW_DEFAULT_ROW_COUNT = 7;

const PREVIEW_ROW_SPECS = [
  { id: "preview-mock-1", titleSuffix: "1" },
  { id: "preview-mock-2", titleSuffix: "2" },
  { id: "preview-mock-3", parentId: "preview-mock-2", titleSuffix: "2.1", hierarchyChild: true },
  { id: "preview-mock-4", parentId: "preview-mock-2", titleSuffix: "2.2", hierarchyChild: true },
  { id: "preview-mock-5", titleSuffix: "3" },
  { id: "preview-mock-6", titleSuffix: "4" },
  { id: "preview-mock-7", titleSuffix: "5", forceEmpty: true },
];

function padRecordNumber(index) {
  return index + 1;
}

function resolveRecordLabelPrefix(objectTypeName) {
  const name = String(objectTypeName || "").trim();
  return name ? `Пример ${name}` : "Пример записи";
}

function buildHierarchyInstances() {
  const instances = [];

  for (const spec of PREVIEW_ROW_SPECS) {
    if (!spec.parentId) {
      continue;
    }

    instances.push({
      id: `preview-hierarchy-${spec.parentId}-${spec.id}`,
      source_entity_id: spec.parentId,
      target_entity_id: spec.id,
    });
  }

  return instances;
}

/**
 * @param {{
 *   fields?: Array<Record<string, unknown>>,
 *   visibleFieldKeys?: string[],
 *   titleFieldKey?: string | null,
 *   objectTypeName?: string,
 *   rowCount?: number,
 *   hierarchyEnabled?: boolean,
 * }} params
 */
export function buildObjectTabPreviewMockRows({
  fields = [],
  visibleFieldKeys = [],
  titleFieldKey = null,
  objectTypeName = "",
  rowCount = OBJECT_TAB_PREVIEW_DEFAULT_ROW_COUNT,
  hierarchyEnabled = false,
} = {}) {
  const fieldList = Array.isArray(fields) ? fields : [];
  const fieldByKey = new Map(
    fieldList
      .map((field) => [String(field?.key || "").trim(), field])
      .filter(([key]) => Boolean(key)),
  );

  const keys =
    Array.isArray(visibleFieldKeys) && visibleFieldKeys.length
      ? visibleFieldKeys
      : fieldList
          .map((field) => String(field?.key || "").trim())
          .filter(Boolean);

  const recordLabelPrefix = resolveRecordLabelPrefix(objectTypeName);
  const specs = PREVIEW_ROW_SPECS.slice(
    0,
    Math.max(1, Math.min(Number(rowCount) || OBJECT_TAB_PREVIEW_DEFAULT_ROW_COUNT, PREVIEW_ROW_SPECS.length)),
  );

  const items = specs.map((spec, rowIndex) => {
    const values = {};
    const titleLabel = spec.hierarchyChild
      ? `Пример подзаписи ${spec.titleSuffix}`
      : `${recordLabelPrefix} ${spec.titleSuffix}`;

    for (const fieldKey of keys) {
      const field = fieldByKey.get(fieldKey);
      if (!field) {
        continue;
      }

      if (fieldKey === String(titleFieldKey || "").trim()) {
        values[fieldKey] = spec.forceEmpty ? null : titleLabel;
        continue;
      }

      values[fieldKey] = buildObjectPreviewMockValue({
        field,
        rowIndex,
        titleFieldKey,
        recordLabelPrefix,
        forceEmpty: Boolean(spec.forceEmpty),
      });
    }

    return {
      id: spec.id,
      entity_id: spec.id,
      record_number: padRecordNumber(rowIndex),
      recordNumber: padRecordNumber(rowIndex),
      values,
      status: "active",
      created_at: "2026-06-10T08:00:00.000Z",
      updated_at: "2026-06-10T08:00:00.000Z",
      __previewMock: true,
    };
  });

  return {
    items,
    hierarchyInstances: hierarchyEnabled ? buildHierarchyInstances() : [],
    pagination: {
      limit: items.length,
      offset: 0,
      total: items.length,
      has_more: false,
      hasMore: false,
    },
  };
}
