import { createRelationTableValue } from "./relationTableValue";

function buildStateKey(entityId, fieldKey) {
  return `${String(entityId).trim()}:${String(fieldKey).trim()}`;
}

/**
 * @param {import("../../../shared/viewEngine/contracts").ViewEngineRow[]} rows
 * @param {import("../../../shared/viewEngine/contracts").ViewEngineColumn[]} columns
 * @param {Map<string, ReturnType<typeof createRelationTableValue>>} relationStateByKey
 * @param {Set<string>} [relationFieldKeys]
 */
export function enrichTableRowsWithRelationFields(
  rows = [],
  columns = [],
  relationStateByKey = new Map(),
  relationFieldKeys = null,
) {
  const relationKeys =
    relationFieldKeys ||
    new Set(
      columns
        .filter((column) => String(column?.type || "").toLowerCase() === "relation")
        .map((column) => String(column.key || "").trim())
        .filter(Boolean),
    );

  if (!relationKeys.size) {
    return rows;
  }

  return rows.map((row) => {
    const entityId = String(row?.id ?? "").trim();

    if (!entityId) {
      return row;
    }

    const cells = (row.cells || []).map((cell) => {
      const fieldKey = String(cell?.fieldKey ?? "").trim();

      if (!relationKeys.has(fieldKey)) {
        return cell;
      }

      const cached = relationStateByKey.get(buildStateKey(entityId, fieldKey));

      return {
        ...cell,
        value:
          cached ||
          createRelationTableValue({
            items: [],
            cardinality: "one",
          }),
      };
    });

    return {
      ...row,
      cells,
    };
  });
}
